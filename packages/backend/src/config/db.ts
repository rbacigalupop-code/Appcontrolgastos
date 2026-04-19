import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { env } from './env';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    const dir = path.dirname(env.DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    _db = new Database(env.DB_PATH);
    _db.pragma('foreign_keys = ON');
    _db.pragma('journal_mode = WAL');

    const migrationPath = path.resolve(__dirname, '../db/migrations/001_init.sql');
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      _db.exec(sql);
    }
  }
  return _db;
}
