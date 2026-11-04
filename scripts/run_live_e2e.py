#!/usr/bin/env python3
"""Real localhost end-to-end test. Requires explicit paid-run opt-in and a cumulative USD cap.

Provider keys stay in the existing server. This runner reads only local app-access provisioning.
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import time
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

import httpx

ROOT = Path(__file__).resolve().parents[1]
ACTIVE = {"queued", "preparing_audio", "transcribing", "analysing", "generating", "validating"}


def stamp():
    return datetime.now(UTC).isoformat()


def save(path, value):
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")
    temporary.replace(path)


class BudgetGuard:
    """Temporarily cap new reservations without clearing charges or the USD20 allowance."""
    def __init__(self, database: Path, state: dict, cap_micro: int):
        if cap_micro <= 0 or cap_micro > 2_000_000:
            raise ValueError("This test runner permits at most USD2.")
        self.database, self.state, self.cap_micro = database, state, cap_micro

    def connect(self):
        cx = sqlite3.connect(self.database, timeout=30, isolation_level=None)
        cx.execute("BEGIN IMMEDIATE")
        return cx

    def __enter__(self):
        cx = self.connect()
        try:
            marker = cx.execute("SELECT value FROM kv WHERE name='live_e2e_guard'").fetchone()
            if marker:
                prior = json.loads(marker[0])
                if prior['run_id'] != self.state['run_id']:
                    raise RuntimeError("Another test guard is active; do not override it.")
                self.state.update(prior)
            if 'original_ceiling_micro' not in self.state:
                self.state['original_ceiling_micro'] = int(cx.execute("SELECT value FROM kv WHERE name='budget_ceiling_micro'").fetchone()[0])
                self.state['baseline_reservation_ids'] = [r[0] for r in cx.execute('SELECT id FROM reservations')]
            baseline = set(self.state['baseline_reservation_ids'])
            rows = cx.execute('SELECT id,amount,status FROM reservations').fetchall()
            cumulative = sum(amount for key,amount,status in rows if key not in baseline)
            current = sum(amount for key,amount,status in rows if status in {'settled','reserved','uncertain'})
            remaining = max(0, self.cap_micro - cumulative)
            contingency = int(cx.execute("SELECT value FROM kv WHERE name='budget_contingency_micro'").fetchone()[0])
            self.temporary = min(self.state['original_ceiling_micro'], current + remaining + contingency)
            self.state['cap_micro'] = self.cap_micro
            cx.execute("UPDATE kv SET value=? WHERE name='budget_ceiling_micro'", (str(self.temporary),))
            cx.execute("INSERT INTO kv VALUES('live_e2e_guard',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value",
                       (json.dumps(self.state),))
            cx.commit()
            return self
        except BaseException:
            cx.rollback()
            raise
        finally:
            cx.close()

    def __exit__(self, *args):
        cx = self.connect()
        try:
            job_id = self.state.get('job_id')
            live_job = cx.execute("SELECT body FROM objects WHERE id=? AND kind='job'", (job_id,)).fetchone() if job_id else None
            if live_job and json.loads(live_job[0])['status'] in ACTIVE:
                self.state['normal_ceiling_restored'] = False
                self.state['guard_kept_for_active_job'] = True
                cx.commit()
                return
            current = int(cx.execute("SELECT value FROM kv WHERE name='budget_ceiling_micro'").fetchone()[0])
            if current == self.temporary:
                cx.execute("UPDATE kv SET value=? WHERE name='budget_ceiling_micro'", (str(self.state['original_ceiling_micro']),))
                self.state['normal_ceiling_restored'] = True
            else:
                self.state['normal_ceiling_restored'] = False
            marker = cx.execute("SELECT value FROM kv WHERE name='live_e2e_guard'").fetchone()
            if marker and json.loads(marker[0])['run_id'] == self.state['run_id']:
                cx.execute("DELETE FROM kv WHERE name='live_e2e_guard'")
            cx.commit()
        except BaseException:
            cx.rollback()
            raise
        finally:
            cx.close()

    def charges(self):
        baseline = set(self.state['baseline_reservation_ids'])
        with sqlite3.connect(self.database) as cx:
            rows = cx.execute('SELECT id,provider,amount,status,detail FROM reservations').fetchall()
        return [{'id': key, 'provider': provider, 'reserved_bound_usd': str(Decimal(amount)/1_000_000),
                 'status': status, 'detail': json.loads(detail)}
                for key,provider,amount,status,detail in rows if key not in baseline]


def word_error_rate(expected, actual):
    import re
    ref = re.findall(r"[a-z]+(?:'[a-z]+)?", expected.lower())
    hyp = re.findall(r"[a-z]+(?:'[a-z]+)?", actual.lower())
    row = list(range(len(hyp) + 1))
    for i, word in enumerate(ref, 1):
        next_row = [i]
        for j, other in enumerate(hyp, 1):
            next_row.append(min(next_row[-1] + 1, row[j] + 1, row[j-1] + (word != other)))
        row = next_row
    return row[-1] / max(1, len(ref))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--allow-paid', action='store_true')
    parser.add_argument('--max-usd', default='2.00')
    parser.add_argument('--retry', action='store_true')
    parser.add_argument('--directory', type=Path, default=ROOT/'var/e2e/live-short-sample')
    args = parser.parse_args()
    if not args.allow_paid:
        parser.error('A real provider run needs explicit --allow-paid.')
    cap = Decimal(args.max_usd)
    if not cap.is_finite() or cap <= 0 or cap > 2:
        parser.error('The test cap must be positive and no more than USD2.')
    directory = args.directory.resolve()
    audio, reference = directory/'lecture.wav', directory/'reference.txt'
    if not audio.exists() or not reference.exists():
        parser.error('Provide lecture.wav and its known reference.txt in the report directory.')
    state_path = directory/'run.json'
    state = json.loads(state_path.read_text()) if state_path.exists() else {'run_id':str(uuid4()), 'started_at':stamp()}
    if state.get('status') == 'passed' and not args.retry:
        parser.error('This sample already passed; no repeat paid call was made.')
    if state.get('job_id') and not args.retry:
        parser.error('A previous attempt exists; inspect it and explicitly use --retry if appropriate.')
    save(state_path, state)
    token = (ROOT/'var/demo/operator-access').read_text().strip()
    headers = {'Authorization':'Bearer '+token}
    guard = BudgetGuard(ROOT/'var/demo/demo.sqlite3',state,int(cap*1_000_000))
    failure = None
    job_id = None
    with httpx.Client(base_url='http://127.0.0.1:8000',headers=headers,timeout=30) as client:
        def checked(response):
            if response.is_error:
                payload = response.json()
                raise RuntimeError(f"Local API {response.status_code}: {payload.get('error',{}).get('code','request_failed')}")
            return response.json()
        configured = checked(client.get('/api/v1/config'))['provider_configured']
        if not configured['elevenlabs'] or not configured['openai']:
            raise SystemExit('Both provider keys must already be configured in the existing server.')
        with sqlite3.connect(ROOT/'var/demo/demo.sqlite3') as cx:
            jobs = [json.loads(r[0]) for r in cx.execute("SELECT body FROM objects WHERE kind='job'")]
            if any(j['status'] in ACTIVE for j in jobs):
                raise SystemExit('Another job is active; wait rather than change its shared spending envelope.')
        with guard:
            save(state_path,state)
            print('US$2 cumulative test guard active; original spending records preserved.',flush=True)
            try:
                if not state.get('recording_id'):
                    with audio.open('rb') as stream:
                        body = checked(client.post('/api/v1/recordings',headers={'Idempotency-Key':state['run_id']+'-upload'},
                                                   data={'source':'web','title':'Live E2E — synthetic photosynthesis narration'},
                                                   files={'file':('lecture.wav',stream,'audio/wav')}))
                    state.update(recording_id=body['id'],duration_seconds=body['duration_seconds'])
                    save(state_path,state)
                request = {'retry_of_job_id':state['job_id']} if args.retry and state.get('job_id') else {}
                state['attempt_number'] = state.get('attempt_number',0)+1
                body = checked(client.post(f"/api/v1/recordings/{state['recording_id']}/jobs",json=request,
                                           headers={'Idempotency-Key':state['run_id']+'-job-'+str(state['attempt_number'])}))
                job_id = body['id']
                state['job_id']=job_id
                save(state_path,state)
                previous = None
                for _ in range(240):
                    job = checked(client.get('/api/v1/jobs/'+job_id))
                    if (job['status'],job['stage']) != previous:
                        print('Job:',job['status'],job['stage'],flush=True)
                        previous=(job['status'],job['stage'])
                    if job['status'] not in ACTIVE:
                        break
                    time.sleep(1.5)
                else:
                    raise RuntimeError('Test processing timed out; stop future stages before restoring the usual ceiling.')
                save(directory/'job.json',job)
                if job['status'] != 'ready':
                    raise RuntimeError('Job did not complete: '+json.dumps(job.get('error'),ensure_ascii=False))
                pack = checked(client.get('/api/v1/study-packs/'+job['study_pack_id']))
                save(directory/'study-pack-public.json',pack)
                assert pack['notes'] and pack['metadata']['description'] and pack['quiz_status']=='available'
                assert 1 <= len(pack['questions']) <= 5
                assert all('correct_option_id' not in q and 'explanation' not in q for q in pack['questions'])
                transcript = checked(client.get(f"/api/v1/recordings/{state['recording_id']}/transcripts/{pack['transcript_revision_id']}",params={'limit':500}))
                assert transcript['next_cursor'] is None,'Short sample unexpectedly needs more transcript pages.'
                save(directory/'transcript.json',transcript)
                text=' '.join(s['text'] for s in transcript['segments'])
                (directory/'transcript.txt').write_text(text+'\n')
                ids={s['id'] for s in transcript['segments']}
                refs=[pack['metadata']['evidence_segment_ids']]
                refs += [t['evidence_segment_ids'] for t in pack['metadata']['topics']]
                refs += [p['evidence_segment_ids'] for section in pack['notes'] for p in section['points']]
                refs += [q['evidence_segment_ids'] for q in pack['questions']]
                assert all(r and set(r)<=ids for r in refs),'Generated evidence references are invalid.'
                wer=word_error_rate(reference.read_text(),text)
                state['word_error_rate']=wer
                assert wer <= .15,f'Transcription WER too high for this clear sample: {wer:.3f}'
                solutions=checked(client.post('/api/v1/study-packs/'+pack['id']+'/quiz-solutions',headers={'Idempotency-Key':state['run_id']+'-reveal'}))['solutions']
                save(directory/'quiz-solutions.json',solutions)
                good=[{'question_id':q['id'],'option_id':solutions[q['id']]['correct_option_id']} for q in pack['questions']]
                url=f"/api/v1/recordings/{state['recording_id']}/quiz-attempts"
                perfect=checked(client.post(url,json={'study_pack_id':pack['id'],'answers':good},headers={'Idempotency-Key':state['run_id']+'-perfect'}))
                assert perfect['percentage']==100 and perfect['correct_count']==len(good)
                mixed=[dict(a) for a in good]
                mixed[0]['option_id']=next(o['id'] for o in pack['questions'][0]['options'] if o['id']!=good[0]['option_id'])
                if len(mixed)>1:
                    mixed[1]['option_id']=None
                mixed_key={'Idempotency-Key':state['run_id']+'-mixed'}
                mixed_body={'study_pack_id':pack['id'],'answers':mixed}
                result=checked(client.post(url,json=mixed_body,headers=mixed_key))
                expected=max(0,len(good)-2) if len(good)>1 else 0
                assert result['correct_count']==expected and result['unanswered_count']==(1 if len(good)>1 else 0)
                assert checked(client.post(url,json=mixed_body,headers=mixed_key))==result
                assert perfect['practice_revealed'] and result['practice_revealed']
                save(directory/'scoring-perfect.json',perfect)
                save(directory/'scoring-mixed.json',result)
                state.update(status='passed',study_pack_id=pack['id'],question_count=len(good),
                             perfect_percentage=perfect['percentage'],mixed_percentage=result['percentage'],
                             classification_source=pack['classification']['source'],subject=pack['classification']['label'])
                print('Transcription, evidence-linked notes, quiz, perfect/mixed scoring and repeat-submit idempotency passed.',flush=True)
            except BaseException as error:
                state.update(status='failed',error=f'{type(error).__name__}: {error}')
                failure=error
            finally:
                if job_id:
                    current=checked(client.get('/api/v1/jobs/'+job_id))
                    if current['status'] in ACTIVE:
                        checked(client.post('/api/v1/jobs/'+job_id+'/cancel'))
                        state['canceled_before_guard_restore']=True
                state['finished_at']=stamp()
        state['charges']=guard.charges()
        state['conservative_accounted_usd']=str(sum(Decimal(c['reserved_bound_usd']) for c in state['charges']))
        assert Decimal(state['conservative_accounted_usd'])<=cap,'Cumulative request bounds exceeded test allowance.'
        state['budget_after']=checked(client.get('/api/v1/budget'))
        save(state_path,state)
        print(json.dumps({k:state.get(k) for k in ['status','recording_id','study_pack_id','question_count','word_error_rate','perfect_percentage','mixed_percentage','conservative_accounted_usd','normal_ceiling_restored','error']},indent=2),flush=True)
    if failure:
        return 1
    return 0


if __name__=='__main__':
    raise SystemExit(main())
