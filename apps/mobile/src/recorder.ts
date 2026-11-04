import { AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import type { AudioRecorder } from 'expo-audio';
import { File, Paths, Directory } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { Platform } from 'react-native';

export type Lesson = { id: string; title: string; uri: string; createdAt: string; durationSeconds: number | null; bytes: number; state: 'capturing' | 'saved' | 'interrupted'; available?: boolean };
type Phase = 'idle' | 'permission' | 'recording' | 'paused' | 'saving' | 'saved' | 'error';
type State = { phase: Phase; seconds: number; levels: number[]; error: string; notice: string; lesson: Lesson | null; lessons: Lesson[] };
let dbPromise: Promise<SQLite.SQLiteDatabase> | undefined;
async function database() {
  return dbPromise ??= (async () => {
    const db = await SQLite.openDatabaseAsync('lecture-companion.db');
    await db.execAsync('PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS lessons (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);');
    return db;
  })();
}
async function save(lesson: Lesson) { const db = await database(); await db.runAsync('INSERT OR REPLACE INTO lessons (id, data) VALUES (?, ?)', lesson.id, JSON.stringify(lesson)); }
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Recording could not finish. Please try again.';

// App-level lifetime: navigating between Recorder and Library does not dispose capture.
class NativeRecorder {
  private state: State = { phase: 'idle', seconds: 0, levels: Array(42).fill(0), error: '', notice: '', lesson: null, lessons: [] };
  private listeners = new Set<() => void>();
  private recorder: AudioRecorder | null = null;
  private timer: ReturnType<typeof setInterval> | undefined;
  private checkpoint = 0;
  private interrupted = false;
  private persistence = Promise.resolve();
  private boot: Promise<void> | undefined;
  private finishing = false;
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<State>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()); }
  initialize() {
    return this.boot ??= (async () => {
      try {
        const db = await database();
        for (const row of await db.getAllAsync<{ data: string }>('SELECT data FROM lessons')) {
          const lesson = JSON.parse(row.data) as Lesson;
          if (lesson.state === 'capturing') await save({ ...lesson, state: 'interrupted' });
        }
        await this.refresh();
      } catch (e) { this.update({ error: errorText(e) }); this.boot = undefined; }
    })();
  }
  async refresh() {
    const db = await database();
    const rows = await db.getAllAsync<{ data: string }>('SELECT data FROM lessons');
    const lessons = rows.map(row => JSON.parse(row.data) as Lesson).filter(l => l.state !== 'capturing').map(l => {
      const file = new File(l.uri);
      return { ...l, available: file.exists && file.size > 0 };
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    this.update({ lessons });
  }
  async start(title: string) {
    if (!['idle', 'saved', 'error'].includes(this.state.phase) || this.state.phase === 'error' && this.state.lesson) return;
    this.update({ phase: 'permission', error: '', notice: '', seconds: 0, levels: Array(42).fill(0), lesson: null });
    try {
      await this.initialize();
      if (Paths.availableDiskSpace < 50_000_000) throw new Error('Storage is nearly full. Free at least 50 MB before recording.');
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) throw new Error('Microphone access is blocked. Allow it in your phone’s Settings, or import an audio file.');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, allowsBackgroundRecording: true, interruptionMode: 'doNotMix' });
      const id = randomUUID();
      const options = { ...RecordingPresets.HIGH_QUALITY, directory: 'document' as const, fileName: id, bitRate: 64_000, numberOfChannels: 1, isMeteringEnabled: true, android: { ...RecordingPresets.HIGH_QUALITY.android, maxFileSize: 2_000_000_000 } };
      const recorder = new AudioModule.AudioRecorder({ ...options, ...(Platform.OS === 'ios' ? options.ios : options.android) });
      this.recorder = recorder;
      await recorder.prepareToRecordAsync(options);
      if (!recorder.uri) throw new Error('The microphone could not create a local audio file.');
      const lesson: Lesson = { id, title: title.trim() || 'Untitled lesson', uri: recorder.uri, createdAt: new Date().toISOString(), durationSeconds: 0, bytes: 0, state: 'capturing' };
      await save(lesson); // Document URI and metadata exist before capture starts.
      this.interrupted = false; this.checkpoint = 0; this.finishing = false; this.persistence = Promise.resolve();
      recorder.addListener('recordingStatusUpdate', status => {
        if (status.hasError || status.mediaServicesDidReset) {
          this.interrupted = true;
          this.update({ notice: 'Audio was interrupted. Saving what is available; some audio may be missing.' });
          if (['recording', 'paused'].includes(this.state.phase)) void this.stop(true);
        } else if (status.isFinished && ['recording', 'paused'].includes(this.state.phase)) {
          this.interrupted = true; this.update({ phase: 'saving', notice: 'Capture ended. Review the saved audio for interruptions.' }); void this.finalize();
        }
      });
      this.update({ lesson, phase: 'recording' });
      recorder.record({ forDuration: 36_000 });
      this.timer = setInterval(() => this.tick(), 150);
    } catch (e) {
      this.release(); this.update({ phase: 'error', error: errorText(e) });
    }
  }
  private tick() {
    if (!this.recorder || !['recording', 'paused'].includes(this.state.phase)) return;
    try {
      const status = this.recorder.getStatus();
      const seconds = Math.max(this.state.seconds, status.durationMillis / 1000);
      if (status.mediaServicesDidReset) { void this.stop(true); return; }
      if (this.state.phase === 'recording' && !status.isRecording) {
        this.interrupted = true; this.update({ phase: 'paused', notice: 'Microphone capture stopped. Resume only when the microphone is available, or stop and save.' });
      }
      const level = status.metering === undefined ? 0 : Math.min(1, Math.pow(10, status.metering / 20) * 4);
      this.update({ seconds, ...(status.isRecording ? { levels: [...this.state.levels.slice(1), level] } : {}) });
      if (seconds - this.checkpoint >= 10 && this.state.lesson) {
        this.checkpoint = seconds;
        const snapshot = { ...this.state.lesson, durationSeconds: seconds, bytes: status.fileSize };
        this.persistence = this.persistence.then(() => save(snapshot)).catch(() => { this.update({ notice: 'Local indexing failed. Keep the app open and stop to retry saving.' }); });
      }
      if (seconds >= 36_000 || status.fileSize >= 2_000_000_000 || Paths.availableDiskSpace < 20_000_000) {
        this.update({ notice: 'A recording or storage limit was reached. Saving available audio.' }); void this.stop();
      } else if (seconds >= 32_400) this.update({ notice: 'Approaching the ten-hour local limit. Stop and save soon.' });
    } catch { this.interrupted = true; void this.stop(true); }
  }
  pause() {
    if (this.state.phase !== 'recording' || !this.recorder) return;
    try { this.recorder.pause(); this.update({ phase: 'paused' }); }
    catch (e) { this.update({ error: errorText(e) }); }
  }
  resume() {
    if (this.state.phase !== 'paused' || !this.recorder) return;
    try { this.recorder.record({ forDuration: Math.max(0, 36_000 - this.state.seconds) }); this.update({ phase: 'recording', notice: '', error: '' }); }
    catch { this.update({ error: 'The microphone is still unavailable. Stop and save your captured audio.' }); }
  }
  async stop(interrupted = false) {
    if (!['recording', 'paused'].includes(this.state.phase) || !this.recorder) return;
    this.interrupted ||= interrupted; this.update({ phase: 'saving' }); clearInterval(this.timer);
    try { await this.recorder.stop(); } catch { this.interrupted = true; }
    await this.finalize();
  }
  async retrySave() { if (this.state.lesson && this.state.phase === 'error') { this.update({ phase: 'saving', error: '' }); await this.finalize(); } }
  private async finalize() {
    if (this.finishing || !this.state.lesson) return;
    this.finishing = true; clearInterval(this.timer);
    try {
      await this.persistence;
      const uri = this.recorder?.uri ?? this.state.lesson.uri;
      const file = new File(uri);
      if (!file.exists || !file.size) throw new Error('No readable audio file is available. Keep the app open and try saving again.');
      const lesson: Lesson = { ...this.state.lesson, uri, bytes: file.size, durationSeconds: this.state.seconds, state: this.interrupted ? 'interrupted' : 'saved' };
      await save(lesson); this.release();
      this.update({ phase: 'saved', lesson, error: '' }); await this.refresh();
    } catch (e) { this.update({ phase: 'error', error: errorText(e) }); }
    finally { this.finishing = false; }
  }
  async import(uri: string, name: string) {
    if (['permission', 'recording', 'paused', 'saving'].includes(this.state.phase)) throw new Error('Stop and save the current recording before importing.');
    const source = new File(uri);
    if (!source.exists || !source.size || source.size > 2_000_000_000) throw new Error('Choose a readable, non-empty audio file smaller than 2 GB.');
    if (Paths.availableDiskSpace < source.size + 20_000_000) throw new Error('There is not enough space to keep a local copy.');
    const id = randomUUID(), folder = new Directory(Paths.document, 'ImportedAudio'); folder.create({ idempotent: true });
    const ext = name.split('.').at(-1)?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'audio';
    const file = new File(folder, `${id}.${ext}`); await source.copy(file);
    const lesson: Lesson = { id, title: name.replace(/\.[^.]+$/, ''), uri: file.uri, createdAt: new Date().toISOString(), durationSeconds: null, bytes: file.size, state: 'saved' };
    await save(lesson); await this.refresh();
  }
  async remove(lesson: Lesson) {
    const file = new File(lesson.uri); if (file.exists) file.delete();
    const db = await database(); await db.runAsync('DELETE FROM lessons WHERE id = ?', lesson.id); await this.refresh();
  }
  private release() {
    clearInterval(this.timer);
    try { this.recorder?.release(); } catch { /* Already released by native interruption. */ }
    this.recorder = null;
  }
}
export const nativeRecorder = new NativeRecorder();
export function formatTime(seconds: number | null) {
  if (seconds === null) return 'Duration unverified';
  const s = Math.floor(seconds), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
