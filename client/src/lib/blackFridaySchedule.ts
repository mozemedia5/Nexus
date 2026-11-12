export type Countdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

/** The promotion is visible from Wednesday 00:00 through Friday 23:59:59 UTC. */
export function isBlackFridayPromoActive(now: Date): boolean {
  const utcDay = now.getUTCDay();
  return utcDay >= 3 && utcDay < 6;
}

/** Counts down to the next Saturday at 00:00 UTC. */
export function timeUntilSaturdayReset(now: Date): Countdown {
  const daysUntilSaturday = (6 - now.getUTCDay() + 7) % 7;
  const resetAt = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilSaturday,
    ),
  );

  if (resetAt.getTime() <= now.getTime()) {
    resetAt.setUTCDate(resetAt.getUTCDate() + 7);
  }

  const secondsRemaining = Math.max(
    0,
    Math.floor((resetAt.getTime() - now.getTime()) / 1_000),
  );

  return {
    days: Math.floor(secondsRemaining / 86_400),
    hours: Math.floor((secondsRemaining % 86_400) / 3_600),
    minutes: Math.floor((secondsRemaining % 3_600) / 60),
    seconds: secondsRemaining % 60,
  };
}
