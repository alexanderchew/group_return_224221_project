import { z } from 'zod';
import { ApiError, safeError } from '../../../packages/contracts/consumer';
import type { Config } from '../../../packages/contracts/consumer';
export * from '../../../packages/contracts/consumer';

export function connectionUrl(value: string) {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || !['http:', 'https:'].includes(url.protocol)) throw new Error('Use the laptop service address without credentials, query or fragment.');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !local) throw new Error('Use a trusted HTTPS address for the laptop, or localhost on this computer.');
  return url.href.replace(/\/$/, '').replace(/\/api\/v1$/, '');
}
function csrfToken() {
  // The readable cookie is paired with the backend's HttpOnly demo-access cookie.
  // This is a CSRF token, never a provider key.
  const cookie = document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('lecture_csrf='));
  return cookie ? decodeURIComponent(cookie.slice('lecture_csrf='.length)) : '';
}
export class Api {
  constructor(public base: string, private fetcher: typeof fetch = (...args) => fetch(...args)) {}
  async request<T>(path: string, schema: z.ZodType<T>, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    const mutation = !['GET', 'HEAD', 'OPTIONS'].includes((options.method ?? 'GET').toUpperCase());
    if (mutation) {
      const token = csrfToken();
      if (token) headers.set('X-CSRF-Token', token);
    }
    let response: Response;
    try {
      response = await this.fetcher(`${this.base}/api/v1${path}`, {
        ...options, headers, credentials: 'include', cache: 'no-store',
        signal: options.signal ?? AbortSignal.timeout(path === '/recordings' && options.method === 'POST' ? 120_000 : 20_000),
      });
    } catch {
      throw new ApiError('connection_unavailable', 'The laptop could not be reached. Your selection and pending action are kept; reconnect to retry.', 0, true);
    }
    if (!response.ok) {
      const envelope = z.object({ error: safeError }).safeParse(await response.json().catch(() => null));
      if (envelope.success) throw new ApiError(envelope.data.error.code, envelope.data.error.message, response.status, envelope.data.error.retryable);
      throw new ApiError('request_failed', response.status === 401 || response.status === 403 ? 'Demo access is unavailable. Ask the operator to provision this browser, then reconnect.' : 'The laptop could not complete this action. Reconnect and try again.', response.status, response.status >= 500);
    }
    const parsed = schema.safeParse(response.status === 204 ? undefined : await response.json().catch(() => null));
    if (!parsed.success) throw new ApiError('contract_mismatch', 'The laptop response is not compatible with this client yet. Ask Alex and Ben to check the API integration.');
    return parsed.data;
  }
  json<T>(path: string, body: unknown, key: string, schema: z.ZodType<T>) {
    return this.request(path, schema, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(body) });
  }
  audio(id: string) { return `${this.base}/api/v1/recordings/${encodeURIComponent(id)}/audio`; }
}
export function message(error: unknown) { return error instanceof Error ? error.message : 'The action could not finish. Please try again.'; }
export function duration(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Duration not verified';
  const s = Math.floor(value), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`;
}
export function validateFile(file: File, config: Config, measuredDuration: number | null) {
  if (!file.size) return 'This file is empty. Choose another audio file.';
  if (file.size > config.max_audio_bytes) return 'This file exceeds the active upload size limit. Choose a smaller file.';
  const mediaType = (value: string) => value.split(';', 1)[0].trim().toLowerCase();
  if (file.type && !config.accepted_mime_types.some(type => mediaType(type) === mediaType(file.type))) return 'This audio format is not currently supported by the laptop.';
  if (measuredDuration !== null && measuredDuration > config.max_duration_seconds) return 'This file exceeds the active duration limit.';
  return null; // The laptop must decode and validate content, including unknown MIME/duration.
}
