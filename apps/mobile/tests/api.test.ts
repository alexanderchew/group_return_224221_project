/// <reference types="node" />

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { expect, test, vi } from 'vitest';
import { NativeApi, laptopOrigin, uploadLimitError } from '../src/api';
import type { Job } from '../../../packages/contracts/consumer';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const demoCode = 'frontend-http-test-only';

async function withBackend(mode: 'keyfree' | 'replay', use: (origin: string) => Promise<void>) {
  const python = process.env.LECTURE_TEST_PYTHON || `${root}.venv/bin/python`;
  const child = spawn(python, ['apps/web/tests/backend_server.py', '--mode', mode, '--port', '0'], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  try {
    const origin = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Test backend did not start.\n' + logs)), 8000);
      const finish = (error: Error | null, address?: string) => {
        clearTimeout(timer);
        if (error) reject(error);
        else resolve(address!);
      };
      child.stdout.on('data', data => { logs += data.toString(); });
      child.stderr.on('data', data => {
        logs += data.toString();
        const match = logs.match(/Uvicorn running on (http:\/\/127\.0\.0\.1:\d+)/);
        if (match) finish(null, match[1]);
      });
      child.once('error', error => finish(error));
      child.once('exit', code => finish(new Error(`Test backend exited with ${code}.\n${logs}`)));
    });
    await use(origin);
  } finally {
    if (child.pid && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill();
      await exited;
    }
  }
}

const wav = () => {
  const frames = 16_000 * 61;
  const buffer = Buffer.alloc(44 + frames * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(16_000, 24); buffer.writeUInt32LE(32_000, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(frames * 2, 40);
  return new File([buffer], 'offline-replay-silence.wav', { type: 'audio/wav' });
};

async function terminalJob(api: NativeApi, id: string) {
  let job: Job | undefined;
  await vi.waitFor(async () => {
    job = await api.job(id);
    expect(['ready', 'partial', 'blocked', 'failed', 'canceled']).toContain(job.status);
  }, { timeout: 12_000, interval: 200 });
  return job!;
}

async function verifyProvidersDisabled(origin: string) {
  const result = await fetch(origin + '/api/v1/config', { headers: { Authorization: 'Bearer ' + demoCode } });
  expect(result.ok).toBe(true);
  expect((await result.json()).provider_configured).toEqual({ elevenlabs: false, openai: false });
}

test('accepts trusted origins and refuses to send bearer codes to insecure LAN addresses or redirects', async () => {
  expect(laptopOrigin(' https://laptop.test:8000/api/v1/ ')).toBe('https://laptop.test:8000');
  for (const unsafe of ['http://192.168.1.5:8000', 'https://user@laptop.test', 'https://laptop.test/?key=secret', 'https://laptop.test/other']) {
    expect(() => laptopOrigin(unsafe)).toThrow('trusted HTTPS');
  }
  const transport = vi.fn().mockRejectedValue(new Error('redirect'));
  const api = new NativeApi('https://laptop.test', demoCode, transport);
  await expect(api.config()).rejects.toMatchObject({ code: 'connection_unavailable' });
  expect(transport).toHaveBeenCalledWith('https://laptop.test/api/v1/config', expect.objectContaining({ credentials: 'omit', redirect: 'error' }));
  expect(transport.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer ' + demoCode);
});

test('uses the actual bearer API for upload, shared library, key-free job and deletion', async () => {
  await withBackend('keyfree', async origin => {
    const api = new NativeApi(origin, demoCode, fetch);
    const wrong = new NativeApi(origin, 'incorrect-demo-code', fetch);
    await expect(wrong.config()).rejects.toMatchObject({ status: 401 });
    await verifyProvidersDisabled(origin);
    const config = await api.config();
    expect(config.workspace_mode).toBe('shared_demo');
    expect(uploadLimitError(config, 16 * 1024 * 1024 + 1, 30)).toContain('16 MiB');
    expect(uploadLimitError(config, 1024, 36_000)).toContain('duration limit');
    expect(uploadLimitError(config, 1024, 2)).toBeNull();
    const budget = await api.budget();

    const bytes = await readFile(new URL('../../../fixtures/regressions/chrome-mediarecorder-headerless.webm', import.meta.url));
    const audio = new File([bytes], 'synthetic-recorder.webm', { type: 'audio/webm' });
    const recordedAt = '2026-11-11T01:00:00.000Z';
    const uploadKey = randomUUID();
    let drop = true;
    const lossy = new NativeApi(origin, demoCode, async (url, init) => {
      const response = await fetch(url, init);
      if (drop) { drop = false; await response.text(); throw new Error('Lost upload response'); }
      return response;
    });
    await expect(lossy.upload(audio, 'Synthetic microphone', recordedAt, uploadKey)).rejects.toMatchObject({ code: 'connection_unavailable' });
    const otherClient = new NativeApi(origin, demoCode, fetch);
    const original = (await otherClient.library()).items;
    expect(original).toHaveLength(1);
    const uploaded = await api.upload(audio, 'Synthetic microphone', recordedAt, uploadKey);
    expect(uploaded).toMatchObject({ id: original[0].id, source: 'mobile', byte_size: bytes.length, latest_job_id: null });
    expect(new Date(uploaded.recorded_at!).toISOString()).toBe(recordedAt);
    expect(uploaded.duration_seconds).toBeGreaterThan(1);
    expect((await api.library()).items).toHaveLength(1);

    const key = randomUUID();
    const started = await api.process(uploaded.id, {}, key);
    expect((await api.process(uploaded.id, {}, key)).id).toBe(started.id);
    expect(await terminalJob(api, started.id)).toMatchObject({ status: 'blocked', error: { code: 'provider_not_configured' } });
    expect((await api.recording(uploaded.id)).latest_job_id).toBe(started.id);
    await expect(api.pack(uploaded.id)).rejects.toMatchObject({ code: 'not_ready' });
    await api.remove(uploaded.id);
    await api.remove(uploaded.id); // A lost DELETE response is safely repeatable.
    expect((await otherClient.library()).items).toHaveLength(0);
    await expect(api.upload(audio, 'Synthetic microphone', recordedAt, uploadKey)).rejects.toMatchObject({ status: 410 });
    expect(await api.budget()).toEqual(budget);
  });
}, 25_000);

test('reads labeled saved output, resolves exact evidence, and retries scoring without duplicating an attempt', async () => {
  await withBackend('replay', async origin => {
    const api = new NativeApi(origin, demoCode, fetch);
    await verifyProvidersDisabled(origin);
    const budget = await api.budget();
    const recording = await api.upload(wav(), 'OFFLINE REPLAY — saved photosynthesis', undefined, randomUUID());
    expect(recording.recorded_at).toBeNull();
    const job = await api.process(recording.id, {}, randomUUID());
    expect(await terminalJob(api, job.id)).toMatchObject({ status: 'ready' });
    const pack = await api.pack(recording.id);
    expect(pack.provenance.some(item => item.provider === 'SAVED_REAL_PROVIDER_OUTPUT_OFFLINE_REPLAY')).toBe(true);
    expect(pack.notes.length).toBeGreaterThan(0);
    expect(JSON.stringify(pack.questions)).not.toContain('correct_option_id');
    const ids = pack.notes[0].points[0].evidence_segment_ids;
    const evidence = await api.transcript(recording.id, pack.transcript_revision_id, undefined, ids);
    expect(evidence.id).toBe(pack.transcript_revision_id);
    expect(evidence.segments.map(segment => segment.id).sort()).toEqual([...ids].sort());

    const body = { study_pack_id: pack.id, answers: pack.questions.map(question => ({ question_id: question.id, option_id: null })) };
    const key = randomUUID();
    let committedId = '';
    const lossy = new NativeApi(origin, demoCode, async (url, init) => {
      const response = await fetch(url, init);
      committedId = (await response.json()).id;
      throw new Error('Lost quiz response');
    });
    await expect(lossy.score(recording.id, body, key)).rejects.toMatchObject({ code: 'connection_unavailable' });
    const attempt = await api.score(recording.id, body, key);
    expect(attempt).toMatchObject({ id: committedId, correct_count: 0, unanswered_count: pack.questions.length });
    expect(attempt.results.every(result => result.selected_option_id === null && !result.is_correct && !!result.explanation)).toBe(true);
    expect(await api.attempt(attempt.id)).toEqual(attempt);
    const retake = await api.score(recording.id, {
      study_pack_id: pack.id,
      answers: attempt.results.map(result => ({ question_id: result.question_id, option_id: result.correct_option_id })),
    }, randomUUID());
    expect(retake).toMatchObject({ correct_count: pack.questions.length, unanswered_count: 0, practice_revealed: true });
    expect(retake.id).not.toBe(attempt.id);
    expect(await api.attempt(attempt.id)).toEqual(attempt);
    expect(await api.budget()).toEqual(budget);
  });
}, 25_000);
