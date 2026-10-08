import * as SQLite from 'expo-sqlite';

import { DATABASE_NAME } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  return dbPromise;
}

export async function getPreference(key: string): Promise<string | null> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM preferences WHERE "key" = ?',
      key,
    );
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function setPreference(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO preferences ("key", value) VALUES (?, ?)
     ON CONFLICT("key") DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}

export async function deletePreference(key: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM preferences WHERE "key" = ?', key);
}
