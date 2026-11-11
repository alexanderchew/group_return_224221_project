/// <reference types="node" />
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterAll, expect, test, vi } from 'vitest';

const folder = mkdtempSync(join(tmpdir(), 'lecture-native-operations-'));
const connections: DatabaseSync[] = [];

vi.mock('expo-crypto', async () => ({ randomUUID: (await import('node:crypto')).randomUUID }));
// Host test only. Use real SQLite on disk through the small subset of Expo's API
// consumed by the production operation store.
vi.mock('expo-sqlite', () => ({
  async openDatabaseAsync(name: string) {
    const database = new DatabaseSync(join(folder, name));
    connections.push(database);
    return {
      async execAsync(sql: string) { database.exec(sql); },
      async runAsync(sql: string, ...args: string[]) { return database.prepare(sql).run(...args); },
      async getFirstAsync(sql: string, ...args: string[]) { return database.prepare(sql).get(...args) ?? null; },
    };
  },
}));

afterAll(() => {
  for (const connection of connections) connection.close();
  rmSync(folder, { recursive: true, force: true });
});

test('durably freezes retries and retains completed attempt IDs during a deliberate retake', async () => {
  const initial = await import('../src/operations');
  const scope = 'offline-test-quiz';
  const first = await initial.pendingOperation(scope, { answer: 'a' });
  const secondTap = await initial.pendingOperation(scope, { answer: 'b' });
  expect(secondTap).toEqual(first);

  vi.resetModules();
  const reopened = await import('../src/operations');
  expect(await reopened.readOperation(scope)).toEqual(first);
  await reopened.acknowledgeOperation(scope, 'attempt-original');
  const original = { id: 'attempt-original' };
  expect(await reopened.readOperation(scope)).toEqual(original);
  await expect(reopened.pendingOperation(scope, { answer: 'c' })).rejects.toThrow('already completed');

  const retake = await reopened.pendingOperation(scope, { answer: 'c' }, original);
  expect(retake).toMatchObject({ body: { answer: 'c' }, previousIds: ['attempt-original'] });
  expect(retake.key).not.toBe(first.key);
  expect(await reopened.pendingOperation(scope, { answer: 'd' })).toEqual(retake);
  await reopened.acknowledgeOperation(scope, 'attempt-new', retake.previousIds);
  expect(await reopened.readOperation(scope)).toEqual({ id: 'attempt-new', previousIds: ['attempt-original'] });
});
