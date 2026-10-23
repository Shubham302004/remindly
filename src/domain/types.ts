export type ItemKind = 'habit' | 'daily' | 'permanent';

export interface ReminderItem {
  id: string;
  title: string;
  notes: string;
  kind: ItemKind;
  reminderTimes: string[];
  dueDate: string | null;
  createdAt: string;
  archived: boolean;
}

export interface QuietHours {
  enabled: boolean;
  start: string;
  end: string;
}

export interface AppSettings {
  nagIntervalMinutes: number;
  quietHours: QuietHours;
  onboardingComplete: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  nagIntervalMinutes: 30,
  quietHours: { enabled: false, start: '22:00', end: '07:00' },
  onboardingComplete: false,
};

export interface AppSnapshot {
  items: ReminderItem[];
  completions: Record<string, string[]>;
  settings: AppSettings;
}

export interface BackupData extends AppSnapshot {
  format: 'remindly-backup';
  version: 1;
  exportedAt: string;
}
