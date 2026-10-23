function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function calculateCurrentStreak(completedDates: readonly string[], today: string): number {
  const completed = new Set(completedDates);
  let cursor = completed.has(today) ? today : shiftDateKey(today, -1);
  let streak = 0;
  while (completed.has(cursor)) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }
  return streak;
}

export function calculateBestStreak(completedDates: readonly string[]): number {
  const days = [...new Set(completedDates)].sort();
  if (days.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let index = 1; index < days.length; index += 1) {
    if (days[index] === shiftDateKey(days[index - 1], 1)) run += 1;
    else run = 1;
    best = Math.max(best, run);
  }
  return best;
}
