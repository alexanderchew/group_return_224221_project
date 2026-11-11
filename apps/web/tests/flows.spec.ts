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
  await page.context().addCookies([{ name: 'lecture_csrf', value: 'browser-csrf-token', url: 'http://127.0.0.1:4173' }]);
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
test('defaults to Alex’s demo preset, opens setup on the selected host, and remembers it', async ({ page }) => {
  const demo = 'https://alexanders-laptop.local:8443';
  await page.route(`${demo}/**`, route => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'Connect laptop', exact: true }).click();
  const address = page.getByLabel('Laptop service address');
  const setup = page.getByRole('link', { name: 'Set up browser access' });
  await expect(address).toHaveValue(demo);
  await expect(setup).toHaveAttribute('href', `${demo}/operator/connect`);
  await page.getByRole('button', { name: 'This page’s address' }).click();
  await expect(setup).toHaveAttribute('href', 'http://127.0.0.1:4173/operator/connect');
  await address.fill('https://another-laptop.local:8443/api/v1');
  await expect(setup).toHaveAttribute('href', 'https://another-laptop.local:8443/operator/connect');
  await page.getByRole('button', { name: 'Alex’s demo laptop' }).click();
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your lecture library' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Laptop setup', exact: true }).click();
  await expect(address).toHaveValue(demo);
  await expect(setup).toHaveAttribute('href', `${demo}/operator/connect`);
});
test('web upload stays separate from processing and retains its key/file across a lost response and reload', async ({ page }) => {
  await api(page, false);
  let uploads = 0, jobs = 0;
  const keys: string[] = [];
  await page.route('**/api/v1/recordings', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    expect(route.request().headers()['x-csrf-token']).toBe('browser-csrf-token');
    keys.push(route.request().headers()['idempotency-key']); uploads++;
    if (uploads === 1) return route.abort('failed');
    return route.fulfill({ status: 201, json: recording });
  });
  await page.route('**/api/v1/recordings/*/jobs', async route => { expect(route.request().headers()['x-csrf-token']).toBe('browser-csrf-token'); jobs++; return route.fulfill({ status: 202, json: job }); });
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
    expect(route.request().headers()['x-csrf-token']).toBe('browser-csrf-token');
    submissions++; bodies.push(route.request().postDataJSON()); keys.push(route.request().headers()['idempotency-key']);
    if (submissions === 1) return route.abort('failed');
    return route.fulfill({ status: 201, json: attempt });
  });
  await connect(page); await page.getByRole('button', { name: new RegExp(recording.title) }).click();
  await expect(page.getByText('Demo allowance: $16.250000 available of $20.000000')).toBeVisible();
  await page.getByRole('button', { name: 'Quiz', exact: true }).click();
  await page.getByLabel('They vibrate around fixed positions.').check();
  await page.getByRole('button', { name: 'Submit answers' }).click();
  await expect(page.getByRole('button', { name: 'Retry same submission' })).toBeVisible();
  await expect(page.getByLabel('They stop moving completely.')).toBeDisabled();
  await page.reload(); await page.getByRole('button', { name: 'Study library', exact: true }).click(); await page.getByRole('button', { name: 'Quiz', exact: true }).click();
  await page.getByRole('button', { name: 'Retry same submission' }).click();
  await expect(page.getByRole('heading', { name: '1 of 1 correct' })).toBeVisible();
  await expect(page.locator('.feedback strong')).toHaveText('Correct');
  expect(keys[0]).toBe(keys[1]); expect(bodies[0]).toEqual(bodies[1]);
  expect(bodies[1]).toEqual({ study_pack_id: pack.id, answers: [{ question_id: 'question-1', option_id: 'a' }] });
  await page.reload(); await page.getByRole('button', { name: 'Study library', exact: true }).click(); await page.getByRole('button', { name: 'Quiz', exact: true }).click();
  await expect(page.getByRole('heading', { name: '1 of 1 correct' })).toBeVisible();
  await expect(page.locator('.feedback strong')).toHaveText('Correct');
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

test('a fast new result waits for the processing animation, then keeps the same particle canvas', async ({ page }) => {
  await api(page);
  let submitted = false, ready = false;
  const generating = { ...job, status: 'generating', stage: 'generate_notes', study_pack_id: null, updated_at: '2026-11-04T10:04:59Z' };
  await page.route('**/api/v1/recordings/test-recording', route => route.fulfill({
    json: { ...recording, latest_job_id: submitted ? job.id : null },
  }));
  await page.route('**/api/v1/recordings/*/study-pack', route => submitted
    ? route.fulfill({ json: pack })
    : route.fulfill({ status: 409, json: { error: { code: 'not_ready', message: 'No pack yet.', retryable: false, stage: null } } }));
  await page.route('**/api/v1/recordings/*/jobs', route => {
    submitted = true;
    return route.fulfill({ status: 202, json: generating });
  });
  await page.route('**/api/v1/jobs/*', route => route.fulfill({ json: ready ? job : generating }));

  await connect(page);
  await page.getByRole('button', { name: new RegExp(recording.title) }).click();
  const orb = page.locator('.particle-orb');
  await expect(orb).toHaveCount(0);
  await page.getByLabel('I agree to this processing.').check();
  const started = Date.now();
  const published = page.waitForResponse(response => response.url().endsWith('/study-pack') && response.ok());
  await page.getByRole('button', { name: 'Process lecture' }).click();
  await published;
  const pause = page.getByRole('button', { name: 'Pause animation' });
  await expect(pause).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Preparing study materials');
  await expect(page.getByRole('heading', { name: 'Your study workspace' })).toHaveCount(0);
  ready = true;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByRole('status')).toContainText('Getting lecture details ready');
  await expect(page.getByRole('heading', { name: 'Your study workspace' })).toHaveCount(0);
  const canvas = await orb.locator('canvas').elementHandle();
  await expect(page.getByRole('status')).toContainText('Lecture details ready', { timeout: 8000 });
  expect(Date.now() - started).toBeGreaterThanOrEqual(5000);
  await expect(page.getByRole('heading', { name: 'Your study workspace' })).toBeVisible();
  await expect(orb).toHaveClass(/is-ready/);
  expect(await canvas.evaluate(node => node.isConnected)).toBe(true);
  await expect.poll(async () => {
    const screenshot = await canvas.screenshot();
    return page.evaluate(async base64 => {
      const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
      const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const copy = new OffscreenCanvas(image.width, image.height).getContext('2d')!;
      copy.drawImage(image, 0, 0);
      const { data } = copy.getImageData(0, 0, image.width, image.height);
      image.close();
      let warm = 0, cool = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] - data[i + 1] > 20) warm++;
        if (data[i + 2] - data[i] > 20 && data[i + 2] - data[i + 1] > 10) cool++;
      }
      return warm > 3 && cool > 3;
    }, screenshot.toString('base64'));
  }).toBe(true);
  await pause.click();
  await expect(page.getByRole('button', { name: 'Resume animation' })).toBeVisible();
});

test('the processing indicator still waits for the server after five seconds with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await api(page);
  let ready = false;
  await page.route('**/api/v1/jobs/*', route => route.fulfill({
    json: ready ? job : { ...job, status: 'analysing', stage: 'classify_subject', study_pack_id: null },
  }));
  await page.route('**/api/v1/recordings/*/study-pack', route => ready
    ? route.fulfill({ json: pack })
    : route.fulfill({ status: 409, json: { error: { code: 'not_ready', message: 'No pack yet.', retryable: false, stage: null } } }));

  await connect(page);
  await page.getByRole('button', { name: new RegExp(recording.title) }).click();
  await expect(page.getByRole('status')).toContainText('Identifying the subject');
  await page.clock.fastForward(6000);
  await expect(page.getByRole('status')).toContainText('Identifying the subject');
  await expect(page.locator('.particle-orb canvas')).toHaveCount(0);
  ready = true;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByRole('status')).toContainText('Lecture details ready');
  await expect(page.locator('.particle-orb.is-ready')).toHaveAttribute('data-rendering', 'false');
  await expect(page.getByRole('heading', { name: 'Your study workspace' })).toBeVisible();
});
test('shared deletion confirms scope, clears cached drafts and keeps the computer original', async ({ page }) => {
  await api(page); await connect(page); await page.getByRole('button', { name: new RegExp(recording.title) }).click();
  page.on('dialog', dialog => { expect(dialog.message()).toContain('EVERY demo device'); void dialog.accept(); });
  await page.route('**/api/v1/recordings/test-recording', async route => {
    if (route.request().method() !== 'DELETE') return route.fallback();
    expect(route.request().headers()['x-csrf-token']).toBe('browser-csrf-token');
    return route.fulfill({ status: 204 });
  });
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

test('shows the allowance from backend USD fields, including reserved and uncertain costs', async ({ page }) => {
  await api(page, false); await connect(page);
  await expect(page.locator('.budget')).toContainText('Demo allowance: $16.250000 available of $20.000000');
  await expect(page.locator('.budget')).toContainText('Settled $1.000000 · Reserved $0.500000 · Uncertain $0.250000');
});

for (const selected of ['b', null]) {
  test(`renders backend is_correct=false as ${selected === null ? 'unanswered' : 'incorrect'}`, async ({ page }) => {
    await api(page);
    await page.route('**/api/v1/recordings/*/quiz-attempts', route => route.fulfill({ status: 201, json: {
      ...attempt, correct_count: 0, percentage: 0, unanswered_count: selected === null ? 1 : 0,
      results: [{ ...attempt.results[0], selected_option_id: selected, is_correct: false }],
    } }));
    await connect(page); await page.getByRole('button', { name: new RegExp(recording.title) }).click();
    await page.getByRole('button', { name: 'Quiz', exact: true }).click();
    if (selected) await page.getByLabel('They move freely throughout the container.').check();
    else await page.getByLabel('Submit with 1 unanswered. Unanswered questions score zero.').check();
    await page.getByRole('button', { name: 'Submit answers' }).click();
    await expect(page.getByRole('heading', { name: '0 of 1 correct' })).toBeVisible();
    await expect(page.locator('.feedback strong')).toHaveText(selected === null ? 'Unanswered' : 'Incorrect');
  });
}

test('uploads its own freshly recorded WebM with codec parameters and the operator CSRF cookie', async ({ page }) => {
  await api(page, false);
  const uploaded = { ...recording, title: 'Recorder upload regression', mime_type: 'audio/webm' };
  let uploads = 0;
  await page.route('**/api/v1/recordings/test-recording', route => route.fulfill({ json: uploaded }));
  await page.route('**/api/v1/recordings', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    const headers = route.request().headers();
    if (headers['x-csrf-token'] !== 'browser-csrf-token' || !headers.cookie?.includes('lecture_csrf=browser-csrf-token')) {
      return route.fulfill({ status: 403, json: { error: { code: 'csrf_required', message: 'A matching CSRF token is required.', retryable: false, stage: null } } });
    }
    expect(headers['content-type']).toContain('multipart/form-data; boundary=');
    expect(route.request().postDataBuffer()?.toString('latin1')).toContain('Content-Type: audio/webm;codecs=opus');
    uploads++;
    return route.fulfill({ status: 201, json: uploaded });
  });
  await connect(page);
  await page.getByRole('button', { name: 'Record', exact: true }).click();
  await page.getByLabel('Recording title').fill('Recorder upload regression');
  await page.getByRole('button', { name: 'Start recording', exact: true }).click();
  await expect.poll(async () => page.locator('.capture-clock').getAttribute('aria-label')).not.toBe('0 seconds recorded');
  await page.getByRole('button', { name: 'Stop & save' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved on this device' })).toBeVisible();
  await page.getByRole('button', { name: /Recorder upload regression.*Local/ }).click();
  await page.getByRole('button', { name: 'Use for study ↗' }).click();
  await expect(page.getByText('audio/webm;codecs=opus', { exact: false }).first()).toBeVisible();
  await page.getByLabel('I can share this recording').check();
  await page.getByRole('button', { name: 'Upload to shared library' }).click();
  await expect(page.getByRole('heading', { name: 'Recorder upload regression', exact: true })).toBeVisible();
  expect(uploads).toBe(1);
});
