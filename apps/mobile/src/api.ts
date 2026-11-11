import {
  ApiError, attemptSchema, budgetSchema, configSchema, jobSchema, librarySchema,
  packSchema, recordingSchema, safeError, transcriptSchema,
} from '../../../packages/contracts/consumer';
import type { Config, JobRequest, QuizSubmission } from '../../../packages/contracts/consumer';
import { z } from 'zod';
import type { ZodType } from 'zod';

export const shortUploadLimit = 16 * 1024 * 1024;

export function laptopOrigin(address: string) {
  let url: URL;
  try { url = new URL(address.trim()); }
  catch { throw new Error('Enter the laptop address, including https://.'); }
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) ||
      url.username || url.password || url.search || url.hash ||
      !['/', '/api/v1', '/api/v1/'].includes(url.pathname)) {
    throw new Error('Use the laptop’s trusted HTTPS address without a path or credentials. HTTP is supported only for local testing.');
  }
  return url.origin;
}

export function uploadLimitError(config: Config, bytes: number, seconds: number | null) {
  if (bytes <= 0) return 'The local audio is missing or empty.';
  if (bytes > config.max_audio_bytes) return 'This recording exceeds the laptop’s active upload size limit.';
  if (seconds !== null && seconds > config.max_duration_seconds) return 'This recording exceeds the laptop’s active duration limit.';
  if (bytes > shortUploadLimit) return 'This version supports short uploads up to 16 MiB. Your audio stays on this phone.';
  return null;
}

type Transport = (url: string, init: RequestInit) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;
const recordingPath = (id: string) => '/recordings/' + encodeURIComponent(id);

export class NativeApi {
  readonly origin: string;
  private readonly code: string;

  constructor(address: string, code: string, private readonly transport: Transport) {
    this.origin = laptopOrigin(address);
    this.code = code.trim();
    if (!this.code || !/^[\x21-\x7e]+$/.test(this.code)) throw new Error('Enter the demo connection code from Alex’s laptop.');
  }

  private async request<T>(path: string, schema: ZodType<T>, options: RequestInit = {}, timeout = 20_000): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const headers = new Headers(options.headers);
      headers.set('Authorization', 'Bearer ' + this.code);
      const response = await this.transport(this.origin + '/api/v1' + path, {
        ...options, headers, credentials: 'omit', redirect: 'error', signal: controller.signal,
      });
      const body: unknown = response.status === 204 ? undefined : await response.json().catch(() => null);
      if (!response.ok) {
        const parsed = safeError.safeParse((body as { error?: unknown } | null)?.error);
        if (response.status === 401) throw new ApiError('access_required', 'Demo access expired or the code is incorrect. Reconnect in Laptop setup.', 401);
        if (parsed.success) throw new ApiError(parsed.data.code, parsed.data.message, response.status, parsed.data.retryable);
        throw new ApiError('request_failed', 'The laptop could not complete the request.', response.status, response.status >= 500);
      }
      const parsed = schema.safeParse(body);
      if (!parsed.success) throw new ApiError('contract_mismatch', 'The laptop returned an incompatible response.');
      return parsed.data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('connection_unavailable', 'The laptop could not be reached. Reconnect and retry the same action.', 0, true);
    } finally {
      clearTimeout(timer);
    }
  }

  private post<T>(path: string, schema: ZodType<T>, key: string, body: JobRequest | QuizSubmission) {
    return this.request(path, schema, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(body),
    });
  }

  config() { return this.request('/config', configSchema); }
  budget() { return this.request('/budget', budgetSchema); }
  library(cursor?: string) {
    return this.request('/recordings' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''), librarySchema);
  }
  recording(id: string) { return this.request(recordingPath(id), recordingSchema); }
  remove(id: string) { return this.request(recordingPath(id), z.undefined(), { method: 'DELETE' }); }
  upload(file: Blob, title: string, recordedAt: string | undefined, key: string) {
    const form = new FormData();
    form.append('file', file);
    form.append('source', 'mobile');
    form.append('title', Array.from(title.trim() || 'Untitled lesson').slice(0, 200).join(''));
    if (recordedAt) form.append('recorded_at', recordedAt);
    return this.request('/recordings', recordingSchema, {
      method: 'POST', headers: { 'Idempotency-Key': key }, body: form,
    }, 120_000);
  }
  job(id: string) { return this.request('/jobs/' + encodeURIComponent(id), jobSchema); }
  process(id: string, body: JobRequest, key: string) {
    return this.post(recordingPath(id) + '/jobs', jobSchema, key, body);
  }
  pack(id: string) { return this.request(recordingPath(id) + '/study-pack', packSchema); }
  transcript(id: string, revision: string, cursor?: string, evidence?: string[]) {
    const query = evidence ? '?segment_ids=' + encodeURIComponent(evidence.join(',')) :
      cursor ? '?cursor=' + encodeURIComponent(cursor) : '';
    return this.request(recordingPath(id) + '/transcripts/' + encodeURIComponent(revision) + query, transcriptSchema);
  }
  score(id: string, body: QuizSubmission, key: string) {
    return this.post(recordingPath(id) + '/quiz-attempts', attemptSchema, key, body);
  }
  attempt(id: string) { return this.request('/quiz-attempts/' + encodeURIComponent(id), attemptSchema); }
}
