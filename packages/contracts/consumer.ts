import { z } from 'zod';
import type { components } from './backend';
import { jobStatuses } from './job-statuses';
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
export const safeError = z.object({ code: id, message: z.string(), retryable: z.boolean(), stage: z.string().nullable() });
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
