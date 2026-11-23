import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const dbPath = process.env.DB_PATH || path.join(here, '..', 'library.db');

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON');

// Keep multi-statement book/loan operations atomic with the built-in SQLite driver.
db.transaction = (operation) => (...args) => {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = operation(...args);
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
};

export function runSchema() {
  const sql = fs.readFileSync(path.join(here, '..', 'schema.sql'), 'utf8');
  db.exec(sql);
}

// create tables on first run so `npm start` works without seeding
const hasUsers = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
if (!hasUsers) runSchema();
