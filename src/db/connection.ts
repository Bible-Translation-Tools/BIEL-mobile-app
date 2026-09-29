import * as SQLite from 'expo-sqlite';

import { DATABASE_NAME, SCHEMA_STATEMENTS } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let transactionTail: Promise<unknown> = Promise.resolve();

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  return dbPromise;
}

/** SQLite allows only one active transaction per connection. */
export async function withSerializedTransaction(
  db: SQLite.SQLiteDatabase,
  fn: () => Promise<void>,
): Promise<void> {
  const run = transactionTail.then(() => db.withTransactionAsync(fn));
  transactionTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function initDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(SCHEMA_STATEMENTS.join('\n'));
  await ensureColumn(db, 'books', 'content_hash', 'TEXT');
  await ensureColumn(db, 'scripture_chapters', 'content_hash', 'TEXT');
}

async function ensureColumn(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (rows.some((row) => row.name === column)) return;
  await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
