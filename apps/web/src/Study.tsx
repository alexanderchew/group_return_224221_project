import { useEffect, useRef, useState } from 'react';
import { Api, ApiError, attemptSchema, duration, message, transcriptSchema } from './api';
import type { Attempt, QuizSubmission, Segment, StudyPack } from './api';
import { operation, read, remove, scopeKey, write } from './storage';

type Tab = 'Notes' | 'Overview' | 'Transcript' | 'Quiz';
export function Study({ api, pack }: { api: Api; pack: StudyPack }) {
  const [tab, setTab] = useState<Tab>('Notes');
  const [segments, setSegments] = useState(pack.transcript_segments);
  const [cursor, setCursor] = useState(pack.transcript_next_cursor);
  const [source, setSource] = useState<Segment[]>([]);
  const [sourceError, setSourceError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const sourcePanel = useRef<HTMLElement>(null);
  const sourceRequest = useRef(0);
  const revisionPath = `/recordings/${encodeURIComponent(pack.recording_id)}/transcripts/${encodeURIComponent(pack.transcript_revision_id)}`;
  async function evidence(ids: string[]) {
    const request = ++sourceRequest.current;
    setSource([]); setSourceError('Loading the supporting transcript…');
    requestAnimationFrame(() => sourcePanel.current?.focus());
    try {
      // Always resolve against the frozen pack revision, including non-embedded pages.
      const page = await api.request(`${revisionPath}?segment_ids=${encodeURIComponent(ids.join(','))}`, transcriptSchema);
      if (request !== sourceRequest.current) return;
      if (page.id !== pack.transcript_revision_id || ids.some(id => !page.segments.some(s => s.id === id))) throw new Error('Supporting text could not be resolved for this version.');
      setSource(page.segments); setSourceError('');
    } catch (e) { if (request === sourceRequest.current) setSourceError(message(e)); }
  }
  function refs(ids: string[]) { return ids.length ? <button className="reference" onClick={() => void evidence(ids)}>View lecture source <span aria-hidden="true">↗</span></button> : <span className="caption">No source reference supplied</span>; }
  async function more() {
    if (!cursor || loading) return;
    setLoading(true); setSourceError('');
    try {
      const page = await api.request(`${revisionPath}?cursor=${encodeURIComponent(cursor)}`, transcriptSchema);
      if (page.id !== pack.transcript_revision_id) throw new Error('Transcript version did not match this study material.');
      setSegments(old => [...old, ...page.segments.filter(s => !old.some(x => x.id === s.id))]); setCursor(page.next_cursor);
    } catch (e) { setSourceError(message(e)); } finally { setLoading(false); }
  }
  const classification = pack.classification;
  const provenance = { custom_model: 'Student model', openai_baseline: 'AI baseline', unknown: 'Unclassified' }[classification.source];
  return <div className="study">
    <div className="section-heading"><h3>Your study workspace</h3><span className="badge">{pack.output_language}</span></div>
    {pack.provenance.some(p => /REPLAY|TEST_DOUBLE|SAVED_OUTPUT/.test(p.provider)) && <p className="notice warning">Previously generated example / offline test output · This is not a fresh provider run.</p>}
    <p className="muted">{classification.label ?? 'Subject unavailable'} · {provenance}{classification.source === 'custom_model' && classification.score !== null ? ` · Model score ${classification.score.toFixed(2)}` : ''}</p>
    {classification.custom_status !== 'accepted' && <p className="caption">Student model: {classification.custom_status.replaceAll('_', ' ')}. {classification.fallback_reason?.replaceAll('_', ' ')}</p>}
    {pack.subject_override && <p className="notice">Manually selected subject: {pack.subject_override.subject}</p>}
    <p className="caption">AI-generated review material · Check lecture references</p>
    {pack.freshness === 'outdated' && <div className="notice warning">Generated from an earlier transcript. You can read these materials; new quiz submissions require current material.</div>}
    {Object.entries(pack.artifact_statuses).filter(([, status]) => status !== 'ready').map(([name, status]) => <p key={name} className="notice warning">{name.replaceAll('_', ' ')}: {status.replaceAll('_', ' ')}. Other available material remains readable.</p>)}
    {pack.warnings.map((warning, i) => <p key={i} className="notice warning">{warning}</p>)}
    <nav className="study-nav" aria-label="Study sections">{(['Notes', 'Overview', 'Transcript', 'Quiz'] as Tab[]).map(t => <button key={t} aria-current={tab === t ? 'page' : undefined} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}</nav>
    <section className="study-content" aria-label={tab}>
      {tab === 'Notes' && <>{pack.notes.length === 0 && <p>No notes are available yet.</p>}{pack.notes.map((section, i) => <section key={i}><h3>{section.heading}</h3><ul className="notes">{section.points.map((point, j) => <li key={j}><p>{point.text}</p>{refs(point.evidence_segment_ids)}</li>)}</ul></section>)}</>}
      {tab === 'Overview' && <><h3>{pack.metadata.title}</h3><p>{pack.metadata.description}</p>{refs(pack.metadata.evidence_segment_ids)}<h4>Topics from this lesson</h4><ul className="notes">{pack.metadata.topics.map((topic, i) => <li key={i}><p>{topic.text}</p>{refs(topic.evidence_segment_ids)}</li>)}</ul></>}
      {tab === 'Transcript' && <><label htmlFor="transcript-search">Search loaded transcript pages</label><input id="transcript-search" type="search" value={search} onChange={e => setSearch(e.target.value)} /><p className="caption">Source transcript · timestamps refer to original audio. Search covers loaded pages only.</p><div className="transcript">{segments.filter(s => s.text.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(s => <article key={s.id}><span className="time">{s.start_seconds === null ? 'Time unavailable' : duration(s.start_seconds)}</span><p>{s.text}</p></article>)}</div>{cursor && <button className="secondary" disabled={loading} onClick={() => void more()}>{loading ? 'Loading…' : 'Load more transcript'}</button>}</>}
      {tab === 'Quiz' && <Quiz api={api} pack={pack} refs={refs} />}
    </section>
    {(source.length > 0 || sourceError) && <aside className="source-panel" ref={sourcePanel} tabIndex={-1} aria-label="Supporting lecture text"><div className="section-heading"><h4>From this lecture</h4><button className="quiet" onClick={() => { ++sourceRequest.current; setSource([]); setSourceError(''); }}>Close source</button></div><p className="caption">Exact transcript version used to generate these materials.</p>{sourceError && <p role="status">{sourceError}</p>}{source.map(s => <blockquote key={s.id}><p>{s.text}</p><span className="caption">{s.start_seconds === null ? 'Time unavailable' : duration(s.start_seconds)}</span></blockquote>)}</aside>}
  </div>;
}

function Quiz({ api, pack, refs }: { api: Api; pack: StudyPack; refs: (ids: string[]) => React.ReactNode }) {
  const prefix = scopeKey(api.base, `recording:${pack.recording_id}:pack:${pack.id}:`);
  const pendingKey = `${prefix}submission`;
  const [answers, setAnswers] = useState<Record<string, string>>(() => read(`${prefix}draft`, {}));
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [history, setHistory] = useState<string[]>(() => read(`${prefix}history`, []));
  const [pending, setPending] = useState(() => read(pendingKey, null) !== null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [unansweredConfirmed, setUnansweredConfirmed] = useState(false);
  const guard = useRef(false);
  const unanswered = pack.questions.filter(q => !answers[q.id]).length;
  useEffect(() => {
    let active = true;
    const view = read<string>(`${prefix}view`, '');
    const latest = view === 'draft' || read(pendingKey, null) ? null : view || read<string[]>(`${prefix}history`, []).at(-1);
    if (latest) api.request(`/quiz-attempts/${encodeURIComponent(latest)}`, attemptSchema).then(result => { if (active && result.study_pack_id === pack.id) setAttempt(result); }).catch(e => { if (active) setError(message(e)); });
    return () => { active = false; };
  }, [api, prefix, pendingKey, pack.id]);
  function choose(question: string, option: string) {
    if (pending || busy || attempt) return;
    const next = { ...answers, [question]: option };
    try { write(`${prefix}draft`, next); setAnswers(next); setUnansweredConfirmed(false); setError(''); } catch (e) { setError(message(e)); }
  }
  async function submit() {
    if (guard.current || pack.freshness !== 'current' || pack.quiz_status !== 'available' || unanswered > 0 && !unansweredConfirmed && !pending) return;
    guard.current = true; setBusy(true); setError('');
    try {
      const body: QuizSubmission = { study_pack_id: pack.id, answers: pack.questions.map(q => ({ question_id: q.id, option_id: answers[q.id] ?? null })) };
      const request = operation(pendingKey, body); setPending(true);
      const result = await api.json(`/recordings/${encodeURIComponent(pack.recording_id)}/quiz-attempts`, request.body, request.key, attemptSchema);
      if (result.study_pack_id !== pack.id) throw new Error('The returned feedback belongs to a different study version.');
      const ids = [...new Set([...history, result.id])];
      write(`${prefix}history`, ids); write(`${prefix}view`, result.id); setHistory(ids); setAttempt(result); remove(pendingKey); setPending(false);
    } catch (e) {
      // Known invalid/stale input cannot be regraded locally; keep its draft for review.
      if (e instanceof ApiError && ['study_pack_outdated', 'deleted'].includes(e.code)) setError('This material changed or was deleted. Reopen the lecture to find current material. Your draft is kept.');
      else setError(message(e));
    } finally { guard.current = false; setBusy(false); }
  }
  async function openAttempt(id: string) {
    if (guard.current) return;
    guard.current = true; setBusy(true);
    try { const result = await api.request(`/quiz-attempts/${encodeURIComponent(id)}`, attemptSchema); if (result.study_pack_id !== pack.id) throw new Error('Feedback version does not match.'); write(`${prefix}view`, id); setAttempt(result); setError(''); }
    catch (e) { setError(message(e)); } finally { guard.current = false; setBusy(false); }
  }
  if (pack.quiz_status !== 'available') return <div className="notice">{pack.quiz_status === 'insufficient_evidence' ? 'This lesson does not contain enough supported material for a quiz.' : 'A quiz is not available for this lesson yet.'} You can still review the available study materials.</div>;
  return <div>
    {history.length > 0 && <label>Previous attempts<select aria-label="Previous attempts" value={attempt?.id ?? ''} disabled={busy} onChange={e => { if (e.target.value) void openAttempt(e.target.value); }}><option value="">Choose feedback</option>{history.map((id, i) => <option key={id} value={id}>Attempt {i + 1}</option>)}</select></label>}
    {attempt ? <><div className="score"><span className="eyebrow">THIS QUIZ ATTEMPT</span><h3>{attempt.correct_count} of {attempt.total_count} correct</h3><p>{attempt.percentage.toFixed(1)}% · {attempt.unanswered_count} unanswered</p>{attempt.practice_revealed && <p>Practice · Solutions previously revealed</p>}</div>
      {attempt.results.map(result => {
        const question = pack.questions.find(q => q.id === result.question_id);
        return <article className="feedback" key={result.question_id}><h4>{question?.prompt ?? 'Question feedback'}</h4><p><strong>{result.selected_option_id === null ? 'Unanswered' : result.is_correct ? 'Correct' : 'Incorrect'}</strong></p><p>Your answer: {question?.options.find(o => o.id === result.selected_option_id)?.text ?? 'Unanswered'}</p><p>Correct answer: {question?.options.find(o => o.id === result.correct_option_id)?.text ?? 'Answer unavailable'}</p><p>{result.explanation}</p>{refs(result.evidence_segment_ids)}</article>;
      })}<button className="secondary" disabled={pack.freshness === 'outdated' || busy} onClick={() => { try { write(`${prefix}draft`, {}); write(`${prefix}view`, 'draft'); setAnswers({}); setAttempt(null); setUnansweredConfirmed(false); } catch (e) { setError(message(e)); } }}>Start a new practice attempt</button></> : <form onSubmit={e => { e.preventDefault(); void submit(); }}>
      <p>{pack.questions.length - unanswered} of {pack.questions.length} answered · {unanswered} unanswered</p>{history.length > 0 && <p className="notice">Practice · You have already seen solutions for this material.</p>}
      {pending && <p className="notice">Your submission is awaiting confirmation. Retry sends the original answers with the same action key.</p>}
      {pack.questions.map((q, i) => <fieldset key={q.id} disabled={busy || pending || pack.freshness === 'outdated'}><legend><span className="question-number">{i + 1}.</span> {q.prompt}</legend>{q.options.map(o => <label className={`option ${answers[q.id] === o.id ? 'chosen' : ''}`} key={o.id}><input type="radio" name={q.id} value={o.id} checked={answers[q.id] === o.id} onChange={() => choose(q.id, o.id)} />{o.text}</label>)}</fieldset>)}
      {!!unanswered && !pending && <label className="check"><input type="checkbox" checked={unansweredConfirmed} onChange={e => setUnansweredConfirmed(e.target.checked)} />Submit with {unanswered} unanswered. Unanswered questions score zero.</label>}
      <button disabled={busy || pack.freshness === 'outdated' || !pending && unanswered > 0 && !unansweredConfirmed}>{busy ? 'Submitting…' : pending ? 'Retry same submission' : 'Submit answers'}</button>
    </form>}
    {error && <p className="notice error" role="alert">{error}</p>}
  </div>;
}
