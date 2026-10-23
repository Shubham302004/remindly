import * as SQLite from 'expo-sqlite';
import { DEFAULT_SETTINGS } from '../domain/types';
import type { AppSettings, AppSnapshot, BackupData, ReminderItem } from '../domain/types';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function database(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const db = await SQLite.openDatabaseAsync('remindly.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS items (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          notes TEXT NOT NULL DEFAULT '',
          kind TEXT NOT NULL CHECK(kind IN ('habit', 'daily', 'permanent')),
          reminder_times TEXT NOT NULL,
          due_date TEXT,
          created_at TEXT NOT NULL,
          archived INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS completions (
          item_id TEXT NOT NULL,
          local_date TEXT NOT NULL,
          completed_at TEXT NOT NULL,
          PRIMARY KEY (item_id, local_date),
          FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS completions_by_date ON completions(local_date);
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);
      return db;
    })();
  }
  return databasePromise;
}

export async function initializeDatabase(): Promise<void> {
  await database();
}

function toItem(row: Record<string, unknown>): ReminderItem {
  return {
    id: String(row.id),
    title: String(row.title),
    notes: String(row.notes ?? ''),
    kind: row.kind as ReminderItem['kind'],
    reminderTimes: JSON.parse(String(row.reminder_times)) as string[],
    dueDate: row.due_date ? String(row.due_date) : null,
    createdAt: String(row.created_at),
    archived: Number(row.archived) === 1,
  };
}

export async function getSnapshot(): Promise<AppSnapshot> {
  const db = await database();
  const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM items ORDER BY created_at ASC');
  const completionRows = await db.getAllAsync<{ item_id: string; local_date: string }>('SELECT item_id, local_date FROM completions ORDER BY local_date ASC');
  const settingRows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM app_settings');
  const settings: AppSettings = { ...DEFAULT_SETTINGS, quietHours: { ...DEFAULT_SETTINGS.quietHours } };
  for (const row of settingRows) {
    try {
      const value: unknown = JSON.parse(row.value);
      if (row.key === 'nagIntervalMinutes' && typeof value === 'number' && value > 0) settings.nagIntervalMinutes = value;
      if (row.key === 'quietHours' && value && typeof value === 'object') settings.quietHours = { ...settings.quietHours, ...(value as AppSettings['quietHours']) };
      if (row.key === 'onboardingComplete' && typeof value === 'boolean') settings.onboardingComplete = value;
    } catch {
      // Ignore a malformed preference and keep the safe default.
    }
  }
  const completions: Record<string, string[]> = {};
  for (const row of completionRows) (completions[row.item_id] ??= []).push(row.local_date);
  return { items: rows.map(toItem), completions, settings };
}

export async function saveItem(item: ReminderItem): Promise<void> {
  const db = await database();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO items (id, title, notes, kind, reminder_times, due_date, created_at, archived, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET title=excluded.title, notes=excluded.notes, kind=excluded.kind,
       reminder_times=excluded.reminder_times, due_date=excluded.due_date, archived=excluded.archived,
       updated_at=excluded.updated_at`,
    item.id, item.title.trim(), item.notes, item.kind, JSON.stringify(item.reminderTimes), item.dueDate,
    item.createdAt || now, item.archived ? 1 : 0, now,
  );
}

export async function setCompletion(itemId: string, dateKey: string, completed: boolean, permanent: boolean): Promise<void> {
  const db = await database();
  if (completed) {
    await db.runAsync('INSERT OR IGNORE INTO completions (item_id, local_date, completed_at) VALUES (?, ?, ?)', itemId, dateKey, new Date().toISOString());
  } else if (permanent) {
    await db.runAsync('DELETE FROM completions WHERE item_id = ?', itemId);
  } else {
    await db.runAsync('DELETE FROM completions WHERE item_id = ? AND local_date = ?', itemId, dateKey);
  }
}

export async function archiveItem(itemId: string): Promise<void> {
  const db = await database();
  await db.runAsync('UPDATE items SET archived = 1, updated_at = ? WHERE id = ?', new Date().toISOString(), itemId);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await database();
  for (const [key, value] of Object.entries(settings)) {
    await db.runAsync('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', key, JSON.stringify(value));
  }
}

export async function createBackup(): Promise<BackupData> {
  const snapshot = await getSnapshot();
  return { format: 'remindly-backup', version: 1, exportedAt: new Date().toISOString(), ...snapshot };
}

export function isBackupData(value: unknown): value is BackupData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<BackupData>;
  return data.format === 'remindly-backup' && data.version === 1 && Array.isArray(data.items) &&
    Boolean(data.completions && typeof data.completions === 'object') && Boolean(data.settings && typeof data.settings === 'object');
}

export async function restoreBackup(backup: BackupData): Promise<void> {
  const db = await database();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM completions');
    await db.runAsync('DELETE FROM items');
    await db.runAsync('DELETE FROM app_settings');
    for (const item of backup.items) {
      await db.runAsync(
        'INSERT INTO items (id, title, notes, kind, reminder_times, due_date, created_at, archived, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        item.id, item.title, item.notes ?? '', item.kind, JSON.stringify(item.reminderTimes), item.dueDate,
        item.createdAt, item.archived ? 1 : 0, new Date().toISOString(),
      );
    }
    for (const [itemId, dates] of Object.entries(backup.completions)) {
      for (const date of dates) {
        await db.runAsync('INSERT OR IGNORE INTO completions (item_id, local_date, completed_at) VALUES (?, ?, ?)', itemId, date, new Date().toISOString());
      }
    }
    await saveSettings(backup.settings);
  });
}
