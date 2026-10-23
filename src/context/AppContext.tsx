import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { archiveItem as archiveItemInDb, getSnapshot, initializeDatabase, restoreBackup, saveItem as saveItemInDb, saveSettings as saveSettingsInDb, setCompletion as setCompletionInDb } from '../db/database';
import { localDateKey } from '../domain/dates';
import type { AppSettings, AppSnapshot, BackupData, ReminderItem } from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/types';
import { registerReminderRefreshTask } from '../services/backgroundRefresh';
import { ensureNotificationChannel, rescheduleReminders } from '../services/notifications';

interface AppContextValue extends AppSnapshot {
  ready: boolean;
  saveItem: (item: ReminderItem) => Promise<void>;
  archiveItem: (id: string) => Promise<void>;
  markDone: (id: string, completed: boolean) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  importBackup: (backup: BackupData) => Promise<void>;
  reload: () => Promise<AppSnapshot>;
}

const AppContext = createContext<AppContextValue | null>(null);
const emptySnapshot: AppSnapshot = { items: [], completions: {}, settings: DEFAULT_SETTINGS };

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<AppSnapshot>(emptySnapshot);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const fresh = await getSnapshot();
    setSnapshot(fresh);
    return fresh;
  }, []);

  const synchronize = useCallback(async (next?: AppSnapshot) => {
    const fresh = next ?? await getSnapshot();
    setSnapshot(fresh);
    try { await rescheduleReminders(fresh.items, fresh.completions, fresh.settings); }
    catch (error) { console.warn('Could not refresh reminder schedule:', error); }
    return fresh;
  }, []);

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      await initializeDatabase();
      const fresh = await getSnapshot();
      if (!mounted) return;
      setSnapshot(fresh);
      setReady(true);
      await ensureNotificationChannel();
      try { await registerReminderRefreshTask(); } catch (error) { console.warn('Background refresh unavailable:', error); }
      try { await rescheduleReminders(fresh.items, fresh.completions, fresh.settings); }
      catch (error) { console.warn('Initial reminder schedule failed:', error); }
    };
    void start().catch((error) => { console.error('Remindly startup failed:', error); if (mounted) setReady(true); });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void getSnapshot().then((fresh) => synchronize(fresh)).catch((error) => console.warn('Foreground refresh failed:', error));
    });
    return () => { mounted = false; subscription.remove(); };
  }, [synchronize]);

  const saveItem = useCallback(async (item: ReminderItem) => {
    await saveItemInDb(item);
    await synchronize();
  }, [synchronize]);

  const archive = useCallback(async (id: string) => {
    await archiveItemInDb(id);
    await synchronize();
  }, [synchronize]);

  const markDone = useCallback(async (id: string, completed: boolean) => {
    const item = snapshot.items.find((candidate) => candidate.id === id);
    if (!item) return;
    await setCompletionInDb(id, localDateKey(), completed, item.kind === 'permanent');
    await synchronize();
  }, [snapshot.items, synchronize]);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const merged: AppSettings = { ...snapshot.settings, ...patch, quietHours: { ...snapshot.settings.quietHours, ...(patch.quietHours ?? {}) } };
    await saveSettingsInDb(merged);
    await synchronize({ ...snapshot, settings: merged });
  }, [snapshot, synchronize]);

  const importBackup = useCallback(async (backup: BackupData) => {
    await restoreBackup(backup);
    await synchronize();
  }, [synchronize]);

  const value = useMemo<AppContextValue>(() => ({ ...snapshot, ready, saveItem, archiveItem: archive, markDone, updateSettings, importBackup, reload }),
    [snapshot, ready, saveItem, archive, markDone, updateSettings, importBackup, reload]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be called within AppProvider');
  return context;
}
