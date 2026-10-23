import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { getSnapshot } from '../db/database';
import { rescheduleReminders } from './notifications';

export const REMINDER_REFRESH_TASK = 'remindly-daily-reminder-refresh';

TaskManager.defineTask(REMINDER_REFRESH_TASK, async () => {
  try {
    const snapshot = await getSnapshot();
    await rescheduleReminders(snapshot.items, snapshot.completions, snapshot.settings);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.warn('Background reminder refresh failed:', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerReminderRefreshTask(): Promise<void> {
  const registered = await TaskManager.isTaskRegisteredAsync(REMINDER_REFRESH_TASK);
  if (!registered) await BackgroundTask.registerTaskAsync(REMINDER_REFRESH_TASK, { minimumInterval: 12 * 60 });
}
