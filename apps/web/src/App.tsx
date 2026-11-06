import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { Api, ApiError, budgetSchema, configSchema, connectionUrl, duration, jobSchema, librarySchema, message, packSchema, recordingSchema, terminalStatuses, validateFile } from './api';
import type { Config, Job, Recording, StudyPack } from './api';
import { clearRecording, operation, read, remove, scopeKey, uploadDraft, write } from './storage';
import type { UploadDraft } from './storage';
import { Study } from './Study';
import { Icon, Recorder } from './Recorder';

const stageCopy: Record<string, string> = {
  queued: 'Waiting to process', preparing_audio: 'Preparing audio', transcribing: 'Transcribing your lesson', analysing: 'Identifying the subject',
  generating: 'Preparing study materials', validating: 'Checking lesson references', ready: 'Study materials ready', partial: 'Some materials are available',
  blocked: 'Processing is blocked', failed: 'Processing could not finish', canceled: 'Processing canceled',
};
export function ErrorNotice({ error }: { error: string }) { return <p className="notice error" role="alert">{error}</p>; }
export function App() {
  const [base, setBase] = useState(() => read<string>('lecture-companion:host', ''));
  const [address, setAddress] = useState(base);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'record' | 'study'>('record');
  const [initialFile, setInitialFile] = useState<File | null>(null);
  return <>
    <a className="skip" href="#main">Skip to main content</a>
    <header className="site-header"><a className="brand" href="#" onClick={() => setView('record')}><span className="brand-mark" aria-hidden="true">L</span><span>Lecture Companion<small>Make room for understanding.</small></span></a>
      <nav className="app-nav" aria-label="Main navigation"><button aria-current={view === 'record' ? 'page' : undefined} onClick={() => setView('record')}><Icon name="mic" size={17} />Record</button><button aria-current={view === 'study' ? 'page' : undefined} onClick={() => setView('study')}><Icon name="library" size={17} />Study library</button></nav>
      <button className="connection-toggle quiet" onClick={() => setEditing(!editing)} aria-expanded={editing}><span className={base ? 'connection-dot configured' : 'connection-dot'} />{base ? 'Laptop setup' : 'Connect laptop'}</button></header>
    {editing && <section className="connection" aria-label="Laptop connection"><form onSubmit={event => {
      event.preventDefault();
      try { const next = connectionUrl(address); write('lecture-companion:host', next); setBase(next); setEditing(false); setView('study'); setError(''); } catch (e) { setError(message(e)); }
    }}><label htmlFor="address">Laptop service address</label><div className="row"><input id="address" type="url" placeholder="https://laptop.example" value={address} required onChange={e => setAddress(e.target.value)} /><button>Connect</button></div>
      <p className="muted">Use the address provided by Alex. Demo access is set up by the operator in this browser.</p>{error && <ErrorNotice error={error} />}</form></section>}
    {view === 'record' ? <Recorder onUseFile={file => { setInitialFile(file); setView('study'); if (!base) setEditing(true); }} /> : base ? <Workspace key={base} base={base} initialFile={initialFile} clearInitialFile={() => setInitialFile(null)} /> : <main id="main" className="welcome"><span className="eyebrow">YOUR STUDY SPACE</span><h1>Your lesson, made clearer.</h1><p>Connect to Alex’s laptop to upload a lecture, revisit its transcript, and study with source-linked notes and questions.</p><button onClick={() => setEditing(true)}>Connect laptop</button><div className="notice">Waiting for the laptop service. No audio has been uploaded or processed.</div><p className="muted">The uploaded demo library is shared with every authorized device. Keep a copy of your original audio.</p></main>}
    <footer>Made for the moments worth remembering.<span>Lecture Companion · Local recording, shared study</span></footer>
  </>;
}

function Workspace({ base, initialFile, clearInitialFile }: { base: string; initialFile: File | null; clearInitialFile: () => void }) {
  const api = useMemo(() => new Api(base), [base]);
  const [config, setConfig] = useState<Config | null>(null);
  const [budget, setBudget] = useState<z.infer<typeof budgetSchema> | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState(() => initialFile ? null : read<string | null>(scopeKey(base, 'selected'), null));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const busy = useRef(false);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true; setLoading(true); setError('');
    try {
      const nextConfig = await api.request('/config', configSchema);
      setConfig(nextConfig);
      const list = await api.request('/recordings', librarySchema);
      setRecordings(list.items); setCursor(list.next_cursor);
      try { setBudget(await api.request('/budget', budgetSchema)); } catch { setBudget(null); }
    } catch (e) { setConfig(null); setBudget(null); setRecordings([]); setError(message(e)); }
    finally { busy.current = false; setLoading(false); }
  }, [api]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const visible = () => { if (!document.hidden) void refresh(); };
    window.addEventListener('online', visible); document.addEventListener('visibilitychange', visible);
    return () => { window.removeEventListener('online', visible); document.removeEventListener('visibilitychange', visible); };
  }, [refresh]);
  function select(id: string | null) { try { write(scopeKey(base, 'selected'), id); setSelected(id); } catch (e) { setError(message(e)); } }
  async function more() {
    if (!cursor || busy.current) return;
    busy.current = true; setLoading(true);
    try { const page = await api.request(`/recordings?cursor=${encodeURIComponent(cursor)}`, librarySchema); setRecordings(old => [...old, ...page.items.filter(x => !old.some(y => x.id === y.id))]); setCursor(page.next_cursor); }
    catch (e) { setError(message(e)); } finally { busy.current = false; setLoading(false); }
  }
  return <main id="main" className="workspace">
    <div className="page-heading"><div><span className="eyebrow">LISTEN. REVISIT. UNDERSTAND.</span><h1>Your lecture library</h1><p className="muted">One shared space for the lessons you’re learning.</p></div><button className="secondary" disabled={loading} onClick={() => void refresh()}>{loading ? 'Connecting…' : 'Refresh library'}</button></div>
    {error && <ErrorNotice error={error} />}
    {budget && <div className="budget">Demo allowance: ${budget.available_usd} available of ${budget.ceiling_usd}<span>Settled ${budget.settled_usd} · Reserved ${budget.reserved_usd} · Uncertain ${budget.uncertain_usd}</span></div>}
    {!config && !loading && <div className="notice">Connect to the laptop to check supported formats and upload limits. Processing is unavailable while disconnected.</div>}
    <div className="columns"><aside className="library" aria-label="Shared lecture library"><div className="section-heading"><h2>Lectures</h2><span className="badge">Shared</span></div>
      {!loading && config && recordings.length === 0 && <p className="muted">No uploaded lectures yet.<br />Add your first lesson to get started.</p>}
      <ul className="recording-list">{recordings.map(r => <li key={r.id}><button className={`recording-card ${selected === r.id ? 'selected' : ''}`} aria-pressed={selected === r.id} onClick={() => select(r.id)}><strong>{r.title || 'Untitled lecture'}</strong><span>{duration(r.duration_seconds)} · {r.source === 'web' ? 'Uploaded from web' : 'From a phone'}</span><span>{new Date(r.recorded_at ?? r.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}{!r.recorded_at && ' · upload date'}</span></button></li>)}</ul>
      {cursor && <button className="secondary" disabled={loading} onClick={() => void more()}>Load more lectures</button>}
      {selected && <button className="quiet" onClick={() => select(null)}>+ Add another lecture</button>}
    </aside><div className="main-panel">{selected ? <Detail key={selected} api={api} recordingId={selected} connected={!!config} onMissing={() => { select(null); void refresh(); }} onChange={() => void refresh()} /> : <Upload api={api} config={config} initialFile={initialFile} onUploaded={r => { clearInitialFile(); select(r.id); void refresh(); }} />}</div></div>
  </main>;
}

function Upload({ api, config, initialFile, onUploaded }: { api: Api; config: Config | null; initialFile: File | null; onUploaded: (r: Recording) => void }) {
  const [file, setFile] = useState<File | null>(initialFile);
  const [title, setTitle] = useState(() => initialFile?.name.replace(/\.[^.]+$/, '') ?? '');
  const [localUrl, setLocalUrl] = useState('');
  const [length, setLength] = useState<number | null>(null);
  const [pending, setPending] = useState<UploadDraft | null>(null);
  const [restored, setRestored] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const guard = useRef(false);
  useEffect(() => {
    let active = true;
    uploadDraft(api.base).then(draft => { if (active && draft) { setPending(draft); setFile(draft.file); setTitle(draft.title); } }).catch(e => { if (active) setError(message(e)); }).finally(() => { if (active) setRestored(true); });
    return () => { active = false; };
  }, [api]);
  useEffect(() => { if (!file) return; const url = URL.createObjectURL(file); setLocalUrl(url); return () => URL.revokeObjectURL(url); }, [file]);
  const invalid = file && config ? validateFile(file, config, length) : null;
  function choose(next: File | undefined) {
    if (!next || pending || busy) return;
    setLength(null); setFile(next); setTitle(next.name.replace(/\.[^.]+$/, '')); setError(''); setConsent(false);
  }
  async function upload() {
    if (!file || !config || invalid || guard.current || !consent) return;
    guard.current = true; setBusy(true); setError('');
    try {
      const draft = pending ?? { key: crypto.randomUUID(), file, title: title.trim() || file.name };
      await uploadDraft(api.base, draft); setPending(draft);
      const data = new FormData(); data.append('file', draft.file); data.append('source', 'web'); data.append('title', draft.title);
      const recording = await api.request('/recordings', recordingSchema, { method: 'POST', headers: { 'Idempotency-Key': draft.key }, body: data });
      await uploadDraft(api.base, null); onUploaded(recording);
    } catch (e) { setError(message(e)); }
    finally { guard.current = false; setBusy(false); }
  }
  async function clearDraft() {
    if (busy || !window.confirm('Clear this browser’s upload draft? An upload may already exist on the laptop. Refresh the shared library before uploading it again. Your original file is kept.')) return;
    try { await uploadDraft(api.base, null); setPending(null); setFile(null); setLocalUrl(''); setLength(null); setConsent(false); setError(''); }
    catch (e) { setError(message(e)); }
  }
  return <section aria-labelledby="upload-heading"><span className="eyebrow">START WITH YOUR AUDIO</span><h2 id="upload-heading">A lesson worth revisiting.</h2><p>Upload a recording, then choose when to turn it into study materials.</p>
    <div className="dropzone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); choose(e.dataTransfer.files[0]); }}>
      <span className="upload-icon" aria-hidden="true">↑</span><strong>Drop your lecture audio here</strong><p className="muted">or choose a file from your computer</p><label className="file-label">Browse audio<input aria-label="Browse audio" type="file" accept={config?.accepted_mime_types.join(',') ?? 'audio/*'} disabled={busy || !!pending || !restored} onChange={e => choose(e.target.files?.[0])} /></label>
    </div>
    {config && <p className="caption">Active limit: {(config.max_audio_bytes / 1_000_000).toFixed(0)} MB · {duration(config.max_duration_seconds)} · {config.accepted_mime_types.join(', ')}{config.capacity_status === 'prototype_limited' && <><br />Prototype limits. Full target: {duration(config.target_max_duration_seconds)} / {(config.target_max_audio_bytes / 1_000_000).toFixed(0)} MB; not yet verified.</>}</p>}
    {file && <div className="file-review"><h3>Review your recording</h3><p className="filename">{file.name}</p><p className="muted">{(file.size / 1_000_000).toFixed(2)} MB · {duration(length)} · {file.type || 'Format to be verified by laptop'}</p>
      {localUrl && <audio key={localUrl} controls preload="metadata" src={localUrl} onLoadedMetadata={e => { const d = e.currentTarget.duration; setLength(Number.isFinite(d) ? d : null); }} onError={() => setLength(null)} />}
      <label htmlFor="lecture-title">Lecture title</label><input id="lecture-title" value={title} disabled={busy || !!pending} onChange={e => setTitle(e.target.value)} maxLength={240} />
      {pending && <div className="notice">An upload is waiting for confirmation. Retry sends the same file and action, including after refreshing this page. Browser storage can be cleared or evicted; keep the original.</div>}
      <label className="check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />I can share this recording with all authorized demo devices.</label>
      {invalid && <ErrorNotice error={invalid} />}
      <button disabled={busy || !config || !!invalid || !consent || !restored} onClick={() => void upload()}>{busy ? 'Uploading…' : pending ? 'Retry same upload' : 'Upload to shared library'}</button><p className="caption">Uploading saves your audio. It does not start paid processing. Your original computer file is kept.</p>
      {pending && <button className="quiet" disabled={busy} onClick={() => void clearDraft()}>Clear local upload draft</button>}
    </div>}
    {error && <ErrorNotice error={error} />}
    <div className="steps"><div><span>01</span><strong>Save your audio</strong><p>Keep the original lesson.</p></div><div><span>02</span><strong>Make it clearer</strong><p>Process when you’re ready.</p></div><div><span>03</span><strong>Check what sticks</strong><p>Study, answer, revisit.</p></div></div>
  </section>;
}

function Detail({ api, recordingId, connected, onMissing, onChange }: { api: Api; recordingId: string; connected: boolean; onMissing: () => void; onChange: () => void }) {
  const path = `/recordings/${encodeURIComponent(recordingId)}`;
  const [recording, setRecording] = useState<Recording | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [pack, setPack] = useState<StudyPack | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const guard = useRef(false);
  const [reload, setReload] = useState(0);
  const pendingScope = scopeKey(api.base, `recording:${recordingId}:process`);
  const [hasPending, setHasPending] = useState(() => read(pendingScope, null) !== null);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    let stopped = false, timer: ReturnType<typeof setTimeout>;
    let inFlight = false;
    let lastJob: Job | null = null;
    let failures = 0;
    async function poll() {
      if (inFlight || stopped) return;
      clearTimeout(timer);
      if (document.hidden || !navigator.onLine) { timer = setTimeout(() => void poll(), 10_000); return; }
      inFlight = true;
      let active = false;
      try {
        const r = await api.request(path, recordingSchema);
        if (r.id !== recordingId) throw new Error('The laptop returned a different lecture. Refresh the shared library.');
        if (stopped) return;
        setRecording(r);
        const j = r.latest_job_id
          ? lastJob?.id === r.latest_job_id && terminalStatuses.has(lastJob.status)
            ? lastJob : await api.request(`/jobs/${encodeURIComponent(r.latest_job_id)}`, jobSchema)
          : null;
        if (stopped) return;
        if (j && j.recording_id !== recordingId) throw new Error('Processing details do not match this lecture.');
        lastJob = j;
        setJob(j); active = !!j && !terminalStatuses.has(j.status);
        try {
          const p = await api.request(`${path}/study-pack`, packSchema);
          if (p.recording_id !== recordingId) throw new Error('Study materials do not match this lecture.');
          if (!stopped) setPack(p);
        } catch (e) { if (!(e instanceof ApiError && e.code === 'not_ready')) throw e; }
        if (!stopped) setError('');
        failures = 0;
      } catch (e) {
        if (stopped) return;
        if (e instanceof ApiError && (e.status === 404 || e.status === 401 || e.status === 403)) { setPack(null); setRecording(null); setJob(null); if (e.status === 404) clearRecording(api.base, recordingId); }
        setError(message(e)); active = true; failures += 1;
      } finally {
        inFlight = false;
        if (!stopped) timer = setTimeout(() => void poll(), failures ? Math.min(30_000, 2000 * 2 ** failures) : active ? 2000 : 30_000);
      }
    }
    // Terminal jobs are not polled. The slower library reconciliation detects shared deletion/updates.
    const wake = () => { if (!document.hidden) void poll(); };
    void poll(); window.addEventListener('online', wake); document.addEventListener('visibilitychange', wake);
    return () => { stopped = true; clearTimeout(timer); window.removeEventListener('online', wake); document.removeEventListener('visibilitychange', wake); };
  }, [api, path, recordingId, reload]);
  async function process() {
    if (guard.current || !consent || !connected) return;
    if (pack && !hasPending && !job?.error && job?.status !== 'partial') return;
    guard.current = true; setBusy(true); setError('');
    try {
      const body = job && ['failed', 'blocked', 'partial', 'canceled'].includes(job.status) ? { retry_of_job_id: job.id } : {};
      const pending = operation(pendingScope, body); setHasPending(true);
      const next = await api.json(`${path}/jobs`, pending.body, pending.key, jobSchema);
      if (next.recording_id !== recordingId) throw new Error('Processing details do not match this lecture.');
      setJob(next); remove(pendingScope); setHasPending(false); setReload(n => n + 1); onChange();
    } catch (e) { setError(message(e)); }
    finally { guard.current = false; setBusy(false); }
  }
  async function deleteRecording() {
    if (guard.current || !window.confirm('Delete this uploaded lecture and all its study data for EVERY demo device? Your original computer file will remain. This cannot be undone.')) return;
    guard.current = true; setBusy(true); setError('');
    try {
      const result = await api.request(path, z.union([z.undefined(), z.object({ status: z.string() })]), { method: 'DELETE' });
      clearRecording(api.base, recordingId); setPack(null);
      if (result) setDeleting(true); else onMissing();
    } catch (e) { setError(message(e)); }
    finally { guard.current = false; setBusy(false); }
  }
  const active = job && !terminalStatuses.has(job.status);
  const canProcess = !active && (!pack || hasPending || !!job && ['partial', 'blocked', 'failed', 'canceled'].includes(job.status));
  return <section aria-label="Lecture detail">
    {recording && <><span className="eyebrow">SAVED IN THE SHARED DEMO LIBRARY</span><h2>{recording.title || 'Untitled lecture'}</h2><p className="muted">{duration(recording.duration_seconds)} · {(recording.byte_size / 1_000_000).toFixed(2)} MB · {recording.mime_type}</p>
      {!deleting && <audio aria-label="Original lecture audio" controls preload="none" src={api.audio(recordingId)} />}</>}
    {error && <ErrorNotice error={error} />}
    {!recording && <button className="secondary" onClick={onMissing}>Return to library</button>}
    {deleting ? <div className="notice">Deletion was accepted. Cleanup is pending on the laptop.<button className="quiet" onClick={onMissing}>Return to library</button></div> : <>
      {job && <div className={`notice ${job.status === 'blocked' || job.status === 'partial' ? 'warning' : ''}`} role="status"><strong>{stageCopy[job.status]}</strong>{job.error && <p>{job.error.message}</p>}{active && <p className="caption">You can leave this view. Processing continues on the laptop.</p>}</div>}
      {recording && canProcess && <div className="process-panel"><h3>{hasPending ? 'Confirm your pending action' : job ? 'Continue processing' : 'Ready to make study materials?'}</h3><p>Your audio goes to ElevenLabs for transcription. Transcript content goes to the configured AI provider. Results are shared with all authorized demo devices and use the shared demo allowance.</p><label className="check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />I agree to this processing.</label><button disabled={busy || !connected || !consent} onClick={() => void process()}>{busy ? 'Sending…' : hasPending ? 'Retry same processing request' : job ? 'Retry processing' : 'Process lecture'}</button></div>}
      {pack && <Study key={pack.id} api={api} pack={pack} />}
      {recording && <div className="cleanup"><p className="caption">Deleting uploaded data affects every demo device. Your original computer file stays on your computer.</p><button className="danger" disabled={busy || !connected} onClick={() => void deleteRecording()}>Delete uploaded lecture</button></div>}
    </>}
  </section>;
}
