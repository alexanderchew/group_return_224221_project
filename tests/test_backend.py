import hashlib
import json
import wave
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from decimal import Decimal
from time import monotonic, sleep

import pytest
from fastapi.testclient import TestClient

from conftest import operation_key, processed, upload, wav_bytes
from lecture_backend.app import create_app
from lecture_backend.core import Problem, Settings, Store
from lecture_backend.providers import Providers
from lecture_backend.worker import validate_generated


def test_auth_and_real_openapi(backend):
    client, app, _ = backend
    assert client.get('/health').json()['status'] == 'ok'
    assert client.get('/api/v1/config').json()['media_time_unit'] == 'seconds'
    schema = client.get('/openapi.json').json()
    assert sum(len(v) for k, v in schema['paths'].items() if k.startswith('/api/v1')) == 23
    assert schema['paths']['/api/v1/recordings']['post']['responses']['422']['content']['application/json']['schema']['$ref'].endswith('/ErrorEnvelope')
    assert 'audio/wav' in schema['paths']['/api/v1/recordings/{recording_id}/audio']['get']['responses']['206']['content']
    del client.headers['Authorization']
    assert client.get('/api/v1/recordings').status_code == 401
    client.headers['Authorization'] = 'Bearer wrong'
    assert client.get('/api/v1/budget').status_code == 401


def test_browser_cookie_csrf_and_shared_workspace(backend):
    client, app, _ = backend
    record = upload(client).json()
    del client.headers['Authorization']
    response = client.post('/operator/connect', data={'access_token': app.state.store.token()}, follow_redirects=False)
    assert response.status_code == 303
    assert 'HttpOnly' in response.headers.get_list('set-cookie')[0]
    assert client.get('/api/v1/recordings').json()['items'][0]['id'] == record['id']
    assert client.delete('/api/v1/recordings/' + record['id']).status_code == 403
    client.headers['X-CSRF-Token'] = client.cookies['lecture_csrf']
    assert client.delete('/api/v1/recordings/' + record['id']).status_code == 204


def test_upload_validation_idempotency_and_private_fields(backend):
    client, _, _ = backend
    key = operation_key()
    first = upload(client, key=key)
    assert first.status_code == 201
    assert upload(client, key=key).json() == first.json()
    assert upload(client, title='Different', key=key).status_code == 409
    assert len(client.get('/api/v1/recordings').json()['items']) == 1
    assert not any(k.startswith('_') for k in first.json())
    bad = client.post('/api/v1/recordings', data={'source': 'web'}, headers=operation_key(), files={'file': ('bad.wav', b'broken', 'audio/wav')})
    assert bad.status_code == 422 and bad.json()['error']['code'] == 'media_corrupt'
    assert client.post('/api/v1/recordings', data={'source': 'invalid'}, headers=operation_key(), files={'file': ('a.wav', wav_bytes())}).status_code == 422


def test_current_size_and_duration_limits(backend):
    client, app, _ = backend
    app.state.settings.max_duration_seconds = 0.1
    assert upload(client).json()['error']['code'] == 'duration_limit'
    app.state.settings.max_duration_seconds = 3600
    app.state.settings.max_audio_bytes = 100
    assert upload(client).status_code == 413


def test_source_range_requires_access(backend):
    client, _, _ = backend
    rec = upload(client).json()
    response = client.get(f"/api/v1/recordings/{rec['id']}/audio", headers={'Range': 'bytes=0-43'})
    assert response.status_code == 206
    assert len(response.content) == 44
    del client.headers['Authorization']
    assert client.get(f"/api/v1/recordings/{rec['id']}/audio").status_code == 401


def test_budget_reservation_race_and_restart(backend):
    _, app, _ = backend
    store = app.state.store
    def reserve(i):
        try:
            return store.reserve('test', str(i), 6_000_000, {'test': True})
        except Problem:
            return None
    with ThreadPoolExecutor(max_workers=8) as pool:
        reservations = [v for v in pool.map(reserve, range(8)) if v]
    assert len(reservations) == 3
    assert Decimal(store.budget()['available_usd']) == 0
    for value in reservations:
        store.settle(value)
    another = Store(app.state.settings)
    assert another.budget()['settled_usd'] == '18.000000'
    with pytest.raises(Problem):
        another.reserve('test', 'new', 1, {})


def test_missing_keys_blocks_without_spend(backend):
    client, app, _ = backend
    app.state.worker.providers = Providers(app.state.settings, app.state.store)
    rec = upload(client).json()
    job = client.post(f"/api/v1/recordings/{rec['id']}/jobs", json={}, headers=operation_key()).json()
    app.state.worker.run_once()
    state = client.get(f"/api/v1/jobs/{job['id']}").json()
    assert state['status'] == 'blocked'
    assert state['error']['code'] == 'provider_not_configured'
    assert app.state.store.budget()['settled_usd'] == '0.000000'
    assert app.state.store.budget()['reserved_usd'] == '0.000000'


def test_real_worker_with_labeled_test_providers_no_answer_leak(backend):
    client, _, providers = backend
    rec, job, pack = processed(backend)
    assert providers.transcriptions == 1 and providers.generations == 1
    assert pack['classification']['source'] == 'openai_baseline'
    assert pack['classification']['custom_status'] == 'unavailable'
    assert pack['classification']['score'] is None
    payload = json.dumps(pack)
    assert '_answer_key' not in payload and 'correct_option_id' not in payload and 'explanation' not in payload
    assert pack['freshness'] == 'current'
    assert client.post(f"/api/v1/recordings/{rec['id']}/jobs", json={}, headers=operation_key()).json()['id'] == job['id']


@pytest.mark.parametrize('answer_kind,correct,unanswered', [('correct', 1, 0), ('incorrect', 0, 0), ('unanswered', 0, 1)])
def test_scoring_idempotency_and_revealed_practice(backend, answer_kind, correct, unanswered):
    client, _, _ = backend
    rec, _, pack = processed(backend)
    # Resolve by answer content: publication deliberately randomizes/relabels IDs.
    options = pack['questions'][0]['options']
    option = None
    if answer_kind != 'unanswered':
        option = next(o['id'] for o in options if (o['text'] == 'Chlorophyll') == (answer_kind == 'correct'))
    body = {'study_pack_id': pack['id'], 'answers': [{'question_id': pack['questions'][0]['id'], 'option_id': option}]}
    key = operation_key()
    first = client.post(f"/api/v1/recordings/{rec['id']}/quiz-attempts", json=body, headers=key)
    assert first.status_code == 201, first.text
    assert first.json()['correct_count'] == correct
    assert first.json()['unanswered_count'] == unanswered
    assert first.json()['practice_revealed'] is False
    again = client.post(f"/api/v1/recordings/{rec['id']}/quiz-attempts", json=body, headers=key)
    assert again.json() == first.json()
    retake = client.post(f"/api/v1/recordings/{rec['id']}/quiz-attempts", json=body, headers=operation_key())
    assert retake.json()['practice_revealed'] is True


def test_invalid_answers_do_not_reveal_or_create_attempt(backend):
    client, _, _ = backend
    rec, _, pack = processed(backend)
    url = f"/api/v1/recordings/{rec['id']}/quiz-attempts"
    answer = {'question_id': pack['questions'][0]['id'], 'option_id': 'bad'}
    assert client.post(url, json={'study_pack_id': pack['id'], 'answers': [answer]}, headers=operation_key()).status_code == 422
    answer['option_id'] = 'a'
    assert client.post(url, json={'study_pack_id': pack['id'], 'answers': [answer, answer]}, headers=operation_key()).status_code == 422
    result = client.post(url, json={'study_pack_id': pack['id'], 'answers': [answer]}, headers=operation_key())
    assert result.json()['practice_revealed'] is False


def test_revision_stales_pack_and_keeps_previous_attempt(backend):
    client, app, providers = backend
    rec, _, pack = processed(backend)
    body = {'study_pack_id': pack['id'], 'answers': [{'question_id': pack['questions'][0]['id'], 'option_id': 'a'}]}
    attempt = client.post(f"/api/v1/recordings/{rec['id']}/quiz-attempts", json=body, headers=operation_key()).json()
    change = {'base_revision_id': pack['transcript_revision_id'], 'edits': [{'segment_id': pack['transcript_segments'][0]['id'], 'text': 'Corrected teaching text.'}]}
    revision = client.post(f"/api/v1/recordings/{rec['id']}/transcript-revisions", json=change, headers=operation_key())
    assert revision.status_code == 201, revision.text
    assert client.get('/api/v1/study-packs/' + pack['id']).json()['freshness'] == 'outdated'
    assert client.post(f"/api/v1/recordings/{rec['id']}/quiz-attempts", json=body, headers=operation_key()).status_code == 409
    assert client.get('/api/v1/quiz-attempts/' + attempt['id']).json() == attempt
    assert client.post(f"/api/v1/recordings/{rec['id']}/transcript-revisions", json=change, headers=operation_key()).status_code == 409
    job = client.post(f"/api/v1/recordings/{rec['id']}/jobs", json={'regenerate': True}, headers=operation_key())
    assert job.status_code == 202
    app.state.worker.run_once()
    assert client.get(f"/api/v1/recordings/{rec['id']}/study-pack").json()['id'] != pack['id']
    assert providers.transcriptions == 1


def test_retry_reuses_completed_transcription(backend):
    client, app, providers = backend
    providers.fail_generation = True
    rec = upload(client).json()
    job = client.post(f"/api/v1/recordings/{rec['id']}/jobs", json={}, headers=operation_key()).json()
    app.state.worker.run_once()
    assert client.get('/api/v1/jobs/' + job['id']).json()['status'] == 'failed'
    providers.fail_generation = False
    retry = client.post(f"/api/v1/recordings/{rec['id']}/jobs", json={'retry_of_job_id': job['id']}, headers=operation_key())
    app.state.worker.run_once()
    assert client.get('/api/v1/jobs/' + retry.json()['id']).json()['status'] == 'ready'
    assert providers.transcriptions == 1 and providers.generations == 2


def test_delete_during_provider_completion_cannot_resurrect(backend):
    client, app, providers = backend
    rec = upload(client).json()
    job = client.post(f"/api/v1/recordings/{rec['id']}/jobs", json={}, headers=operation_key()).json()
    providers.on_generate = lambda: client.delete('/api/v1/recordings/' + rec['id'])
    app.state.worker.run_once()
    assert client.get('/api/v1/recordings/' + rec['id']).status_code == 404
    assert client.get('/api/v1/jobs/' + job['id']).status_code == 404
    assert client.get('/api/v1/recordings').json()['items'] == []
    with app.state.store.tx() as cx:
        assert app.state.store.list(cx, 'pack') == []


def test_delete_preserves_budget_and_tombstones_idempotency(backend):
    client, app, _ = backend
    key = operation_key()
    rec = upload(client, key=key).json()
    cost = app.state.store.reserve('test', 'test', 100000, {})
    app.state.store.settle(cost)
    assert client.delete('/api/v1/recordings/' + rec['id']).status_code == 204
    assert client.delete('/api/v1/recordings/' + rec['id']).status_code == 204
    assert upload(client, key=key).status_code == 410
    assert app.state.store.budget()['settled_usd'] == '0.100000'
    assert not (app.state.settings.data_dir / 'audio' / rec['id']).exists()
    assert client.delete('/api/v1/recordings/%2e%2e').status_code in {204, 404}
    assert app.state.store.path.exists()


@pytest.mark.parametrize('charge_state', ['reserved', 'settled', 'legacy_settled'])
def test_restart_holds_job_when_paid_result_was_not_saved(backend, charge_state):
    client, app, providers = backend
    rec = upload(client).json()
    job = client.post(f"/api/v1/recordings/{rec['id']}/jobs", json={}, headers=operation_key()).json()
    store = app.state.store
    app.state.worker.update(job['id'], status='transcribing', stage='transcribe', _provider_result_pending=False)
    reservation = store.reserve('TEST_DOUBLE', job['id'], 1000, {})
    if charge_state != 'reserved':
        store.settle(reservation)
    if charge_state == 'legacy_settled':
        with store.tx() as cx:
            legacy_job = store.get(cx, job['id'], 'job')
            del legacy_job['_provider_result_pending']
            store.put(cx, 'job', legacy_job, rec['id'])
    app.state.worker.recover()
    result = client.get('/api/v1/jobs/' + job['id']).json()
    assert result['status'] == 'failed'
    assert result['error']['code'] == 'provider_submission_unknown'
    assert result['error']['retryable'] is False
    ledger_key = 'uncertain_usd' if charge_state == 'reserved' else 'settled_usd'
    assert store.budget()[ledger_key] == '0.001000'
    assert app.state.worker.run_once() is False
    assert providers.transcriptions == providers.generations == 0


@pytest.mark.parametrize('prefix', ['stt_', 'gen_'])
def test_backend_startup_resumes_same_job_after_saved_result(backend, monkeypatch, prefix):
    client, app, providers = backend
    settings, store, worker = app.state.settings, app.state.store, app.state.worker
    settings.chunk_seconds = 0.125
    settings.generation_chars = 50
    transcribe, generate = providers.transcribe, providers.generate

    def charged_transcription(path, duration, job_id):
        reservation = store.reserve('TEST_DOUBLE_STT', job_id, 1000, {})
        result = transcribe(path, duration, job_id)
        store.settle(reservation)
        return result

    def charged_generation(segments, subject, job_id):
        reservation = store.reserve('TEST_DOUBLE_LLM', job_id, 1000, {})
        result = generate(segments, subject, job_id)
        store.settle(reservation)
        return result

    save_checkpoint = worker.checkpoint

    def interrupt_after_checkpoint(job_id, cache_id, payload):
        save_checkpoint(job_id, cache_id, payload)
        if cache_id.startswith(prefix):
            raise SystemExit('Simulated shutdown after persisting the result')

    monkeypatch.setattr(providers, 'transcribe', charged_transcription)
    monkeypatch.setattr(providers, 'generate', charged_generation)
    monkeypatch.setattr(worker, 'checkpoint', interrupt_after_checkpoint)
    rec = upload(client).json()
    url = f"/api/v1/recordings/{rec['id']}"
    job = client.post(url + '/jobs', json={}, headers=operation_key()).json()
    with pytest.raises(SystemExit, match='after persisting'):
        worker.run_once()
    assert (providers.transcriptions, providers.generations) == ((1, 0) if prefix == 'stt_' else (2, 1))

    reopened = create_app(replace(settings, start_worker=True), providers)
    if prefix == 'gen_':
        def unexpected_classification(*args):
            raise AssertionError('Recovery should use the subject already saved for this job.')

        monkeypatch.setattr(reopened.state.worker.classifier, 'classify', unexpected_classification)
    with TestClient(reopened, headers=client.headers) as restarted:
        deadline = monotonic() + 5
        while True:
            result = restarted.get('/api/v1/jobs/' + job['id']).json()
            if result['status'] in {'ready', 'failed', 'blocked', 'partial'} or monotonic() >= deadline:
                break
            sleep(0.02)
        assert result['status'] == 'ready', result
        assert restarted.get(url).json()['latest_job_id'] == job['id']
        assert restarted.get(url + '/study-pack').json()['id'] == result['study_pack_id']
    assert providers.transcriptions == providers.generations == 2
    assert store.budget()['settled_usd'] == '0.004000'
    assert store.budget()['uncertain_usd'] == '0.000000'


def test_metadata_optimistic_concurrency(backend):
    client, _, _ = backend
    rec = upload(client).json()
    url = '/api/v1/recordings/' + rec['id']
    assert client.patch(url, json={'title': 'Changed'}).status_code == 409
    first = client.patch(url, json={'title': 'Changed'}, headers={'If-Match': str(rec['revision'])})
    assert first.status_code == 200
    assert client.patch(url, json={'title': 'Other'}, headers={'If-Match': str(rec['revision'])}).status_code == 409


def test_resumable_upload_checksum_replay_and_cleanup(backend):
    client, app, _ = backend
    raw = wav_bytes()
    sha = hashlib.sha256(raw).hexdigest()
    body = {'source': 'mobile', 'title': 'Resumable fixture', 'files': [{'id': 'clip1', 'sequence': 0, 'mime_type': 'audio/wav', 'byte_size': len(raw), 'sha256': sha}]}
    upload_key = operation_key()
    pending = client.post('/api/v1/uploads', json=body, headers=upload_key)
    assert pending.status_code == 201, pending.text
    upload_id = pending.json()['id']
    url = f'/api/v1/uploads/{upload_id}/files/clip1/parts/0'
    assert client.post(f'/api/v1/uploads/{upload_id}/complete', headers=operation_key()).status_code == 409
    assert client.put(url, content=raw, headers={'X-Part-SHA256': '0' * 64}).status_code == 422
    headers = {'X-Part-SHA256': sha, 'Content-Type': 'application/octet-stream'}
    assert client.put(url, content=raw, headers=headers).status_code == 200
    assert client.put(url, content=raw, headers=headers).status_code == 200
    completion_key = operation_key()
    completed = client.post(f'/api/v1/uploads/{upload_id}/complete', headers=completion_key)
    assert completed.status_code == 201, completed.text
    assert client.post(f'/api/v1/uploads/{upload_id}/complete', headers=completion_key).json() == completed.json()
    assert not (app.state.settings.data_dir / 'uploads' / upload_id).exists()
    client.delete('/api/v1/recordings/' + completed.json()['id'])
    assert client.get('/api/v1/uploads/' + upload_id).status_code == 404
    assert client.post('/api/v1/uploads', json=body, headers=upload_key).status_code == 410


def test_bad_generated_references_are_rejected(backend):
    _, _, providers = backend
    segments = [{'id': 'seg_test', 'text': 'Test'}]
    value, _ = providers.generate(segments, None, 'job_test')
    value.metadata.evidence_segment_ids = ['made_up']
    with pytest.raises(Problem, match='missing transcript'):
        validate_generated(value, segments)


def test_persistence_without_provider_credentials(backend):
    client, app, _ = backend
    rec = upload(client).json()
    another = create_app(Settings(data_dir=app.state.settings.data_dir, start_worker=False))
    with TestClient(another) as reopened:
        reopened.headers['Authorization'] = 'Bearer ' + another.state.store.token()
        assert reopened.get('/api/v1/recordings/' + rec['id']).json()['title'] == rec['title']


@pytest.mark.parametrize('duration', [1800, 3600])
def test_normal_lesson_duration_intake(backend, tmp_path, duration):
    client, _, _ = backend
    path = tmp_path / f'{duration}-second-intake-only.wav'
    with wave.open(str(path), 'wb') as stream:
        stream.setparams((1, 2, 16000, 0, 'NONE', 'not compressed'))
        for _ in range(duration):
            stream.writeframesraw(b'\0\0' * 16000)
    with path.open('rb') as stream:
        response = client.post('/api/v1/recordings', data={'source': 'web'}, headers=operation_key(), files={'file': ('normal.wav', stream, 'audio/wav')})
    assert response.status_code == 201, response.text
    assert response.json()['duration_seconds'] == duration
    client.delete('/api/v1/recordings/' + response.json()['id'])
    path.unlink()


def test_explicit_reveal_and_override_provenance(backend):
    client, app, _ = backend
    rec, _, pack = processed(backend)
    reveal = client.post(f"/api/v1/study-packs/{pack['id']}/quiz-solutions", headers=operation_key())
    assert reveal.status_code == 200
    assert reveal.json()['practice_revealed'] is True
    assert client.get('/api/v1/study-packs/' + pack['id']).json()['questions'][0].get('correct_option_id') is None
    override = client.post(f"/api/v1/recordings/{rec['id']}/subject-overrides", headers=operation_key(),
                           json={'transcript_revision_id': pack['transcript_revision_id'], 'subject': 'Biology', 'reason': 'Reviewed'})
    assert override.status_code == 201
    assert client.get('/api/v1/study-packs/' + pack['id']).json()['freshness'] == 'outdated'
    job = client.post(f"/api/v1/recordings/{rec['id']}/jobs", json={'regenerate': True}, headers=operation_key()).json()
    app.state.worker.run_once()
    current = client.get('/api/v1/study-packs/' + client.get('/api/v1/jobs/' + job['id']).json()['study_pack_id']).json()
    assert current['subject_override']['id'] == override.json()['id']
    assert current['classification']['source'] == 'openai_baseline'
    assert current['classification']['custom_status'] == 'unavailable'


def test_canceled_work_does_not_call_providers(backend):
    client, app, providers = backend
    rec = upload(client).json()
    job = client.post(f"/api/v1/recordings/{rec['id']}/jobs", json={}, headers=operation_key()).json()
    assert client.post('/api/v1/jobs/' + job['id'] + '/cancel').json()['status'] == 'canceled'
    assert app.state.worker.run_once() is False
    assert providers.transcriptions == providers.generations == 0


def test_partial_generation_preserves_valid_notes_and_retries(backend):
    client, app, providers = backend
    app.state.settings.generation_chars = 5
    original_transcribe = providers.transcribe
    def text_sections(path, duration, job_id):
        result = original_transcribe(path, duration, job_id)
        result['text'] = 'A' * 1001
        return result
    providers.transcribe = text_sections
    original_generate = providers.generate
    def fail_second(*args):
        if providers.generations == 1:
            raise Problem('budget_exceeded', 'Test budget block.', 409)
        return original_generate(*args)
    providers.generate = fail_second
    rec = upload(client).json()
    job = client.post(f"/api/v1/recordings/{rec['id']}/jobs", json={}, headers=operation_key()).json()
    app.state.worker.run_once()
    state = client.get('/api/v1/jobs/' + job['id']).json()
    assert state['status'] == 'partial'
    pack = client.get('/api/v1/study-packs/' + state['study_pack_id']).json()
    assert 'generation_incomplete' in pack['warnings']
    assert pack['notes'] and pack['coverage']['partial'] is True
    providers.generate = original_generate
    retry = client.post(f"/api/v1/recordings/{rec['id']}/jobs", json={'retry_of_job_id': job['id']}, headers=operation_key()).json()
    app.state.worker.run_once()
    assert client.get('/api/v1/jobs/' + retry['id']).json()['status'] == 'ready'
    assert providers.transcriptions == 1


def test_multifile_upload_preserves_original_sources(backend):
    client, app, _ = backend
    raw = wav_bytes()
    sha = hashlib.sha256(raw).hexdigest()
    files = [{'id': f'clip{i}', 'sequence': i, 'mime_type': 'audio/wav', 'byte_size': len(raw), 'sha256': sha} for i in range(2)]
    value = client.post('/api/v1/uploads', json={'source': 'mobile', 'files': files}, headers=operation_key()).json()
    for item in files:
        assert client.put(f"/api/v1/uploads/{value['id']}/files/{item['id']}/parts/0", content=raw, headers={'X-Part-SHA256': sha}).status_code == 200
    rec = client.post(f"/api/v1/uploads/{value['id']}/complete", headers=operation_key())
    assert rec.status_code == 201, rec.text
    assert rec.json()['duration_seconds'] == 0.5
    originals = app.state.settings.data_dir / 'audio' / rec.json()['id'] / 'source-files'
    assert len(list(originals.iterdir())) == 2
    assert all(p.read_bytes() == raw for p in originals.iterdir())


def test_transcription_network_failure_keeps_cost_uncertain(backend, monkeypatch, tmp_path):
    import httpx
    from lecture_backend.providers import Providers
    monkeypatch.setenv('ELEVENLABS_API_KEY', 'test-key-not-a-real-credential')
    def fail(*args, **kwargs):
        raise httpx.ReadTimeout('deliberate test timeout')
    monkeypatch.setattr(httpx.Client, 'post', fail)
    client, app, _ = backend
    path = tmp_path / 'source.wav'
    path.write_bytes(wav_bytes())
    with pytest.raises(Problem) as error:
        Providers(app.state.settings, app.state.store).transcribe(path, 60, 'job_test')
    assert error.value.code == 'provider_submission_unknown'
    assert Decimal(app.state.store.budget()['uncertain_usd']) > 0
    assert 'test-key' not in json.dumps(app.state.store.budget())


def test_generation_sdk_contract_is_bounded_and_has_no_implicit_retries(backend, monkeypatch):
    from types import SimpleNamespace
    import lecture_backend.providers as module
    client, app, fake = backend
    monkeypatch.setenv('OPENAI_API_KEY', 'test-key-not-a-real-credential')
    calls = {}
    class FakeOpenAI:
        def __init__(self, **kwargs):
            calls['init'] = kwargs
            self.responses = self
        def __enter__(self):
            return self
        def __exit__(self, *args):
            return None
        def parse(self, **kwargs):
            calls['request'] = kwargs
            value, _ = fake.generate([{'id': 'seg_test', 'text': 'Teaching text.'}], None, 'job_test')
            return SimpleNamespace(status='completed', output_parsed=value, usage=None, model='gpt-6-luna')
    monkeypatch.setattr(module, 'OpenAI', FakeOpenAI)
    provider = module.Providers(app.state.settings, app.state.store)
    value, provenance = provider.generate([{'id': 'seg_test', 'text': 'Teaching text.'}], None, 'job_test')
    assert value.subject == 'Biology'
    assert calls['init']['max_retries'] == 0
    assert calls['request']['store'] is False
    assert calls['request']['service_tier'] == 'default'
    assert calls['request']['max_output_tokens'] == 8192
    assert provenance['prompt_version'] == module.PROMPT_VERSION == 'lecture-evidence-v2'
    assert 'ONLY in its structured evidence_segment_ids field' in calls['request']['instructions']
    assert 'Option order is randomized by the server' in calls['request']['instructions']
    assert Decimal(app.state.store.budget()['settled_usd']) > 0
    assert 'test-key' not in calls['request']['input']


@pytest.mark.parametrize('extension,codec,mime', [('mp3', 'libmp3lame', 'audio/mpeg'), ('m4a', 'aac', 'audio/mp4'), ('webm', 'libopus', 'audio/webm')])
def test_advertised_formats_decode_and_prepare(backend, tmp_path, extension, codec, mime):
    import subprocess
    from lecture_backend.media import audio_chunk
    client, app, _ = backend
    source = tmp_path / 'input.wav'
    source.write_bytes(wav_bytes())
    encoded = tmp_path / ('input.' + extension)
    subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-i', str(source), '-c:a', codec, '-y', str(encoded)], check=True)
    with encoded.open('rb') as stream:
        response = client.post('/api/v1/recordings', data={'source': 'web'}, headers=operation_key(), files={'file': (encoded.name, stream, mime)})
    assert response.status_code == 201, response.text
    assert response.json()['mime_type'] == mime
    with app.state.store.tx() as cx:
        recording = app.state.store.recording(cx, response.json()['id'])
    output = tmp_path / 'prepared.wav'
    from pathlib import Path
    audio_chunk(Path(recording['_audio_path']), output, 0, recording['duration_seconds'])
    assert output.stat().st_size > 44


def test_chunked_body_limit_cannot_bypass_content_length(backend):
    client, app, _ = backend
    app.state.settings.max_audio_bytes = 10
    boundary = 'testboundary'
    prefix = f'--{boundary}\r\nContent-Disposition: form-data; name="source"\r\n\r\nweb\r\n--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="big.wav"\r\nContent-Type: audio/wav\r\n\r\n'.encode()
    body = prefix + b'x' * (1024 * 1024 + 100) + f'\r\n--{boundary}--\r\n'.encode()
    response = client.post('/api/v1/recordings', content=iter([body]), headers={**operation_key(), 'Content-Type': 'multipart/form-data; boundary=' + boundary})
    assert response.status_code == 413, response.text
    assert response.json()['error']['code'] == 'size_limit'


def test_expired_upload_rejects_completion_and_parts(backend):
    client, app, _ = backend
    raw = wav_bytes()
    sha = hashlib.sha256(raw).hexdigest()
    value = client.post('/api/v1/uploads', json={'source': 'web', 'files': [{'id': 'part', 'sequence': 0, 'mime_type': 'audio/wav', 'byte_size': len(raw), 'sha256': sha}]}, headers=operation_key()).json()
    with app.state.store.tx() as cx:
        stored = app.state.store.get(cx, value['id'], 'upload')
        stored['expires_at'] = '2000-01-01T00:00:00+00:00'
        app.state.store.put(cx, 'upload', stored)
    assert client.get('/api/v1/uploads/' + value['id']).status_code == 410
    assert client.post('/api/v1/uploads/' + value['id'] + '/complete', headers=operation_key()).status_code == 410
    assert client.put(f"/api/v1/uploads/{value['id']}/files/part/parts/0", content=raw, headers={'X-Part-SHA256': sha}).status_code == 410


@pytest.mark.parametrize('limit,expected_status', [(3600, 201), (0.1, 422)])
def test_browser_webm_without_duration_metadata(backend, tmp_path, limit, expected_status):
    import subprocess
    client, app, providers = backend
    source, webm = tmp_path / 'source.wav', tmp_path / 'browser.webm'
    source.write_bytes(wav_bytes(0.5))
    subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-i', str(source), '-c:a', 'libopus',
                    '-f', 'webm', '-live', '1', '-y', str(webm)], check=True)
    info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_format', '-of', 'json', str(webm)]))
    assert 'duration' not in info['format']  # Like actual Chrome MediaRecorder output.
    app.state.settings.max_duration_seconds = limit
    data = webm.read_bytes()
    response = client.post('/api/v1/recordings', data={'source': 'web'}, headers=operation_key(),
                           files={'file': ('browser.webm', data, 'audio/webm;codecs=opus')})
    assert response.status_code == expected_status, response.text
    if expected_status == 201:
        assert response.json()['mime_type'] == 'audio/webm'
        assert response.json()['duration_seconds'] == pytest.approx(0.5, abs=0.03)
        assert client.get('/api/v1/recordings/' + response.json()['id'] + '/audio').content == data
    else:
        assert response.json()['error']['code'] == 'duration_limit'
    assert providers.transcriptions == providers.generations == 0
