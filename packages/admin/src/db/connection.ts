import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let _db: Database.Database | null = null;

/**
 * Get or create the SQLite database connection.
 * The database file is stored at the monorepo root as `surreysocieties.db`.
 * In production, set the ADMIN_DB_PATH environment variable.
 */
export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = process.env.ADMIN_DB_PATH || path.resolve(__dirname, '../../../../surreysocieties.db');

  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  return _db;
}

/**
 * Close the database connection (for clean shutdown).
 */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
