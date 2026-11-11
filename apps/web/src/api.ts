import { z } from 'zod';
import type { components } from '@lecture-companion/contracts';
import { jobStatuses } from '../../../packages/contracts/job-statuses';
export { jobStatuses };
export type JobRequest = components['schemas']['JobRequest'];
export type QuizSubmission = components['schemas']['QuizSubmission'];

// Client consumption guards for Alex's backend, not an independent API contract.
// OpenAPI lives in fixtures/contracts; budget/quiz dict responses and cookie access
// are defined by services/api/lecture_backend/{core,app}.py.
const id = z.string().min(1);
const seconds = z.number().finite().nonnegative();
const money = z.string().regex(/^\d+(\.\d+)?$/);
export const terminalStatuses = new Set<string>(['ready', 'partial', 'blocked', 'failed', 'canceled']);
const safeError = z.object({ code: id, message: z.string(), retryable: z.boolean(), stage: z.string().nullable() });
export const configSchema = z.object({
  max_audio_bytes: z.number().int().positive(), max_duration_seconds: seconds.positive(),
  target_max_audio_bytes: z.number().int().positive(), target_max_duration_seconds: seconds.positive(),
  capacity_status: z.enum(['prototype_limited', 'full_target_verified']),
  accepted_mime_types: z.array(id).min(1), workspace_mode: z.literal('shared_demo'),
});
export const budgetSchema = z.object({
  currency: z.literal('USD'), ceiling_usd: money, settled_usd: money, reserved_usd: money,
  uncertain_usd: money, contingency_usd: money, available_usd: money,
});
export const recordingSchema = z.object({
  id, title: z.string(), source: z.enum(['mobile', 'web']), recorded_at: z.string().nullable(),
  created_at: z.string(), duration_seconds: seconds, byte_size: z.number().int().nonnegative(), mime_type: id,
  latest_job_id: id.nullable(), current_transcript_revision_id: id.nullable(), revision: z.number().int(),
}) satisfies z.ZodType<Pick<components['schemas']['RecordingOut'], 'id' | 'title' | 'source' | 'recorded_at' | 'created_at' | 'duration_seconds' | 'byte_size' | 'mime_type' | 'latest_job_id' | 'current_transcript_revision_id' | 'revision'>>;
export const librarySchema = z.object({ items: z.array(recordingSchema), next_cursor: z.string().nullable() });
export const jobSchema = z.object({
  id, recording_id: id, status: z.enum(jobStatuses),
  stage: z.enum(['validate_media', 'prepare_audio', 'transcribe', 'classify_subject', 'generate_notes', 'generate_overview', 'generate_quiz', 'validate_outputs']).nullable(),
  updated_at: z.string(), study_pack_id: id.nullable(), error: safeError.nullable(),
}) satisfies z.ZodType<Pick<components['schemas']['JobOut'], 'id' | 'recording_id' | 'status' | 'stage' | 'updated_at' | 'study_pack_id' | 'error'>>;
export const segmentSchema = z.object({ id, text: z.string(), start_seconds: seconds.nullable(), end_seconds: seconds.nullable() })
  .refine(s => (s.start_seconds === null && s.end_seconds === null) || (s.start_seconds !== null && s.end_seconds !== null && s.start_seconds <= s.end_seconds));
const evidence = z.array(id);
const point = z.object({ text: z.string(), evidence_segment_ids: evidence });
export const transcriptSchema = z.object({ id, segments: z.array(segmentSchema), next_cursor: z.string().nullable() });
export const packSchema = z.object({
  schema_version: z.literal('1.0'), id, recording_id: id, transcript_revision_id: id, created_at: z.string(), output_language: id,
  transcript_segments: z.array(segmentSchema), transcript_next_cursor: z.string().nullable(),
  classification: z.object({
    label: z.string().nullable(), source: z.enum(['custom_model', 'openai_baseline', 'unknown']),
    model_version: z.string().nullable(), score: z.number().finite().min(0).max(1).nullable(),
    fallback_reason: z.string().nullable(), custom_status: z.enum(['not_run', 'unavailable', 'accepted', 'abstained', 'failed']),
  }).refine(c => c.source === 'custom_model' ? c.custom_status === 'accepted' && c.model_version !== null : c.score === null),
  subject_override: z.object({ subject: z.string() }).nullable(),
  metadata: z.object({ title: z.string(), description: z.string(), evidence_segment_ids: evidence, topics: z.array(point) }),
  notes: z.array(z.object({ heading: z.string(), points: z.array(point) })),
  quiz_status: z.enum(['available', 'insufficient_evidence', 'failed', 'unavailable']),
  questions: z.array(z.object({ id, prompt: z.string(), options: z.array(z.object({ id, text: z.string() })).length(4).refine(options => new Set(options.map(o => o.id)).size === options.length), evidence_segment_ids: evidence })).refine(questions => new Set(questions.map(q => q.id)).size === questions.length),
  artifact_statuses: z.record(z.string(), z.enum(['ready', 'failed', 'unavailable', 'insufficient_evidence'])),
  freshness: z.enum(['current', 'outdated']), warnings: z.array(z.string()),
  provenance: z.array(z.object({ provider: z.string(), model: z.string().optional() }).passthrough()).default([]),
}).refine(p => p.quiz_status === 'available' ? p.questions.length > 0 : p.questions.length === 0);
export const attemptSchema = z.object({
  id, study_pack_id: id, correct_count: z.number().int().nonnegative(), total_count: z.number().int().positive(),
  unanswered_count: z.number().int().nonnegative(), percentage: z.number().finite().min(0).max(100), practice_revealed: z.boolean(),
  results: z.array(z.object({ question_id: id, selected_option_id: id.nullable(), correct_option_id: id, is_correct: z.boolean(), explanation: z.string(), evidence_segment_ids: evidence })),
});
export type Config = z.infer<typeof configSchema>;
export type Recording = z.infer<typeof recordingSchema>;
export type Job = z.infer<typeof jobSchema>;
export type StudyPack = z.infer<typeof packSchema>;
export type Segment = z.infer<typeof segmentSchema>;
export type Attempt = z.infer<typeof attemptSchema>;

export class ApiError extends Error {
  constructor(public code: string, message: string, public status = 0, public retryable = false) { super(message); }
}
export function connectionUrl(value: string) {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || !['http:', 'https:'].includes(url.protocol)) throw new Error('Use the laptop service address without credentials, query or fragment.');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !local) throw new Error('Use a trusted HTTPS address for the laptop, or localhost on this computer.');
  return url.href.replace(/\/$/, '').replace(/\/api\/v1$/, '');
}
function csrfToken() {
  // Issued by /operator/connect; demo access remains in its HttpOnly cookie.
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
  const mediaType = (type: string) => type.split(';', 1)[0].trim().toLowerCase();
  if (file.type && !config.accepted_mime_types.some(type => mediaType(type) === mediaType(file.type))) return 'This audio format is not currently supported by the laptop.';
  if (measuredDuration !== null && measuredDuration > config.max_duration_seconds) return 'This file exceeds the active duration limit.';
  return null; // The laptop must decode and validate content, including unknown MIME/duration.
}
