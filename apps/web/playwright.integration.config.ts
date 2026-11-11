import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './integration',
  outputDir: './integration-results',
  workers: 1,
  timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:4174', channel: 'chrome', trace: 'retain-on-failure', permissions: ['microphone'], launchOptions: { args: ['--use-fake-device-for-media-stream'] } },
  webServer: [
    { command: '../../.venv/bin/python tests/backend_server.py --mode replay --port 8001', url: 'http://127.0.0.1:8001/health', reuseExistingServer: false },
    { command: '../../.venv/bin/python tests/backend_server.py --mode keyfree --port 8002', url: 'http://127.0.0.1:8002/health', reuseExistingServer: false },
    { command: 'npm run dev -- --port 4174 --strictPort', env: { LECTURE_API_TARGET: 'http://127.0.0.1:8001' }, url: 'http://127.0.0.1:4174', reuseExistingServer: false },
    { command: 'npm run dev -- --port 4175 --strictPort', env: { LECTURE_API_TARGET: 'http://127.0.0.1:8002' }, url: 'http://127.0.0.1:4175', reuseExistingServer: false },
  ],
});
