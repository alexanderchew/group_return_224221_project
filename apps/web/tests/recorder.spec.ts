import { test, expect } from '@playwright/test';

test('real browser recorder saves playable local audio, excludes pauses and survives reload without the API', async ({ page }) => {
  let uploads = 0;
  page.on('request', request => { if (request.url().includes('/api/v1/')) uploads++; });
  await page.goto('/');
  await page.getByLabel('Recording title').fill('My first recorded lesson');
  await page.getByRole('button', { name: 'Start recording', exact: true }).click();
  await expect(page.getByRole('status', { name: '' }).filter({ hasText: /^Recording$/ })).toBeVisible();
  await expect.poll(async () => (await page.locator('.capture-clock').getAttribute('aria-label'))).not.toBe('0 seconds recorded');
  await page.getByRole('button', { name: 'Pause recording' }).click();
  const pausedTime = await page.locator('.capture-clock').textContent();
  await page.waitForTimeout(1100); // Explicit clock invariant: user pause must exclude wall time.
  expect(await page.locator('.capture-clock').textContent()).toBe(pausedTime);
  await page.getByRole('button', { name: 'Resume recording' }).click();
  await expect.poll(async () => page.locator('.capture-clock').textContent()).not.toBe(pausedTime);
  await page.getByRole('button', { name: 'Stop & save' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved on this device' })).toBeVisible();
  await page.getByRole('button', { name: /My first recorded lesson/ }).click();
  const player = page.getByLabel('Play My first recorded lesson');
  await expect(player).toBeVisible();
  await expect.poll(async () => player.evaluate((el: HTMLAudioElement) => el.readyState)).toBeGreaterThan(0);
  await player.evaluate((el: HTMLAudioElement) => el.play());
  await expect.poll(async () => player.evaluate((el: HTMLAudioElement) => el.currentTime)).toBeGreaterThan(0);
  await page.reload();
  await expect(page.getByRole('button', { name: /My first recorded lesson/ })).toBeVisible();
  expect(uploads).toBe(0);
});
test('microphone denial leaves import and retry available without pretending to record', async ({ page }) => {
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Denied', 'NotAllowedError')); });
  await page.goto('/'); await page.getByRole('button', { name: 'Start recording', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Microphone access is blocked');
  await expect(page.getByRole('button', { name: 'Start recording', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Import audio to this device')).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Stop & save' })).toHaveCount(0);
});
test('capture continues across app views, hidden browser pages pause and stop works while paused', async ({ page }) => {
  await page.goto('/'); await page.getByLabel('Recording title').fill('Navigation lesson');
  await page.getByRole('button', { name: 'Start recording', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause recording' })).toBeVisible();
  await expect.poll(async () => page.locator('.capture-clock').getAttribute('aria-label')).not.toBe('0 seconds recorded');
  await page.getByRole('button', { name: 'Study library', exact: true }).click();
  await page.getByRole('button', { name: 'Record', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause recording' })).toBeVisible();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.getByRole('button', { name: 'Resume recording' })).toBeVisible();
  await expect(page.getByText('Paused because this page was hidden.', { exact: false })).toBeVisible();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); });
  await page.getByRole('button', { name: 'Stop & save' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved on this device' })).toBeVisible();
});
test('incomplete capture reload is labeled recovered partial and keeps its stored container fragments', async ({ page }) => {
  await page.goto('/'); await page.getByLabel('Recording title').fill('Interrupted lesson');
  await page.getByRole('button', { name: 'Start recording', exact: true }).click();
  await expect.poll(async () => page.evaluate(() => new Promise<number>(resolve => {
    const request = indexedDB.open('lecture-companion-audio');
    request.onsuccess = () => { const tx = request.result.transaction('chunks'); const count = tx.objectStore('chunks').count(); count.onsuccess = () => resolve(count.result); };
  }))).toBeGreaterThan(0);
  page.on('dialog', dialog => { void dialog.accept(); });
  await page.reload();
  await expect(page.getByRole('button', { name: /Interrupted lesson.*Recovered partial/ })).toBeVisible();
});
test('phone-sized recorder is compact, labeled and has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start recording', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/recorder-phone.png', fullPage: true });
  await page.getByLabel('Recording title').fill('Physics · forces & motion');
  await page.getByRole('button', { name: 'Start recording', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause recording' })).toBeVisible();
  await expect.poll(async () => page.locator('.capture-clock').getAttribute('aria-label')).not.toBe('0 seconds recorded');
  await page.evaluate(() => {
    const label = document.createElement('p'); label.textContent = 'BROWSER TEST · Synthetic microphone input';
    label.style.cssText = 'margin:0;padding:8px;text-align:center;font:10px system-ui;background:#fff4df;color:#70551e'; document.body.prepend(label);
  });
  await page.screenshot({ path: 'test-results/recorder-phone-active.png', fullPage: true });
  await page.getByRole('button', { name: 'Stop & save' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved on this device' })).toBeVisible();
});
