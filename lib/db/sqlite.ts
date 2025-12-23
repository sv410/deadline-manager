import sqlite3 from 'sqlite3';
import path from 'path';
import { promisify } from 'util';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data');
const dbFile = path.join(dbPath, 'deadlines.db');

// Ensure data directory exists
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

let db: sqlite3.Database | null = null;

export function getDatabase(): sqlite3.Database {
  if (!db) {
    db = new sqlite3.Database(dbFile);
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');
  }
  return db;
}

export async function initializeDatabase() {
  const database = getDatabase();

  const run = promisify(database.run.bind(database));

  try {
    // Users table
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notification_preferences TEXT,
        timezone TEXT DEFAULT 'UTC'
      )
    `);

    // Deadlines table
    await run(`
      CREATE TABLE IF NOT EXISTS deadlines (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        due_date DATETIME NOT NULL,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        color TEXT DEFAULT '#ff7f50',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Time tracking table
    await run(`
      CREATE TABLE IF NOT EXISTS time_tracking (
        id TEXT PRIMARY KEY,
        deadline_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (deadline_id) REFERENCES deadlines(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Notifications table
    await run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        deadline_id TEXT,
        type TEXT NOT NULL,
        channel TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        recipient TEXT NOT NULL,
        subject TEXT,
        body TEXT,
        scheduled_at DATETIME,
        sent_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (deadline_id) REFERENCES deadlines(id) ON DELETE CASCADE
      )
    `);

    // Integrations table
    await run(`
      CREATE TABLE IF NOT EXISTS integrations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        config TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Calendar events table
    await run(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id TEXT PRIMARY KEY,
        deadline_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        calendar_id TEXT,
        external_event_id TEXT,
        synced_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (deadline_id) REFERENCES deadlines(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await run(`CREATE INDEX IF NOT EXISTS idx_deadlines_user ON deadlines(user_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_deadlines_status ON deadlines(status)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_time_tracking_deadline ON time_tracking(deadline_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_integrations_user ON integrations(user_id)`);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

export function queryAsync(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function runAsync(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function getAsync(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export async function closeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) reject(err);
        else {
          db = null;
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}
