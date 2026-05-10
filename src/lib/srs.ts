// SuperMemo SM-2 with new-card learning steps and manual-retry handling.
// quality 0-5: 0-2 = wrong, 3 = hard, 4 = good, 5 = easy.
// Learning steps (in minutes) are used while repetitions === 0 (i.e. new cards
// or cards reset by an "Again"). After graduating, intervals follow SM-2.

export type SrsState = {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
};

export type SrsResult = SrsState & { due_at: string };

export const LEARNING_STEPS_MIN = [1, 10] as const; // 1 min, 10 min, then graduate

function nowPlusMin(min: number) {
  return new Date(Date.now() + min * 60_000).toISOString();
}
function nowPlusDays(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

export function sm2(prev: SrsState, quality: number): SrsResult {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  let { ease_factor, interval_days, repetitions } = prev;

  // --- AGAIN (forgot) -> reset to start of learning steps
  if (q < 3) {
    repetitions = 0;
    interval_days = 0; // not yet graduated
    ease_factor = Math.max(1.3, ease_factor - 0.2);
    return { ease_factor, interval_days, repetitions, due_at: nowPlusMin(LEARNING_STEPS_MIN[0]) };
  }

  // --- LEARNING (still in steps)
  if (repetitions < LEARNING_STEPS_MIN.length) {
    // HARD on a learning card -> repeat current step
    if (q === 3) {
      const step = LEARNING_STEPS_MIN[Math.min(repetitions, LEARNING_STEPS_MIN.length - 1)];
      return { ease_factor, interval_days: 0, repetitions, due_at: nowPlusMin(step) };
    }
    // GOOD -> next step or graduate
    if (q === 4) {
      const nextRep = repetitions + 1;
      if (nextRep < LEARNING_STEPS_MIN.length) {
        return { ease_factor, interval_days: 0, repetitions: nextRep, due_at: nowPlusMin(LEARNING_STEPS_MIN[nextRep]) };
      }
      // Graduate to 1 day
      return { ease_factor, interval_days: 1, repetitions: nextRep, due_at: nowPlusDays(1) };
    }
    // EASY -> graduate immediately to 4 days, bump ease
    ease_factor = Math.max(1.3, ease_factor + 0.15);
    return { ease_factor, interval_days: 4, repetitions: LEARNING_STEPS_MIN.length + 1, due_at: nowPlusDays(4) };
  }

  // --- REVIEW phase (graduated)
  let nextInterval: number;
  if (q === 3) {
    // HARD: 1.2x prior interval, lower ease
    nextInterval = Math.max(1, Math.round(interval_days * 1.2));
    ease_factor = Math.max(1.3, ease_factor - 0.15);
  } else if (q === 4) {
    nextInterval = Math.max(1, Math.round(interval_days * ease_factor));
  } else {
    // EASY bonus
    nextInterval = Math.max(1, Math.round(interval_days * ease_factor * 1.3));
    ease_factor = Math.max(1.3, ease_factor + 0.15);
  }
  // Standard SM-2 ease tweak
  ease_factor = Math.max(1.3, ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  return {
    ease_factor,
    interval_days: nextInterval,
    repetitions: repetitions + 1,
    due_at: nowPlusDays(nextInterval),
  };
}

/** Bucket cards by due-date for the next N days (today + future). */
export function forecastByDay(cards: { due_at: string }[], days = 7) {
  const buckets = new Map<string, number>();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(today.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    buckets.set(d, 0);
  }
  for (const c of cards) {
    const d = new Date(c.due_at);
    if (isNaN(d.getTime())) continue;
    const key = d < today ? today.toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  return Array.from(buckets.entries()).map(([day, count]) => ({ day, count }));
}
