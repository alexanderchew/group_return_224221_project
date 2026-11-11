import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Text, TextInput, View } from 'react-native';
import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';
import { ApiError, terminalStatuses } from '../../../packages/contracts/consumer';
import type { Config, Job, JobRequest, Recording, StudyPack } from '../../../packages/contracts/consumer';
import { NativeApi, shortUploadLimit, uploadLimitError } from './api';
import { acknowledgeOperation, clearOperation, pendingOperation, readOperation } from './operations';
import { NativeStudy } from './NativeStudy';
import { SharedButton, styles } from './studyUi';
import { formatTime } from './recorder';
import type { Lesson } from './recorder';

const errorText = (error: unknown) => error instanceof Error ? error.message : 'The action could not finish.';
const isMissing = (error: unknown) => error instanceof ApiError && [404, 410].includes(error.status);

export function SharedLibrary({ lessons, captureActive, visible }: { lessons: Lesson[]; captureActive: boolean; visible: boolean }) {
  const [address, setAddress] = useState('');
  const [code, setCode] = useState('');
  const [connection, setConnection] = useState<{ api: NativeApi; config: Config } | null>(null);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const connectGuard = useRef(false);

  async function connect() {
    if (connectGuard.current) return;
    connectGuard.current = true;
    setConnecting(true);
    setError('');
    try {
      const api = new NativeApi(address, code, fetch);
      const config = await api.config();
      setConnection({ api, config });
      setCode('');
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      connectGuard.current = false;
      setConnecting(false);
    }
  }

  return <View style={styles.panel}>
    <Text style={styles.heading}>Shared study library</Text>
    {connection ? <ConnectedLibrary api={connection.api} config={connection.config} lessons={lessons} captureActive={captureActive} visible={visible} disconnect={() => setConnection(null)} /> :
      <>
        <Text style={styles.copy}>Enter Alex’s laptop address and the demo connection code shown in its terminal. Audio on this phone is available offline.</Text>
        <TextInput accessibilityLabel="Laptop service address" placeholder="https://laptop.example" placeholderTextColor="#65736e" style={styles.input} keyboardType="url" autoCapitalize="none" autoCorrect={false} editable={!connecting} value={address} onChangeText={setAddress} />
        <TextInput accessibilityLabel="Demo connection code" placeholder="Demo connection code" placeholderTextColor="#65736e" style={styles.input} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!connecting} value={code} onChangeText={setCode} />
        <SharedButton label={connecting ? 'Connecting…' : 'Connect laptop'} disabled={connecting} onPress={() => void connect()} />
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      </>}
  </View>;
}

function ConnectedLibrary({ api, config, lessons, captureActive, visible, disconnect }: { api: NativeApi; config: Config; lessons: Lesson[]; captureActive: boolean; visible: boolean; disconnect: () => void }) {
  const [items, setItems] = useState<Recording[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [budget, setBudget] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const guard = useRef(false);

  const refresh = useCallback(async (next?: string) => {
    const [page, balance] = await Promise.all([api.library(next), api.budget()]);
    setItems(previous => next ? [...new Map([...previous, ...page.items].map(item => [item.id, item])).values()] : page.items);
    setCursor(page.next_cursor);
    setBudget(`$${balance.available_usd} available of $${balance.ceiling_usd}`);
  }, [api]);

  const run = useCallback(async (work: () => Promise<void>) => {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError('');
    try { await work(); }
    catch (failure) { setError(errorText(failure)); }
    finally { guard.current = false; setBusy(false); }
  }, []);

  useEffect(() => { void run(refresh); }, [refresh, run]);

  async function upload(lesson: Lesson) {
    const scope = JSON.stringify([api.origin, 'upload', lesson.id]);
    const saved = await readOperation<{ title: string; recordedAt?: string }>(scope);
    if (saved && 'id' in saved) {
      try {
        await api.recording(saved.id);
        setSelected(saved.id);
        return;
      } catch (failure) {
        if (!isMissing(failure)) throw failure;
        await clearOperation(scope);
        throw new Error('The shared copy was removed. You can upload the local audio again.');
      }
    }
    const file = new File(lesson.uri);
    const problem = uploadLimitError(await api.config(), file.exists ? file.size : 0, lesson.durationSeconds);
    if (problem) throw new Error(problem);
    const pending = await pendingOperation(scope, { title: lesson.title, recordedAt: lesson.recordedAt });
    try {
      const result = await api.upload(file, pending.body.title, pending.body.recordedAt, pending.key);
      await acknowledgeOperation(scope, result.id);
      setSelected(result.id);
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 410) await clearOperation(scope);
      throw failure;
    }
  }

  return <>
    <Text style={styles.copy}>Everyone with demo access can see uploaded recordings. Uploading and processing are separate actions.</Text>
    {!!budget && <Text style={styles.copy}>Demo allowance · {budget}</Text>}
    <Text style={styles.copy}>Laptop intake · {formatTime(config.max_duration_seconds)} · {Math.floor(config.max_audio_bytes / 1024 / 1024)} MiB</Text>
    {config.capacity_status === 'prototype_limited' && <Text style={styles.copy}>The laptop is using prototype limits. This phone supports uploads up to {shortUploadLimit / 1024 / 1024} MiB.</Text>}
    <SharedButton label="Disconnect laptop" disabled={busy} onPress={disconnect} />
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {selected ? <RecordingStudy key={selected} api={api} recordingId={selected} visible={visible} onClose={() => {
      setSelected(null);
      void run(refresh);
    }} /> :
      <>
        <SharedButton label={busy ? 'Working…' : 'Refresh shared recordings'} disabled={busy} onPress={() => void run(refresh)} />
        {items.map(item => <SharedButton key={item.id} label={`${item.title} · ${formatTime(item.duration_seconds)}`} disabled={busy} onPress={() => setSelected(item.id)} />)}
        {!items.length && !busy && !error && <Text style={styles.copy}>No shared recordings yet.</Text>}
        {cursor && <SharedButton label="Load more shared recordings" disabled={busy} onPress={() => void run(() => refresh(cursor))} />}
        <Text style={styles.subheading}>Upload from this phone</Text>
        {lessons.filter(lesson => lesson.available).map(lesson => <SharedButton key={lesson.id} label={`Use ${lesson.title} for study`} disabled={busy || captureActive} onPress={() => {
          Alert.alert('Open or upload shared copy?', 'The existing shared copy will open if available. Otherwise, continuing confirms you can share this audio with everyone who has demo access.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', onPress: () => void run(() => upload(lesson)) },
          ]);
        }} />)}
      </>}
  </>;
}

function RecordingStudy({ api, recordingId, visible, onClose }: { api: NativeApi; recordingId: string; visible: boolean; onClose: () => void }) {
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [pack, setPack] = useState<StudyPack | null>(null);
  const [pending, setPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const guard = useRef(false);
  const scope = JSON.stringify([api.origin, 'process', recordingId]);
  const deleteScope = JSON.stringify([api.origin, 'delete', recordingId]);

  const refresh = useCallback(async () => {
    setDeletePending(!!await readOperation<null>(deleteScope));
    const current = await api.recording(recordingId);
    const [nextJob, savedPack, operation] = await Promise.all([
      current.latest_job_id ? api.job(current.latest_job_id) : Promise.resolve(null),
      api.pack(recordingId).catch(failure => {
        if (failure instanceof ApiError && failure.code === 'not_ready') return null;
        throw failure;
      }),
      readOperation<JobRequest>(scope),
    ]);
    setRecording(current);
    setJob(nextJob);
    setPack(savedPack);
    setPending(!!operation && 'key' in operation);
  }, [api, recordingId, scope, deleteScope]);

  const run = useCallback(async (work: () => Promise<void>) => {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError('');
    try { await work(); }
    catch (failure) {
      if (isMissing(failure)) { setRecording(null); setPack(null); setJob(null); }
      setError(errorText(failure));
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }, []);

  useEffect(() => { void run(refresh); }, [refresh, run]);

  const processing = job !== null && !terminalStatuses.has(job.status);
  const processingId = processing ? job.id : null;
  useEffect(() => {
    if (!visible || !foreground || !processingId || busy || error || deletePending) return;
    const timer = setTimeout(() => void run(refresh), 2500);
    return () => clearTimeout(timer);
  }, [visible, foreground, processingId, busy, error, deletePending, refresh, run]);

  async function remove() {
    await pendingOperation(deleteScope, null);
    setDeletePending(true);
    await api.remove(recordingId);
    await clearOperation(deleteScope);
    onClose();
  }

  async function process() {
    const body: JobRequest = job && ['blocked', 'failed', 'partial'].includes(job.status) ? { retry_of_job_id: job.id } : {};
    const operation = await pendingOperation(scope, body);
    setPending(true);
    const started = await api.process(recordingId, operation.body, operation.key);
    await clearOperation(scope);
    setPending(false);
    setJob(started);
    await refresh();
  }

  return <View style={styles.section}>
    <SharedButton label="Back to shared recordings" disabled={busy} onPress={onClose} />
    <SharedButton label="Refresh recording" disabled={busy} onPress={() => void run(refresh)} />
    {recording && <>
      <Text style={styles.subheading}>{recording.title}</Text>
      <Text style={styles.copy}>Saved in the shared library · {formatTime(recording.duration_seconds)}</Text>
      {job && <Text accessibilityLiveRegion="polite" style={styles.copy}>Processing · {job.status}{job.stage ? ` · ${job.stage.replaceAll('_', ' ')}` : ''}{job.error ? `\n${job.error.message}` : ''}</Text>}
      {!deletePending && (pending || !processing && (!pack || job?.status === 'partial')) && <SharedButton label={pending ? 'Retry same processing request' : 'Process lecture'} disabled={busy} onPress={() => {
        Alert.alert('Process this shared recording?', 'When providers are configured, processing sends audio to ElevenLabs and transcript text to the configured language model. It can use the shared demo allowance.', [
          { text: 'Cancel', style: 'cancel' }, { text: 'Process lecture', onPress: () => void run(process) },
        ]);
      }} />}
      {!deletePending && pack && <NativeStudy key={pack.id} api={api} pack={pack} />}
    </>}
    {(recording || deletePending) && <SharedButton label={deletePending ? 'Retry shared deletion' : 'Delete uploaded lecture'} disabled={busy} onPress={() => {
      Alert.alert('Delete the shared recording?', 'This removes the uploaded audio and its study data for everyone with demo access. Any audio saved on this phone stays here.', [
        { text: 'Cancel', style: 'cancel' }, { text: 'Delete shared copy', style: 'destructive', onPress: () => void run(remove) },
      ]);
    }} />}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </View>;
}
