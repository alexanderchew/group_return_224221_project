import { randomUUID } from 'expo-crypto';
import { openDatabaseAsync } from 'expo-sqlite';

type Pending<T> = { key: string; body: T; previousIds?: string[] };
export type Acknowledged = { id: string; previousIds?: string[] };

let database: ReturnType<typeof openDatabaseAsync> | undefined;

async function db() {
  database ??= (async () => {
    const connection = await openDatabaseAsync('lecture-transfers.db');
    await connection.execAsync('PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS operations (scope TEXT PRIMARY KEY, data TEXT NOT NULL);');
    return connection;
  })().catch(error => {
    database = undefined;
    throw error;
  });
  return database;
}

export async function readOperation<T>(scope: string): Promise<Pending<T> | Acknowledged | null> {
  const row = await (await db()).getFirstAsync<{ data: string }>('SELECT data FROM operations WHERE scope = ?', scope);
  return row ? JSON.parse(row.data) : null;
}

async function writeOperation(scope: string, value: Pending<unknown> | Acknowledged) {
  await (await db()).runAsync('INSERT OR REPLACE INTO operations (scope, data) VALUES (?, ?)', scope, JSON.stringify(value));
}

export async function pendingOperation<T>(scope: string, body: T, retake?: Acknowledged) {
  const pending: Pending<T> = { key: randomUUID(), body };
  const connection = await db();
  if (retake) {
    pending.previousIds = [retake.id, ...(retake.previousIds ?? [])];
    await connection.runAsync('UPDATE operations SET data = ? WHERE scope = ? AND data = ?',
      JSON.stringify(pending), scope, JSON.stringify(retake));
  } else {
    await connection.runAsync('INSERT OR IGNORE INTO operations (scope, data) VALUES (?, ?)', scope, JSON.stringify(pending));
  }
  const saved = await readOperation<T>(scope);
  if (!saved || !('key' in saved)) throw new Error('This action has already completed. Refresh the shared library.');
  return saved;
}

export function acknowledgeOperation(scope: string, id: string, previousIds?: string[]) {
  return writeOperation(scope, { id, previousIds });
}

export async function clearOperation(scope: string) {
  await (await db()).runAsync('DELETE FROM operations WHERE scope = ?', scope);
}
