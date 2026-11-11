// Synthetic contract test responses ONLY. Never imported into the shipped app.
export const config = { max_audio_bytes: 134217728, max_duration_seconds: 3600, target_max_audio_bytes: 2000000000, target_max_duration_seconds: 36000, capacity_status: 'prototype_limited', accepted_mime_types: ['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/webm'], workspace_mode: 'shared_demo' };
// Same wire fields/decimal precision as Store.budget(); no production data or paid calls.
export const budget = { currency: 'USD', ceiling_usd: '20.000000', settled_usd: '1.000000', reserved_usd: '0.500000', uncertain_usd: '0.250000', contingency_usd: '2.000000', available_usd: '16.250000', warning: false, accounting_basis: 'conservative_estimates_not_vendor_invoice' };
export const recording = { id: 'test-recording', title: 'Particles and changes of state', source: 'web', recorded_at: null, created_at: '2026-11-04T10:00:00Z', duration_seconds: 125, byte_size: 40000, mime_type: 'audio/wav', latest_job_id: null, current_transcript_revision_id: null, revision: 1 };
export const segment = { id: 'segment-1', text: 'The particles in a solid vibrate around fixed positions. 固体的粒子在固定位置振动。', start_seconds: 12, end_seconds: 20 };
export const question = { id: 'question-1', prompt: 'How do particles move in a solid?', options: [{ id: 'a', text: 'They vibrate around fixed positions.' }, { id: 'b', text: 'They move freely throughout the container.' }, { id: 'c', text: 'They stop moving completely.' }, { id: 'd', text: 'They only move at the surface.' }], evidence_segment_ids: [segment.id] };
export const pack = {
  schema_version: '1.0', id: 'test-pack', recording_id: recording.id, transcript_revision_id: 'revision-1', created_at: '2026-11-04T10:05:00Z', output_language: 'English',
  transcript_segments: [segment], transcript_next_cursor: 'page-2',
  classification: { label: 'Chemistry', source: 'openai_baseline', model_version: null, score: null, fallback_reason: 'custom_model_not_connected', custom_status: 'unavailable' }, subject_override: null,
  metadata: { title: recording.title, description: 'A lesson on particle arrangement and movement in solids.', evidence_segment_ids: [segment.id], topics: [{ text: 'Particle movement in solids', evidence_segment_ids: [segment.id] }] },
  notes: [{ heading: 'Solids: structure and movement', points: [{ text: 'Particles vibrate around fixed positions. Their arrangement stays fixed while the particles keep moving.', evidence_segment_ids: [segment.id] }] }],
  quiz_status: 'available', questions: [question], artifact_statuses: { notes: 'ready', overview: 'ready', quiz: 'ready' }, freshness: 'current', warnings: [],
};
export const job = { id: 'test-job', recording_id: recording.id, status: 'ready', stage: 'validate_outputs', updated_at: '2026-11-04T10:05:00Z', study_pack_id: pack.id, error: null };
export const attempt = { id: 'test-attempt', study_pack_id: pack.id, correct_count: 1, total_count: 1, unanswered_count: 0, percentage: 100, practice_revealed: false, results: [{ question_id: question.id, selected_option_id: 'a', correct_option_id: 'a', is_correct: true, explanation: 'The lecture states that particles in a solid vibrate around fixed positions.', evidence_segment_ids: [segment.id] }] };
