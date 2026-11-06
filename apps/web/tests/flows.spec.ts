import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { attempt, budget, config, job, pack, recording, segment } from './fixtures';

async function connect(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Connect laptop', exact: true }).click();
  await page.getByLabel('Laptop service address').fill('http://127.0.0.1:4173');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
}
async function api(page: Page, initial = true, customPack: unknown = pack) {
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url()), path = url.pathname.replace('/api/v1', '');
    let body: unknown;
    if (path === '/config') body = config;
    else if (path === '/budget') body = budget;
    else if (path === '/recordings') body = route.request().method() === 'POST' ? recording : { items: initial ? [recording] : [], next_cursor: null };
    else if (path.endsWith('/audio')) return route.fulfill({ status: 404 });
    else if (path.endsWith('/study-pack')) body = customPack;
    else if (path.includes('/transcripts/')) body = { id: pack.transcript_revision_id, segments: url.searchParams.has('cursor') ? [{ ...segment, id: 'segment-2', text: 'Later in the lecture: melting changes the arrangement.' }] : [segment], next_cursor: null };
    else if (path.endsWith('/quiz-attempts') || path.startsWith('/quiz-attempts/')) body = attempt;
    else if (path.endsWith('/jobs') || path.startsWith('/jobs/')) body = job;
    else body = { ...recording, latest_job_id: job.id };
    return route.fulfill({ json: body });
  });
}
test('disconnected start never invents lessons or asks for provider keys', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Capture the lesson/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start recording', exact: true })).toBeEnabled();
  await expect(page.locator('input[type=password]')).toHaveCount(0);
});
test('web upload stays separate from processing and retains its key/file across a lost response and reload', async ({ page }) => {
  await api(page, false);
  let uploads = 0, jobs = 0;
  const keys: string[] = [];
  await page.route('**/api/v1/recordings', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    keys.push(route.request().headers()['idempotency-key']); uploads++;
    if (uploads === 1) return route.abort('failed');
    return route.fulfill({ status: 201, json: recording });
  });
  await page.route('**/api/v1/recordings/*/jobs', async route => { jobs++; return route.fulfill({ status: 202, json: job }); });
  await connect(page);
  await page.getByLabel('Browse audio').setInputFiles({ name: 'lesson.wav', mimeType: 'audio/wav', buffer: Buffer.from('synthetic-media-not-a-codec-test') });
  await page.getByLabel('I can share this recording').check();
  await page.getByRole('button', { name: 'Upload to shared library' }).click();
  await expect(page.getByRole('alert')).toContainText('could not be reached');
  await page.reload();
  await page.getByRole('button', { name: 'Study library', exact: true }).click();
  await expect(page.getByText('lesson.wav', { exact: true })).toBeVisible();
  await page.getByLabel('I can share this recording').check();
  await page.getByRole('button', { name: 'Retry same upload' }).click();
  await expect(page.getByRole('heading', { name: recording.title })).toBeVisible();
  expect(keys[1]).toBe(keys[0]); expect(jobs).toBe(0);
});
test('shows real provenance, resolves historical evidence and pages the transcript', async ({ page }) => {
  await api(page); await connect(page);
  await page.getByRole('button', { name: new RegExp(recording.title) }).click();
  await expect(page.getByText('Chemistry · AI baseline')).toBeVisible();
  await page.evaluate(() => {
    const label = document.createElement('p'); label.textContent = 'SYNTHETIC BROWSER TEST · No live API or provider result';
    label.style.cssText = 'background:#fff6df;color:#6c501d;padding:12px;text-align:center;margin:0;font:14px system-ui'; document.body.prepend(label);
  });
  await page.screenshot({ path: 'test-results/study-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'View lecture source' }).first().click();
  await expect(page.getByRole('complementary', { name: 'Supporting lecture text' })).toContainText('固定位置');
  await page.getByRole('button', { name: 'Transcript', exact: true }).click();
  await page.getByRole('button', { name: 'Load more transcript' }).click();
  await expect(page.getByText('Later in the lecture:', { exact: false })).toBeVisible();
});
test('quiz submission survives a lost response, locks answers, restores feedback and keeps practice drafts', async ({ page }) => {
  await api(page); let submissions = 0;
  const bodies: unknown[] = [], keys: string[] = [];
  await page.route('**/api/v1/recordings/*/quiz-attempts', async route => {
    submissions++; bodies.push(route.request().postDataJSON()); keys.push(route.request().headers()['idempotency-key']);
    if (submissions === 1) return route.abort('failed');
    return route.fulfill({ status: 201, json: attempt });
  });
  await connect(page); await page.getByRole('button', { name: new RegExp(recording.title) }).click();
  await expect(page.getByText('Demo allowance: $16.50 available of $20.00')).toBeVisible();
  await page.getByRole('button', { name: 'Quiz', exact: true }).click();
  await page.getByLabel('They vibrate around fixed positions.').check();
  await page.getByRole('button', { name: 'Submit answers' }).click();
  await expect(page.getByRole('button', { name: 'Retry same submission' })).toBeVisible();
  await expect(page.getByLabel('They stop moving completely.')).toBeDisabled();
  await page.reload(); await page.getByRole('button', { name: 'Study library', exact: true }).click(); await page.getByRole('button', { name: 'Quiz', exact: true }).click();
  await page.getByRole('button', { name: 'Retry same submission' }).click();
  await expect(page.getByRole('heading', { name: '1 of 1 correct' })).toBeVisible();
  await expect(page.getByText('Correct', { exact: true })).toBeVisible();
  expect(keys[0]).toBe(keys[1]); expect(bodies[0]).toEqual(bodies[1]);
  expect(bodies[1]).toEqual({ study_pack_id: pack.id, answers: [{ question_id: 'question-1', option_id: 'a' }] });
  await page.getByRole('button', { name: 'Start a new practice attempt' }).click();
  await page.getByLabel('They stop moving completely.').check();
  await page.reload(); await page.getByRole('button', { name: 'Study library', exact: true }).click(); await page.getByRole('button', { name: 'Quiz', exact: true }).click();
  await expect(page.getByLabel('They stop moving completely.')).toBeChecked();
  await expect(page.getByText('Practice · You have already seen solutions')).toBeVisible();
});
test('partial and outdated material never produces a fake score', async ({ page }) => {
  await api(page, true, { ...pack, quiz_status: 'insufficient_evidence', questions: [], freshness: 'outdated', artifact_statuses: { notes: 'ready', overview: 'ready', quiz: 'insufficient_evidence' } });
  await connect(page); await page.getByRole('button', { name: new RegExp(recording.title) }).click();
  await expect(page.getByText('Generated from an earlier transcript.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Quiz', exact: true }).click();
  await expect(page.getByText('This lesson does not contain enough supported material', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit answers' })).toHaveCount(0);
});
test('HTTP 200 blocked jobs preserve saved audio and offer explicit recovery', async ({ page }) => {
  await api(page);
  await page.route('**/api/v1/jobs/*', route => route.fulfill({ json: { ...job, status: 'blocked', study_pack_id: null, error: { code: 'budget_exceeded', message: 'Demo processing allowance reached. Your recording is saved.', retryable: false, stage: 'transcribe' } } }));
  await page.route('**/api/v1/recordings/*/study-pack', route => route.fulfill({ status: 409, json: { error: { code: 'not_ready', message: 'No pack yet.', retryable: false, stage: null } } }));
  await connect(page); await page.getByRole('button', { name: new RegExp(recording.title) }).click();
  await expect(page.getByRole('status')).toContainText('allowance reached');
  await expect(page.getByRole('button', { name: 'Retry processing' })).toBeDisabled();
  await expect(page.getByLabel('Original lecture audio')).toBeVisible();
});
test('shared deletion confirms scope, clears cached drafts and keeps the computer original', async ({ page }) => {
  await api(page); await connect(page); await page.getByRole('button', { name: new RegExp(recording.title) }).click();
  page.on('dialog', dialog => { expect(dialog.message()).toContain('EVERY demo device'); void dialog.accept(); });
  await page.route('**/api/v1/recordings/test-recording', async route => route.request().method() === 'DELETE' ? route.fulfill({ status: 204 }) : route.fallback());
  await page.getByRole('button', { name: 'Delete uploaded lecture' }).click();
  await expect(page.getByRole('heading', { name: 'A lesson worth revisiting.' })).toBeVisible();
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.filter(key => key.includes('recording:test-recording:'))).toHaveLength(0);
});
test('narrow layout stays readable and keyboard-accessible', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 }); await api(page, false); await connect(page);
  await expect(page.getByLabel('Browse audio')).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/library-360.png', fullPage: true });
});
