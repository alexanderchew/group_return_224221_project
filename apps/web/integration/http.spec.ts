// Real browser -> Vite proxy -> real backend/worker/SQLite/FFmpeg.
// No simulated API responses; generation is an explicitly labeled offline replay.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import saved from '../../../fixtures/regressions/photosynthesis-generated-v1.json' with { type: 'json' };

async function provision(page: Page, port: number) {
  const origin = `http://127.0.0.1:${port}`;
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.origin === origin || ['blob:', 'data:'].includes(url.protocol) ? route.continue() : route.abort('blockedbyclient');
  });
  await page.goto(`${origin}/operator/connect`);
  await page.getByLabel('Demo connection code').fill('frontend-http-test-only');
  const connected = page.waitForResponse(r => r.url().endsWith('/operator/connect') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  const response = await connected;
  expect(response.status()).toBe(303);
  await expect.poll(async () => (await page.context().cookies()).some(c => c.name === 'lecture_demo')).toBe(true);
  // /docs is deliberately not proxied: no Swagger CDN requests in offline checks.
  await page.goto(origin);
  await page.getByRole('button', { name: 'Connect laptop', exact: true }).click();
  await page.getByRole('button', { name: 'This page’s address' }).click();
  await expect(page.getByLabel('Laptop service address')).toHaveValue(origin);
  await expect(page.getByRole('link', { name: 'Set up browser access' })).toHaveAttribute('href', `${origin}/operator/connect`);
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your lecture library' })).toBeVisible();
  await expect(page.locator('.budget')).toContainText('Settled $0.000000');
}

function silentWav(seconds: number) {
  const bytes = seconds * 16_000 * 2, result = Buffer.alloc(44 + bytes);
  result.write('RIFF', 0); result.writeUInt32LE(36 + bytes, 4); result.write('WAVEfmt ', 8);
  result.writeUInt32LE(16, 16); result.writeUInt16LE(1, 20); result.writeUInt16LE(1, 22);
  result.writeUInt32LE(16_000, 24); result.writeUInt32LE(32_000, 28); result.writeUInt16LE(2, 32); result.writeUInt16LE(16, 34);
  result.write('data', 36); result.writeUInt32LE(bytes, 40);
  return result;
}

test('real HTTP: access, WAV upload, saved-output job, sources, server scoring/retry/reload and shared deletion', async ({ page }) => {
  const denied = await page.request.get('/api/v1/config');
  expect(denied.status()).toBe(401);
  await provision(page, 4174);
  const cookies = await page.context().cookies();
  expect(cookies.find(c => c.name === 'lecture_demo')?.httpOnly).toBe(true);
  expect(cookies.find(c => c.name === 'lecture_csrf')?.httpOnly).toBe(false);
  const budgetBefore = await (await page.request.get('/api/v1/budget')).json();
  const noCsrf = await page.request.post('/api/v1/recordings/unknown/jobs', { data: {}, headers: { 'Idempotency-Key': 'missing-csrf-test' } });
  expect(noCsrf.status()).toBe(403);
  await page.getByLabel('Browse audio').setInputFiles({ name: 'OFFLINE-REPLAY-silent-placeholder.wav', mimeType: 'audio/wav', buffer: silentWav(61) });
  await page.getByLabel('Lecture title').fill('OFFLINE REPLAY — saved photosynthesis example');
  await page.getByLabel('I can share this recording').check();
  const upload = page.waitForResponse(r => r.url().endsWith('/api/v1/recordings') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Upload to shared library' }).click();
  const response = await upload, recording = await response.json();
  expect(response.status()).toBe(201); expect(recording.duration_seconds).toBe(61);
  expect(recording.latest_job_id).toBeNull();
  await page.getByLabel('I agree to this processing.').check();
  await page.getByRole('button', { name: 'Process lecture', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Lecture details ready', { timeout: 12_000 });
  await expect(page.getByRole('heading', { name: 'Your study workspace' })).toBeVisible();
  await expect(page.getByText('Previously generated example / offline test output', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'View lecture source' }).first().click();
  await expect(page.getByRole('complementary', { name: 'Supporting lecture text' })).toContainText('Photosynthesis');
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Overview' })).not.toContainText('seg_');
  await page.getByRole('button', { name: 'Quiz', exact: true }).click();
  const publicPack = await (await page.request.get(`/api/v1/recordings/${recording.id}/study-pack`)).json();
  expect(JSON.stringify(publicPack)).not.toContain('correct_option_id');
  expect(publicPack.provenance[0].provider).toBe('SAVED_REAL_PROVIDER_OUTPUT_OFFLINE_REPLAY');
  const keys: string[] = [], attemptIds: string[] = [];
  await page.route('**/api/v1/recordings/*/quiz-attempts', async route => {
    keys.push(route.request().headers()['idempotency-key']);
    const result = await route.fetch(); // Real server records the attempt before connection loss.
    expect(result.status()).toBe(201);
    attemptIds.push((await result.json()).id);
    if (keys.length === 1) return route.abort('failed');
    return route.fulfill({ response: result });
  });
  for (const question of saved.generated.questions) {
    const correct = question.options.find(option => option.id === question.correct_option_id)!;
    await page.getByLabel(correct.text, { exact: true }).check();
  }
  await page.getByRole('button', { name: 'Submit answers', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry same submission' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Study library', exact: true }).click();
  await page.getByRole('button', { name: 'Quiz', exact: true }).click();
  await page.getByRole('button', { name: 'Retry same submission' }).click();
  await expect(page.getByRole('heading', { name: '4 of 4 correct' })).toBeVisible();
  expect(keys).toHaveLength(2); expect(keys[0]).toBe(keys[1]); expect(attemptIds[0]).toBe(attemptIds[1]);
  await page.reload(); await page.getByRole('button', { name: 'Study library', exact: true }).click();
  await page.getByRole('button', { name: 'Quiz', exact: true }).click();
  await expect(page.getByRole('heading', { name: '4 of 4 correct' })).toBeVisible();
  await page.screenshot({ path: 'integration-results/http-offline-replay-feedback.png', fullPage: true });
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete uploaded lecture' }).click();
  await expect(page.getByRole('heading', { name: 'A lesson worth revisiting.' })).toBeVisible();
  expect((await page.request.get(`/api/v1/recordings/${recording.id}`)).status()).toBe(404);
  expect(await (await page.request.get('/api/v1/budget')).json()).toEqual(budgetBefore);
});

test('real HTTP: freshly captured WebM decodes, key-free processing blocks safely, cancellation starts new work', async ({ page }) => {
  await provision(page, 4175);
  await page.getByRole('button', { name: 'Record', exact: true }).click();
  await page.getByLabel('Recording title').fill('SYNTHETIC MICROPHONE — real HTTP codec check');
  await page.getByRole('button', { name: 'Start recording', exact: true }).click();
  await expect.poll(() => page.locator('.capture-clock').getAttribute('aria-label')).not.toBe('0 seconds recorded');
  await page.getByRole('button', { name: 'Stop & save' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved on this device' })).toBeVisible();
  await page.getByRole('button', { name: /SYNTHETIC MICROPHONE.*Local/ }).click();
  await page.getByRole('button', { name: 'Use for study ↗' }).click();
  await page.getByLabel('I can share this recording').check();
  const upload = page.waitForResponse(r => r.url().endsWith('/api/v1/recordings') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Upload to shared library' }).click();
  const result = await upload, recording = await result.json();
  const form = await new Response(new Uint8Array(result.request().postDataBuffer()!), { headers: { 'Content-Type': result.request().headers()['content-type'] } }).formData();
  await mkdir('integration-results', { recursive: true });
  await writeFile('integration-results/synthetic-chrome-headerless.webm', new Uint8Array(await (form.get('file') as File).arrayBuffer()));
  expect(result.status()).toBe(201); expect(recording.mime_type).toBe('audio/webm'); expect(recording.duration_seconds).toBeGreaterThan(0);
  await page.getByLabel('I agree to this processing.').check();
  await page.getByRole('button', { name: 'Process lecture', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Processing is blocked');
  await expect(page.getByLabel('Original lecture audio')).toBeVisible();
  const state = await (await page.request.get(`http://127.0.0.1:4175/api/v1/recordings/${recording.id}`)).json();
  const token = (await page.context().cookies()).find(c => c.name === 'lecture_csrf')!.value;
  const canceled = await page.request.post(`http://127.0.0.1:4175/api/v1/jobs/${state.latest_job_id}/cancel`, { headers: { 'X-CSRF-Token': token } });
  expect((await canceled.json()).status).toBe('canceled');
  await page.reload(); await page.getByRole('button', { name: 'Study library', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Processing canceled');
  await page.getByLabel('I agree to this processing.').check();
  const newJob = page.waitForResponse(r => r.url().endsWith(`/recordings/${recording.id}/jobs`) && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Retry processing' }).click();
  const newResult = await newJob;
  expect(newResult.status()).toBe(202); expect(newResult.request().postDataJSON()).toEqual({});
  await expect(page.getByRole('status')).toContainText('Processing is blocked');
  const budget = await (await page.request.get('http://127.0.0.1:4175/api/v1/budget')).json();
  expect(budget.settled_usd).toBe('0.000000'); expect(budget.reserved_usd).toBe('0.000000'); expect(budget.uncertain_usd).toBe('0.000000');
});
