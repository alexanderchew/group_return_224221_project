import { audioBlob, deleteLocal, listLocal, saveChunk, saveLocal } from './captureStore';
import type { LocalAudio } from './captureStore';

type Phase = 'idle' | 'permission' | 'recording' | 'paused' | 'saving' | 'saved' | 'error';
type Snapshot = { phase: Phase; seconds: number; levels: number[]; meterAvailable: boolean; error: string; notice: string; current: LocalAudio | null };
const empty: Snapshot = { phase: 'idle', seconds: 0, levels: Array(48).fill(0), meterAvailable: false, error: '', notice: '', current: null };
// A foreground browser safety envelope, not a measured endurance claim.
const MAX_SECONDS = 36_000, MAX_BYTES = 2_000_000_000;

export class BrowserCapture {
  private value: Snapshot = empty;
  private listeners = new Set<() => void>();
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private interval: ReturnType<typeof setInterval> | undefined;
  private elapsed = 0;
  private started = 0;
  private index = 0;
  private queue = Promise.resolve();
  private unsaved: { audio: LocalAudio; index: number; blob: Blob }[] = [];
  private interrupted = false;
  private stopping = false;
  private initialized: Promise<void> | undefined;
  getSnapshot = () => this.value;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<Snapshot>) { this.value = { ...this.value, ...patch }; this.listeners.forEach(fn => fn()); }
  initialize() {
    return this.initialized ??= (async () => {
      try {
        for (const audio of await listLocal()) if (audio.state === 'capturing') {
          if (!audio.bytes) await deleteLocal(audio.id); else await saveLocal({ ...audio, state: 'interrupted' });
        }
      } catch (e) { this.update({ error: text(e) }); }
    })();
  }
  private seconds() { return this.elapsed + (this.value.phase === 'recording' ? (performance.now() - this.started) / 1000 : 0); }
  async start(title: string) {
    if (!['idle', 'saved', 'error'].includes(this.value.phase) || this.unsaved.length) return;
    this.update({ ...empty, phase: 'permission' });
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Recording needs a supported browser on HTTPS or localhost. You can still import an audio file.');
      // Unlock the meter during the explicit user gesture, before any storage/permission awaits.
      this.context = new AudioContext();
      void this.context.resume().catch(() => {});
      await this.initialize();
      const audio: LocalAudio = { id: crypto.randomUUID(), title: title.trim() || 'Untitled lesson', createdAt: new Date().toISOString(), durationSeconds: 0, mimeType: '', bytes: 0, state: 'capturing' };
      await saveLocal(audio); // Verify writable storage before requesting the microphone.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true }, video: false });
      this.stream = stream;
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 64_000 });
      this.recorder = recorder; audio.mimeType = recorder.mimeType;
      this.elapsed = 0; this.index = 0; this.unsaved = []; this.interrupted = false; this.stopping = false; this.queue = Promise.resolve();
      recorder.ondataavailable = event => {
        if (!event.data.size) return;
        const current = this.value.current!;
        const next = { ...current, bytes: current.bytes + event.data.size, durationSeconds: this.seconds() };
        this.update({ current: next });
        const item = { audio: next, index: this.index++, blob: event.data };
        this.queue = this.queue.then(async () => {
          try { await saveChunk(item.audio, item.index, item.blob); }
          catch (e) { this.unsaved.push(item); this.update({ error: text(e) }); if (!this.stopping) this.stop(true); }
        });
        if (next.bytes >= MAX_BYTES && !this.stopping) { this.update({ notice: 'The local size limit was reached. Saving available audio.' }); this.stop(true); }
      };
      recorder.onstop = () => { void this.finalize(); };
      recorder.onerror = () => { this.update({ error: 'Microphone capture was interrupted. Saving the audio available so far.' }); this.stop(true); };
      stream.getAudioTracks().forEach(track => {
        track.onended = () => { if (!this.stopping) { this.update({ notice: 'The microphone disconnected. This recording may be incomplete.' }); this.stop(true); } };
        track.onmute = () => { if (this.value.phase === 'recording') this.pause('Microphone input was interrupted. Check the microphone before resuming.'); };
      });
      const analyser = this.context.createAnalyser(); analyser.fftSize = 1024;
      this.context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      this.started = performance.now(); this.update({ phase: 'recording', current: audio });
      recorder.start(2000); // Fragments are persisted, never treated as standalone recordings.
      this.interval = setInterval(() => {
        const seconds = this.seconds();
        if (this.value.phase === 'recording') {
          analyser.getFloatTimeDomainData(samples);
          const rms = Math.sqrt(samples.reduce((sum, s) => sum + s * s, 0) / samples.length);
          const meterAvailable = this.context?.state === 'running';
          this.update({ seconds, meterAvailable, levels: [...this.value.levels.slice(1), meterAvailable ? Math.min(1, rms * 5) : 0] });
          if (seconds >= MAX_SECONDS) { this.update({ notice: 'The local duration limit was reached. Saving your recording.' }); this.stop(); }
        }
      }, 100);
      document.addEventListener('visibilitychange', this.visibility);
      window.addEventListener('beforeunload', this.beforeUnload);
    } catch (e) {
      this.cleanup();
      const denied = e instanceof DOMException && ['NotAllowedError', 'PermissionDeniedError'].includes(e.name);
      this.update({ phase: 'error', error: denied ? 'Microphone access is blocked. Allow microphone access in your browser’s site settings, then try again. You can also import audio.' : text(e) });
    }
  }
  pause(notice = '') {
    if (this.value.phase !== 'recording' || this.recorder?.state !== 'recording') return;
    this.elapsed = this.seconds(); this.recorder.pause();
    this.update({ phase: 'paused', seconds: this.elapsed, notice });
    if (notice) this.interrupted = true;
    this.recorder.requestData();
  }
  async resume() {
    if (this.value.phase !== 'paused' || document.hidden) return;
    try {
      if (!this.stream?.getAudioTracks().some(t => t.readyState === 'live' && !t.muted)) throw new Error('The microphone is unavailable. Stop and save what was captured.');
      void this.context?.resume().catch(() => {});
      this.recorder!.resume(); this.started = performance.now(); this.update({ phase: 'recording', notice: '', error: '' });
    } catch (e) { this.update({ error: text(e) }); }
  }
  stop(interrupted = false) {
    if (!['recording', 'paused'].includes(this.value.phase) || this.stopping) return;
    this.elapsed = this.seconds(); this.interrupted ||= interrupted; this.stopping = true;
    this.update({ phase: 'saving', seconds: this.elapsed });
    if (this.recorder?.state !== 'inactive') this.recorder?.stop(); else void this.finalize();
  }
  private async finalize() {
    this.cleanup();
    await this.queue;
    const current = this.value.current;
    if (!current) return;
    const saved = { ...current, durationSeconds: this.elapsed, state: this.interrupted ? 'interrupted' as const : 'saved' as const };
    if (this.unsaved.length) { this.update({ phase: 'error', current: saved, error: 'Some audio could not be written. Keep this page open, free space, then retry saving.' }); return; }
    try {
      if (!saved.bytes) throw new Error('No audio was captured. Check your microphone and try again.');
      await saveLocal(saved); this.update({ phase: 'saved', current: saved, error: '' });
    } catch (e) { this.update({ phase: 'error', current: saved, error: text(e) }); }
  }
  async retrySave() {
    this.update({ phase: 'saving', error: '' });
    const pending = this.unsaved; this.unsaved = [];
    for (const item of pending) { try { await saveChunk(item.audio, item.index, item.blob); } catch { this.unsaved.push(item); } }
    await this.finalize();
  }
  async file(audio: LocalAudio) {
    const blob = await audioBlob(audio);
    const extension = audio.mimeType.includes('mp4') ? 'm4a' : audio.mimeType.includes('ogg') ? 'ogg' : audio.mimeType.includes('mpeg') ? 'mp3' : audio.mimeType.includes('wav') ? 'wav' : audio.mimeType.includes('aac') ? 'aac' : 'webm';
    return new File([blob], audio.fileName ?? `${audio.title.replace(/[^\p{L}\p{N}\s_-]/gu, '').slice(0, 80) || 'lecture'}.${extension}`, { type: audio.mimeType });
  }
  private visibility = () => { if (document.hidden) this.pause('Paused because this page was hidden. Keep it visible while recording.'); };
  private beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
  private cleanup() {
    clearInterval(this.interval); this.interval = undefined;
    this.stream?.getTracks().forEach(t => { t.onended = null; t.onmute = null; t.stop(); }); this.stream = null;
    void this.context?.close().catch(() => {}); this.context = null;
    document.removeEventListener('visibilitychange', this.visibility); window.removeEventListener('beforeunload', this.beforeUnload);
  }
}
function text(error: unknown) { return error instanceof Error ? error.message : 'Recording could not finish. Please try again.'; }
export const browserCapture = new BrowserCapture();
