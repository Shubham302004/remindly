import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationPriority, AndroidNotificationVisibility, SchedulableTriggerInputTypes } from 'expo-notifications';
import { buildReminderPlan, MAX_SCHEDULED_NOTIFICATIONS } from '../domain/reminderPlan';
import type { AppSettings, ReminderItem } from '../domain/types';

export const REMINDER_CHANNEL_ID = 'remindly-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Remindly reminders',
    description: 'Habit and task reminders, including follow-up nudges.',
    importance: AndroidImportance.HIGH,
    vibrationPattern: [0, 220, 140, 220],
    lightColor: '#527A67',
    sound: 'default',
    lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
  });
}

export async function requestNotificationPermission(): Promise<Notifications.NotificationPermissionsStatus> {
  await ensureNotificationChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return current;
  return Notifications.requestPermissionsAsync();
}

export async function requestExactAlarmPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const current = await Notifications.getExactAlarmPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestExactAlarmPermissionsAsync();
  return requested.granted;
}

export async function getReminderPermissionStatus(): Promise<{ notifications: boolean; exactAlarms: boolean }> {
  const permission = await Notifications.getPermissionsAsync();
  const exact = Platform.OS === 'android' ? await Notifications.getExactAlarmPermissionsAsync() : { granted: true };
  return { notifications: permission.granted, exactAlarms: exact.granted };
}

export interface ScheduleReport {
  scheduled: number;
  omitted: number;
  limit: number;
  horizonEnd: Date;
}

let lastReport: ScheduleReport = { scheduled: 0, omitted: 0, limit: MAX_SCHEDULED_NOTIFICATIONS, horizonEnd: new Date() };
export function getLastScheduleReport(): ScheduleReport { return lastReport; }

export async function rescheduleReminders(
  items: readonly ReminderItem[],
  completions: Readonly<Record<string, readonly string[]>>,
  settings: AppSettings,
  now = new Date(),
): Promise<ScheduleReport> {
  await ensureNotificationChannel();
  const plan = buildReminderPlan({ items, completions, settings, now });
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (let offset = 0; offset < plan.notifications.length; offset += 20) {
    const batch = plan.notifications.slice(offset, offset + 20);
    await Promise.all(batch.map((planned) => Notifications.scheduleNotificationAsync({
      content: {
        title: 'Remindly',
        body: planned.body,
        data: { kind: 'reminder', itemIds: planned.itemIds },
        sound: 'default',
        priority: AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: planned.fireDate,
        channelId: REMINDER_CHANNEL_ID,
        delivery: 'bestEffort',
      },
    })));
  }
  lastReport = { scheduled: plan.notifications.length, omitted: plan.droppedCount, limit: MAX_SCHEDULED_NOTIFICATIONS, horizonEnd: plan.horizonEnd };
  return lastReport;
}

export async function scheduleTestNotification(): Promise<void> {
  await ensureNotificationChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Remindly test', body: 'Notifications are ready on this device.', data: { kind: 'test' }, sound: 'default' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + 5_000), channelId: REMINDER_CHANNEL_ID, delivery: 'bestEffort' },
  });
}
