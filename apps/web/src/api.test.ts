import { afterEach, describe, expect, it, vi } from 'vitest';
import { Api, ApiError, configSchema, connectionUrl, duration, jobSchema, packSchema, validateFile } from './api';
import { operation, StorageFailure } from './storage';
import { pack, question } from '../tests/fixtures';

const store = new Map<string, string>();
vi.stubGlobal('localStorage', { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value), removeItem: (key: string) => store.delete(key) });
vi.stubGlobal('document', { cookie: 'csrftoken=test-csrf' });
afterEach(() => { store.clear(); vi.restoreAllMocks(); });

describe('safe API boundary', () => {
  it('sends cookies, CSRF and the original operation key without provider credentials', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ max_audio_bytes: 10, max_duration_seconds: 60, target_max_audio_bytes: 2000000000, target_max_duration_seconds: 36000, capacity_status: 'prototype_limited', accepted_mime_types: ['audio/wav'], workspace_mode: 'shared_demo' })));
    const api = new Api('https://laptop.test', fetcher);
    await api.json('/config', {}, 'original-key', configSchema);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('https://laptop.test/api/v1/config');
    expect(init?.credentials).toBe('include');
    expect(new Headers(init?.headers).get('Idempotency-Key')).toBe('original-key');
    expect(new Headers(init?.headers).get('X-CSRFToken')).toBe('test-csrf');
    expect(new Headers(init?.headers).has('Authorization')).toBe(false);
  });
  it('rejects an incompatible response instead of showing invented content', async () => {
    const api = new Api('', vi.fn().mockResolvedValue(new Response('{}')));
    await expect(api.request('/config', configSchema)).rejects.toMatchObject({ code: 'contract_mismatch' });
  });
  it('uses safe server errors and does not render raw HTML errors', async () => {
    const api = new Api('', vi.fn().mockResolvedValue(new Response('<h1>private trace</h1>', { status: 503 })));
    await expect(api.request('/config', configSchema)).rejects.toMatchObject({ code: 'request_failed', status: 503 });
    try { await api.request('/config', configSchema); } catch (e) { expect((e as ApiError).message).not.toContain('private trace'); }
  });
  it('honors failed/blocked jobs returned with HTTP 200', async () => {
    const job = { id: 'j1', recording_id: 'r1', status: 'blocked', stage: 'transcribe', updated_at: '2026-11-04T00:00:00Z', study_pack_id: null, error: { code: 'budget_exceeded', message: 'Allowance reached. Audio is saved.', retryable: false, stage: 'transcribe' } };
    const api = new Api('', vi.fn().mockResolvedValue(new Response(JSON.stringify(job))));
    expect((await api.request('/jobs/j1', jobSchema)).status).toBe('blocked');
  });
  it('does not accept a different job status vocabulary', () => {
    expect(jobSchema.safeParse({ id: 'j', recording_id: 'r', status: 'uploading', stage: null, updated_at: '', study_pack_id: null, error: null }).success).toBe(false);
  });
  it('blocks unsafe connection addresses', () => {
    expect(connectionUrl('https://laptop.test/api/v1/')).toBe('https://laptop.test');
    expect(connectionUrl('http://localhost:8000')).toBe('http://localhost:8000');
    for (const url of ['http://192.168.1.1', 'https://user:secret@laptop.test', 'https://laptop.test?key=secret', 'javascript:alert(1)']) expect(() => connectionUrl(url)).toThrow();
  });
});
describe('retry integrity', () => {
  it('retains the exact key and frozen payload after reload or changed draft', () => {
    const first = operation('attempt', { answers: ['b', null] });
    const retry = operation('attempt', { answers: ['a', 'd'] });
    expect(retry).toEqual(first);
  });
  it('refuses to send new work if the retry key cannot be persisted', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => operation('attempt', {})).toThrow(StorageFailure);
  });
});
describe('media presentation', () => {
  it('uses source seconds, including ten-hour durations and unknown timing', () => {
    expect(duration(36000)).toBe('10:00:00'); expect(duration(61.9)).toBe('1:01'); expect(duration(null)).toBe('Duration not verified');
  });
  it('checks independent size/format/duration limits but leaves unknown metadata to server decoding', () => {
    const config = configSchema.parse({ max_audio_bytes: 100, max_duration_seconds: 60, target_max_audio_bytes: 2000000000, target_max_duration_seconds: 36000, capacity_status: 'prototype_limited', accepted_mime_types: ['audio/wav'], workspace_mode: 'shared_demo' });
    expect(validateFile(new File([], 'empty.wav'), config, null)).toContain('empty');
    expect(validateFile(new File(['a'.repeat(101)], 'big.wav', { type: 'audio/wav' }), config, 1)).toContain('size');
    expect(validateFile(new File(['a'], 'bad.exe', { type: 'application/octet-stream' }), config, 1)).toContain('format');
    expect(validateFile(new File(['a'], 'long.wav', { type: 'audio/wav' }), config, 61)).toContain('duration');
    expect(validateFile(new File(['a'], 'unknown'), config, null)).toBeNull();
  });
  it('does not allow an empty quiz to be answerable', () => {
    expect(packSchema.safeParse(pack).success).toBe(true);
    expect(packSchema.safeParse({ ...pack, quiz_status: 'available', questions: [] }).success).toBe(false);
    expect(packSchema.safeParse({ ...pack, questions: [question, question] }).success).toBe(false);
    expect(packSchema.safeParse({ ...pack, classification: { ...pack.classification, score: 0.9 } }).success).toBe(false);
  });
});
