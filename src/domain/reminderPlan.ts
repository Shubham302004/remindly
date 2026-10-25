import { addLocalDays, dateAtTime, isWithinQuietHours, localDateKey } from './dates';
import type { AppSettings, ReminderItem } from './types';

export const REMINDER_HORIZON_HOURS = 24;
export const MAX_SCHEDULED_NOTIFICATIONS = 450;

export interface PlannedReminder {
  fireDate: Date;
  itemIds: string[];
  body: string;
}

export interface ReminderPlan {
  notifications: PlannedReminder[];
  droppedCount: number;
  horizonEnd: Date;
}

interface ReminderPlanOptions {
  items: readonly ReminderItem[];
  completions: Readonly<Record<string, readonly string[]>>;
  settings: AppSettings;
  now?: Date;
  horizonHours?: number;
  maxNotifications?: number;
}

function formatItemMessage(items: ReminderItem[], overdueIds: Set<string>): string {
  if (items.length === 1) {
    return overdueIds.has(items[0].id)
      ? `${items[0].title} is overdue. Time to take care of it.`
      : `Time for ${items[0].title}.`;
  }
  const labels = items.map((item) => overdueIds.has(item.id) ? `${item.title} (overdue)` : item.title);
  const visible = labels.slice(0, 3).join(', ');
  const more = labels.length > 3 ? `, and ${labels.length - 3} more` : '';
  return `A reminder for ${visible}${more}.`;
}

function isCompletedForDay(item: ReminderItem, dateKey: string, completedDates: readonly string[]): boolean {
  if (item.kind === 'permanent') return completedDates.length > 0;
  return completedDates.includes(dateKey);
}

export function buildReminderPlan({
  items,
  completions,
  settings,
  now = new Date(),
  horizonHours = REMINDER_HORIZON_HOURS,
  maxNotifications = MAX_SCHEDULED_NOTIFICATIONS,
}: ReminderPlanOptions): ReminderPlan {
  const horizonEnd = new Date(now.getTime() + horizonHours * 60 * 60 * 1000);
  const byInstant = new Map<number, Map<string, ReminderItem>>();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  let day = dayStart;

  while (day.getTime() <= horizonEnd.getTime()) {
    const dayKey = localDateKey(day);
    const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1, 0, 0, 0, 0);
    for (const item of items) {
      if (item.archived || item.reminderTimes.length === 0) continue;
      // Do not schedule reminders for tasks whose due date is in the future
      if (item.dueDate && item.dueDate > dayKey) continue;
      const doneDates = completions[item.id] ?? [];
      if (isCompletedForDay(item, dayKey, doneDates)) continue;
      const itemTimes = new Set<number>();

      // Per-item nag interval configuration
      const taskNagMinutes = item.nagEnabled ? (item.nagIntervalMinutes ?? settings.nagIntervalMinutes ?? 30) : 0;
      const intervalMs = Math.max(0, taskNagMinutes) * 60 * 1000;

      for (const reminderTime of item.reminderTimes) {
        let fire = dateAtTime(day, reminderTime);
        if (fire.getTime() < now.getTime() + 2_000) {
          if (intervalMs === 0) continue;
          const elapsed = now.getTime() - fire.getTime();
          const steps = Math.floor(elapsed / intervalMs) + 1;
          fire = new Date(fire.getTime() + steps * intervalMs);
        }
        while (fire.getTime() < dayEnd.getTime() && fire.getTime() <= horizonEnd.getTime()) {
          if (fire.getTime() >= now.getTime() + 2_000 && !itemTimes.has(fire.getTime())) {
            if (!settings.quietHours.enabled || !isWithinQuietHours(fire, settings.quietHours.start, settings.quietHours.end)) {
              itemTimes.add(fire.getTime());
              let group = byInstant.get(fire.getTime());
              if (!group) {
                group = new Map<string, ReminderItem>();
                byInstant.set(fire.getTime(), group);
              }
              group.set(item.id, item);
            }
          }
          if (intervalMs === 0) break;
          fire = new Date(fire.getTime() + intervalMs);
        }
      }
    }
    day = addLocalDays(day, 1);
  }

  const all = [...byInstant.entries()]
    .sort(([a], [b]) => a - b)
    .map(([timestamp, group]) => {
      const groupedItems = [...group.values()];
      const overdueIds = new Set(groupedItems.filter((item) => item.kind !== 'habit' && Boolean(item.dueDate && item.dueDate < localDateKey(new Date(timestamp)))).map((item) => item.id));
      return {
        fireDate: new Date(timestamp),
        itemIds: groupedItems.map((item) => item.id),
        body: formatItemMessage(groupedItems, overdueIds),
      };
    });

  return {
    notifications: all.slice(0, maxNotifications),
    droppedCount: Math.max(0, all.length - maxNotifications),
    horizonEnd,
  };
}
