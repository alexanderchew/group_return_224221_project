import { useEffect, useState, useSyncExternalStore } from 'react';
import { browserCapture } from './capture';
import { deleteLocal, listLocal, saveChunk } from './captureStore';
import type { LocalAudio } from './captureStore';
import { duration, message } from './api';

export function Icon({ name, size = 22 }: { name: 'mic' | 'pause' | 'play' | 'stop' | 'library' | 'upload' | 'check' | 'download' | 'more' | 'headphones'; size?: number }) {
  const paths: Record<typeof name, React.ReactNode> = {
    mic: <><rect x="9" y="2" width="6" height="13" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" /></>,
    pause: <><path d="M8 5v14M16 5v14" strokeWidth="3" /></>,
    play: <path d="m9 5 11 7-11 7Z" />,
    stop: <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />,
    library: <><path d="M4 5h4v15H4zM11 5h4v15h-4zM18 4l4 15" /></>,
    upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    download: <><path d="M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    headphones: <><path d="M4 14v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="12" width="4" height="8" rx="2" /><rect x="17" y="12" width="4" height="8" rx="2" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function Recorder({ onUseFile }: { onUseFile: (file: File) => void }) {
  const capture = useSyncExternalStore(browserCapture.subscribe, browserCapture.getSnapshot);
  const [title, setTitle] = useState('');
  const [saved, setSaved] = useState<LocalAudio[]>([]);
  const [opened, setOpened] = useState<string | null>(null);
  const [playback, setPlayback] = useState('');
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const active = ['permission', 'recording', 'paused', 'saving'].includes(capture.phase);
  const recording = capture.phase === 'recording';
  const paused = capture.phase === 'paused';
  const busy = capture.phase === 'permission' || capture.phase === 'saving';
  async function refresh() { try { setSaved((await listLocal()).filter(a => a.bytes > 0 && a.state !== 'capturing')); } catch (e) { setError(message(e)); } }
  useEffect(() => { void browserCapture.initialize().then(refresh); }, []);
  useEffect(() => { if (capture.phase === 'saved' || capture.phase === 'error') void refresh(); }, [capture.phase]);
  useEffect(() => {
    let disposed = false, url = '';
    const audio = saved.find(a => a.id === opened);
    setPlayback('');
    if (audio) browserCapture.file(audio).then(file => { if (!disposed) { url = URL.createObjectURL(file); setPlayback(url); } }).catch(e => setError(message(e)));
    return () => { disposed = true; if (url) URL.revokeObjectURL(url); };
  }, [opened, saved]);
  async function useFile(audio: LocalAudio) { try { onUseFile(await browserCapture.file(audio)); } catch (e) { setError(message(e)); } }
  async function exportFile(audio: LocalAudio) {
    try {
      const file = await browserCapture.file(audio), url = URL.createObjectURL(file);
      const link = document.createElement('a'); link.href = url; link.download = file.name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e) { setError(message(e)); }
  }
  async function importFile(file: File | undefined) {
    if (!file || active || importing) return;
    setImporting(true); setError('');
    try {
      if (!file.size || file.size > 2_000_000_000) throw new Error('Choose a non-empty audio file smaller than 2 GB.');
      if (file.type && !file.type.startsWith('audio/') && file.type !== 'video/mp4') throw new Error('Choose an audio file.');
      const audio: LocalAudio = { id: crypto.randomUUID(), title: file.name.replace(/\.[^.]+$/, ''), fileName: file.name, createdAt: new Date().toISOString(), durationSeconds: 0, mimeType: file.type, bytes: file.size, state: 'saved' };
      await saveChunk(audio, 0, file); await refresh(); setOpened(audio.id);
    } catch (e) { setError(message(e)); } finally { setImporting(false); }
  }
  const status = { idle: 'Ready when you are', permission: 'Allow microphone access', recording: 'Recording', paused: 'Paused', saving: 'Saving your audio…', saved: 'Saved on this device', error: 'Check your recording' }[capture.phase];
  return <main id="main" className="capture-page">
    <div className="capture-heading"><div><span className="eyebrow">A LITTLE FOCUS. A LOT TO REMEMBER.</span><h1>Capture the lesson.</h1><p>Be here now. Revisit the details later.</p></div><span className="local-pill"><span /> Saved on your device</span></div>
    <div className="capture-grid"><section className="recorder-surface" aria-label="Audio recorder">
      <div className="recorder-title-row"><div className="mic-tile"><Icon name="mic" /></div><div><span className="eyebrow">NEW RECORDING</span><label className="sr-only" htmlFor="recording-title">Recording title</label><input id="recording-title" className="recording-title-input" placeholder="Give your lesson a title" value={title} onChange={e => setTitle(e.target.value)} disabled={active} maxLength={240} /></div><span className="device-tag">AUDIO</span></div>
      <div className={`capture-display ${recording ? 'is-recording' : ''}`}>
        <p className={`capture-state ${recording ? 'live' : ''}`} role="status"><span />{status}</p>
        <div className="capture-clock" aria-label={`${Math.floor(capture.seconds)} seconds recorded`}>{duration(capture.seconds).padStart(5, '0')}<span>.{Math.floor((capture.seconds % 1) * 10)}</span></div>
        <div className="waveform" aria-hidden="true">{capture.levels.map((level, i) => <span key={i} style={{ height: `${3 + level * 65}px`, opacity: .35 + .65 * (i / capture.levels.length) }} />)}<div className="waveform-playhead" /></div>
        <div className="waveform-scale" aria-hidden="true"><span>INPUT</span><span>LIVE SOUND LEVEL</span><span>NOW</span></div>
        <p className="input-hint"><Icon name="mic" size={14} />{recording ? !capture.meterAvailable ? 'Recording audio · input meter unavailable' : capture.levels.at(-1)! > .03 ? 'Microphone is picking up audio' : 'Listening · move closer if your voice is quiet' : paused ? 'Take your time. Resume when you’re ready.' : 'Your microphone starts only when you press Record.'}</p>
      </div>
      <div className="capture-controls">{recording || paused ? <><button className="round-control" aria-label={paused ? 'Resume recording' : 'Pause recording'} onClick={() => paused ? void browserCapture.resume() : browserCapture.pause()}><Icon name={paused ? 'play' : 'pause'} size={24} /><span>{paused ? 'Resume' : 'Pause'}</span></button><button className="stop-control" onClick={() => browserCapture.stop()}><Icon name="stop" size={22} />Stop & save</button></> : <button className="record-control" disabled={busy || importing || capture.phase === 'error' && !!capture.current?.bytes} onClick={() => void browserCapture.start(title)}><span className="record-dot" />{busy ? capture.phase === 'permission' ? 'Opening microphone…' : 'Saving…' : capture.phase === 'saved' ? 'Record another lesson' : 'Start recording'}</button>}</div>
      <div className="recorder-footnote"><Icon name="check" size={15} /><span>Local first. Nothing is uploaded automatically.</span></div>
      {capture.notice && <p className="capture-notice" role="status">{capture.notice}</p>}
      {capture.error && <div className="notice error" role="alert">{capture.error}{capture.current?.bytes ? <button className="secondary" onClick={() => void browserCapture.retrySave()}>Retry saving audio</button> : null}</div>}
      <details className="recording-help"><summary>Recording tips & browser limits</summary><p>Use a supported browser on HTTPS or localhost. Keep this page visible; switching apps or locking the screen can interrupt browser recording. Hidden pages pause automatically. The timer excludes pauses.</p><p>Audio fragments are kept in this browser. Export a copy: browser storage can be cleared or evicted. Recovery after a crash may be incomplete or unplayable. Long sessions and iPhone browser behavior still need device testing.</p></details>
    </section><aside className="local-library" aria-label="Local recordings"><div className="section-heading"><h2>Your recordings <span>{saved.length}</span></h2><label className="import-control" title="Import audio"><Icon name="upload" size={18} /><span>Import</span><input type="file" accept="audio/*" aria-label="Import audio to this device" disabled={active || importing} onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }} /></label></div><p className="local-subtitle">Only on this browser. Ready when you need them.</p>
      {saved.length === 0 && <div className="empty-recordings"><span><Icon name="headphones" size={28} /></span><h3>Good things start here.</h3><p>Your saved lessons will appear here.<br />Record something, or import audio.</p></div>}
      <ul className="local-audio-list">{saved.map(audio => <li key={audio.id} className={opened === audio.id ? 'opened' : ''}><button className="local-audio-main" aria-expanded={opened === audio.id} onClick={() => setOpened(opened === audio.id ? null : audio.id)}><span className="audio-file-icon"><Icon name="play" size={18} /></span><span><strong>{audio.title}</strong><small>{new Date(audio.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {audio.durationSeconds ? duration(audio.durationSeconds) : 'Duration not verified'}{audio.state === 'interrupted' ? ' · Recovered partial' : ' · Local'}</small></span></button>{opened === audio.id && <div className="local-audio-expanded">{playback && <audio src={playback} controls preload="metadata" aria-label={`Play ${audio.title}`} />}<div className="local-audio-actions"><button className="quiet" onClick={() => void exportFile(audio)}><Icon name="download" size={16} />Export</button><button className="quiet" disabled={active} onClick={() => void useFile(audio)}>Use for study ↗</button><button className="quiet local-delete" disabled={active} onClick={() => { if (window.confirm('Delete this recording from this browser? Export a copy first if you need it. Shared uploaded data is unchanged.')) void deleteLocal(audio.id).then(refresh).catch(e => setError(message(e))); }}>Delete local</button></div></div>}</li>)}</ul>
      {error && <p role="alert" className="notice error">{error}</p>}
      <div className="recording-next"><span>AFTER YOU RECORD</span><p>Turn listening into understanding.</p><small>Upload when you choose. Study notes and questions need Alex’s connected service.</small></div>
    </aside></div>
  </main>;
}
