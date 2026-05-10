// SuperMemo SM-2 algorithm.
// quality 0-5, where 0-2 = wrong (reset), 3-5 = correct.
export function sm2(prev: { ease_factor: number; interval_days: number; repetitions: number }, quality: number) {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  let { ease_factor, interval_days, repetitions } = prev;

  if (q < 3) {
    repetitions = 0;
    interval_days = 1;
  } else {
    if (repetitions === 0) interval_days = 1;
    else if (repetitions === 1) interval_days = 6;
    else interval_days = Math.round(interval_days * ease_factor);
    repetitions += 1;
  }
  ease_factor = Math.max(1.3, ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  const due_at = new Date(Date.now() + interval_days * 86400000).toISOString();
  return { ease_factor, interval_days, repetitions, due_at };
}
