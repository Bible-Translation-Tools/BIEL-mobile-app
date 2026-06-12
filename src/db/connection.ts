import * as SQLite from 'expo-sqlite';

import { DATABASE_NAME, SCHEMA_STATEMENTS } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let transactionTail: Promise<unknown> = Promise.resolve();

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

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  return dbPromise;
}

export async function initDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(SCHEMA_STATEMENTS.join('\n'));
}
