import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBestStreak, calculateCurrentStreak } from '../src/domain/streaks';

test('current streak includes consecutive completed days through today', () => {
  assert.equal(calculateCurrentStreak(['2026-10-21', '2026-10-22', '2026-10-23'], '2026-10-23'), 3);
});

test('an incomplete today preserves yesterday streak until the day is missed', () => {
  assert.equal(calculateCurrentStreak(['2026-10-21', '2026-10-22'], '2026-10-23'), 2);
  assert.equal(calculateCurrentStreak(['2026-10-20', '2026-10-21'], '2026-10-23'), 0);
});

test('best streak is retained even when the current run is shorter', () => {
  assert.equal(calculateBestStreak(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-07', '2026-10-08']), 3);
  assert.equal(calculateBestStreak([]), 0);
});
