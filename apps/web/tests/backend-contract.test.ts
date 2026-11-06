import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Api, attemptSchema, budgetSchema, configSchema, jobSchema, validateFile } from '../src/api';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const python = process.env.LECTURE_TEST_PYTHON ?? `${root}.venv/bin/python`;
const script = fileURLToPath(new URL('./backend_contract.py', import.meta.url));
function backend(headers: Record<string, string> = {}) {
  return JSON.parse(execFileSync(python, [script], {
    input: JSON.stringify({ headers }), encoding: 'utf8',
    env: { ...process.env, ELEVENLABS_API_KEY: '', OPENAI_API_KEY: '', LECTURE_MODEL_DIR: '' },
  }));
}
const actual = backend();
afterEach(() => vi.unstubAllGlobals());

describe('implemented backend contract, without paid services', () => {
  it('displays the actual budget wire fields', async () => {
    const api = new Api('', vi.fn().mockResolvedValue(new Response(JSON.stringify(actual.budget))));
    const budget = await api.request('/budget', budgetSchema);
    expect(budget.ceiling_usd).toBe('20.000000');
    expect(budget.available_usd).toBe('18.000000');
  });
  it('accepts an actual server-scored result and its correctness field', async () => {
    const api = new Api('', vi.fn().mockResolvedValue(new Response(JSON.stringify(actual.attempt))));
    const attempt = await api.request(`/quiz-attempts/${actual.attempt.id}`, attemptSchema);
    expect(attempt.percentage).toBe(100);
    expect(attempt.results[0].is_correct).toBe(true);
  });
  it('accepts the recorder WebM/Opus type advertised as a supported container', () => {
    const file = new File(['recorded bytes'], 'lecture.webm', { type: 'audio/webm;codecs=opus' });
    expect(validateFile(file, configSchema.parse(actual.config), 10)).toBeNull();
  });
  it('authorizes a real cookie-authenticated mutation using the adapter headers', async () => {
    vi.stubGlobal('document', { cookie: 'unrelated=ignored; lecture_csrf=frontend-contract-csrf' });
    const api = new Api('', async (_url, init) => {
      const response = backend(Object.fromEntries(new Headers(init?.headers)));
      return new Response(JSON.stringify(response.mutation.body), { status: response.mutation.status });
    });
    expect((await api.json('/recordings/test/jobs', {}, 'frontend-contract-operation', jobSchema)).status).toBe('ready');
  });
  it('still rejects a mutation without the required CSRF header', () => {
    expect(actual.mutation.status).toBe(403);
    expect(actual.mutation.body.error.code).toBe('csrf_required');
  });
});
