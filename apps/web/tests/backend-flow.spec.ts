import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const root = fileURLToPath(new URL('../../../', import.meta.url));
let service: ChildProcess;
let api: string;
const frontendOrigin = new URL(process.env.LECTURE_WEB_TEST_URL ?? 'http://127.0.0.1:4173').origin;
test.beforeAll(async () => {
  const listener = createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const address = listener.address();
  if (!address || typeof address === 'string') throw new Error('No local test port available.');
  const port = address.port;
  await new Promise<void>((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  api = `http://127.0.0.1:${port}`;
  const script = `
import os, sys, tempfile
from pathlib import Path
import httpx, uvicorn
sys.path[:0] = [str(Path.cwd() / 'services/api'), str(Path.cwd() / 'tests')]
from conftest import TestProviders
from lecture_backend.app import create_app
from lecture_backend.core import Settings
def no_network(*args, **kwargs):
    raise AssertionError('Browser tests cannot call paid providers or external HTTP.')
httpx.HTTPTransport.handle_request = no_network
with tempfile.TemporaryDirectory(prefix='lecture-browser-contract-') as directory:
    app = create_app(Settings(data_dir=Path(directory), allowed_origins=(os.environ['LECTURE_BROWSER_TEST_ORIGIN'],)), TestProviders())
    with app.state.store.tx() as cx:
        cx.execute("UPDATE kv SET value='browser-test-access-only' WHERE name='demo_token'")
    uvicorn.run(app, host='127.0.0.1', port=int(os.environ['LECTURE_BROWSER_TEST_PORT']), access_log=False, log_level='warning')
`;
  service = spawn(process.env.LECTURE_TEST_PYTHON ?? `${root}.venv/bin/python`, ['-c', script], {
    cwd: root, stdio: 'ignore',
    env: { ...process.env, ELEVENLABS_API_KEY: '', OPENAI_API_KEY: '', LECTURE_MODEL_DIR: '', LECTURE_BROWSER_TEST_PORT: String(port), LECTURE_BROWSER_TEST_ORIGIN: frontendOrigin },
  });
  await expect.poll(async () => {
    try { return (await fetch(`${api}/health`)).status; } catch { return 0; }
  }, { timeout: 10_000 }).toBe(200);
});
test.afterAll(async () => {
  if (service && service.exitCode === null) {
    const exited = once(service, 'exit');
    service.kill('SIGINT');
    await exited;
  }
});

test('recorded WebM uploads with CSRF; real API budget and correct/incorrect/unanswered scoring render', async ({ page }, testInfo) => {
  // Real API/worker/media decoding, isolated temporary data and labeled provider
  // doubles. This test neither contacts paid providers nor touches the demo data.
  const provision = await page.request.post(`${api}/operator/connect`, { form: { access_token: 'browser-test-access-only' } });
  expect(provision.ok()).toBe(true);
  await page.goto('/');
  await page.getByRole('button', { name: 'Connect laptop', exact: true }).click();
  await page.getByLabel('Laptop service address').fill(api);
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.locator('.budget')).toContainText('$18.000000 available of $20.000000');
  await page.getByRole('button', { name: 'Record', exact: true }).click();
  await page.getByLabel('Recording title').fill('Contract recording');
  await page.getByRole('button', { name: 'Start recording', exact: true }).click();
  await expect.poll(async () => page.locator('.capture-clock').getAttribute('aria-label')).not.toBe('0 seconds recorded');
  await page.getByRole('button', { name: 'Stop & save' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved on this device' })).toBeVisible();
  await page.getByRole('button', { name: /Contract recording.*Local/ }).click();
  const exported = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await (await exported).saveAs(testInfo.outputPath('synthetic-recording.webm'));
  await page.getByRole('button', { name: 'Use for study ↗' }).click();
  await page.getByLabel('I can share this recording').check();
  const uploaded = page.waitForResponse(response => response.url() === `${api}/api/v1/recordings` && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Upload to shared library' }).click();
  const response = await uploaded;
  expect(response.status()).toBe(201);
  expect(response.request().headers()['x-csrf-token']).toBeTruthy();
  const recording = await response.json();
  expect(recording.mime_type).toBe('audio/webm');
  await expect(page.getByRole('heading', { name: 'Contract recording', exact: true })).toBeVisible();
  await page.getByLabel('I agree to this processing.').check();
  await page.getByRole('button', { name: 'Process lecture', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Lecture details ready', { timeout: 12_000 });
  await expect(page.getByRole('button', { name: 'Quiz', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Quiz', exact: true }).click();
  await page.getByLabel('Chlorophyll', { exact: true }).check();
  await page.getByRole('button', { name: 'Submit answers', exact: true }).click();
  await expect(page.getByRole('heading', { name: '1 of 1 correct' })).toBeVisible();
  await expect(page.getByText('Correct', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start a new practice attempt' }).click();
  await page.getByLabel('Glass', { exact: true }).check();
  await page.getByRole('button', { name: 'Submit answers', exact: true }).click();
  await expect(page.getByRole('heading', { name: '0 of 1 correct' })).toBeVisible();
  await expect(page.getByText('Incorrect', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start a new practice attempt' }).click();
  await page.getByLabel('Submit with 1 unanswered. Unanswered questions score zero.').check();
  await page.getByRole('button', { name: 'Submit answers', exact: true }).click();
  await expect(page.getByRole('heading', { name: '0 of 1 correct' })).toBeVisible();
  await expect(page.getByText('Unanswered', { exact: true })).toBeVisible();
  page.once('dialog', dialog => { void dialog.accept(); });
  await page.getByRole('button', { name: 'Delete uploaded lecture' }).click();
  await expect(page.getByRole('heading', { name: 'A lesson worth revisiting.' })).toBeVisible();
  expect((await page.request.get(`${api}/api/v1/recordings`)).ok()).toBe(true);
  await expect((await page.request.get(`${api}/api/v1/recordings`)).json()).resolves.toMatchObject({ items: [] });
});
