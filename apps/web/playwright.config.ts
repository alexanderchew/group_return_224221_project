import { defineConfig } from '@playwright/test';
import { rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Feed actual recording APIs a known synthetic WAV. This avoids relying on a
// host microphone/audio driver and never grants access to the user's input.
const fakeAudio = join(tmpdir(), `lecture-test-microphone-${process.pid}.wav`);
const sampleRate = 48_000, frames = sampleRate * 2, audio = Buffer.alloc(44 + frames * 2);
audio.write('RIFF', 0); audio.writeUInt32LE(audio.length - 8, 4); audio.write('WAVEfmt ', 8);
audio.writeUInt32LE(16, 16); audio.writeUInt16LE(1, 20); audio.writeUInt16LE(1, 22);
audio.writeUInt32LE(sampleRate, 24); audio.writeUInt32LE(sampleRate * 2, 28);
audio.writeUInt16LE(2, 32); audio.writeUInt16LE(16, 34); audio.write('data', 36); audio.writeUInt32LE(frames * 2, 40);
for (let index = 0; index < frames; index++) audio.writeInt16LE(Math.round(8000 * Math.sin(2 * Math.PI * 440 * index / sampleRate)), 44 + index * 2);
writeFileSync(fakeAudio, audio, { mode: 0o600 });
process.on('exit', () => rmSync(fakeAudio, { force: true }));
const deployedUrl = process.env.LECTURE_WEB_TEST_URL;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  workers: 2,
  use: { baseURL: deployedUrl ?? 'http://127.0.0.1:4173', channel: process.env.PLAYWRIGHT_CHANNEL === 'chromium' ? undefined : 'chrome', trace: 'retain-on-failure', permissions: ['microphone'], launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-audio-capture=${fakeAudio}`] } },
  webServer: deployedUrl ? undefined : { command: 'npm run dev -- --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
});
