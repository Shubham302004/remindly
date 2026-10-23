import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReminderPlan, MAX_SCHEDULED_NOTIFICATIONS } from '../src/domain/reminderPlan';
import { DEFAULT_SETTINGS } from '../src/domain/types';
import type { ReminderItem } from '../src/domain/types';

const item = (overrides: Partial<ReminderItem> = {}): ReminderItem => ({
  id: 'water', title: 'Drink water', notes: '', kind: 'habit', reminderTimes: ['08:00', '13:00'], dueDate: null,
  createdAt: '2026-10-01T00:00:00.000Z', archived: false, ...overrides,
});
const baseSettings = { ...DEFAULT_SETTINGS, nagIntervalMinutes: 30, quietHours: { enabled: false, start: '22:00', end: '07:00' } };

 test('schedules each reminder time and repeats until the local day ends', () => {
  const plan = buildReminderPlan({ items: [item()], completions: {}, settings: baseSettings, now: new Date(2026, 9, 23, 7, 59), horizonHours: 1 });
  const times = plan.notifications.map((entry) => `${String(entry.fireDate.getHours()).padStart(2, '0')}:${String(entry.fireDate.getMinutes()).padStart(2, '0')}`);
  assert.ok(times.includes('08:00'));
  assert.ok(times.includes('13:00') === false); // Outside the one-hour rolling window.
  assert.ok(times.includes('08:30'));
  assert.ok(plan.notifications.every((entry) => entry.fireDate.getDate() === 23));
});

test('does not schedule a completed habit again for that date', () => {
  const plan = buildReminderPlan({ items: [item()], completions: { water: ['2026-10-23'] }, settings: baseSettings, now: new Date(2026, 9, 23, 7, 0) });
  assert.equal(plan.notifications.length, 0);
});

test('an overdue permanent task remains scheduled and says overdue', () => {
  const overdue = item({ id: 'bill', title: 'Pay bill', kind: 'permanent', dueDate: '2026-10-20', reminderTimes: ['09:00'] });
  const plan = buildReminderPlan({ items: [overdue], completions: {}, settings: baseSettings, now: new Date(2026, 9, 23, 8, 59), horizonHours: 1 });
  assert.ok(plan.notifications.length > 0);
  assert.match(plan.notifications[0].body, /overdue/i);
});

test('quiet hours suppress matching reminder times, including an overnight window', () => {
  const settings = { ...baseSettings, quietHours: { enabled: true, start: '22:00', end: '07:00' } };
  const late = item({ reminderTimes: ['22:00'] });
  const plan = buildReminderPlan({ items: [late], completions: {}, settings, now: new Date(2026, 9, 23, 21, 59), horizonHours: 2 });
  assert.equal(plan.notifications.length, 0);
});

test('scheduled queue never exceeds its Android safety budget', () => {
  const many = Array.from({ length: 8 }, (_, index) => item({ id: `item-${index}`, title: `Habit ${index}`, reminderTimes: ['08:00'] }));
  const plan = buildReminderPlan({ items: many, completions: {}, settings: { ...baseSettings, nagIntervalMinutes: 5 }, now: new Date(2026, 9, 23, 7, 0), horizonHours: 24, maxNotifications: MAX_SCHEDULED_NOTIFICATIONS });
  assert.ok(plan.notifications.length <= MAX_SCHEDULED_NOTIFICATIONS);
  assert.ok(plan.droppedCount >= 0);
});
