import { useEffect, useState } from "react";
import { ArrowUpRight, Clock3, Sparkles } from "lucide-react";
import { Link } from "wouter";

type Countdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function timeUntilSaturdayReset(now: Date): Countdown {
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
    Math.floor((resetAt.getTime() - now.getTime()) / 1000),
  );
  const days = Math.floor(secondsRemaining / 86_400);
  const hours = Math.floor((secondsRemaining % 86_400) / 3_600);
  const minutes = Math.floor((secondsRemaining % 3_600) / 60);
  const seconds = secondsRemaining % 60;

  return { days, hours, minutes, seconds };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export default function BlackFridayPromo() {
  const [countdown, setCountdown] = useState<Countdown>(() =>
    timeUntilSaturdayReset(new Date()),
  );

  useEffect(() => {
    const update = () => setCountdown(timeUntilSaturdayReset(new Date()));
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <aside className="relative isolate overflow-hidden border-y border-amber-300/25 bg-gradient-to-r from-[#11100f] via-[#251a12] to-[#11100f] px-4 py-4 text-white shadow-lg sm:px-7 sm:py-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(ellipse_at_18%_50%,rgba(245,158,11,.28),transparent_45%),radial-gradient(ellipse_at_88%_50%,rgba(220,38,38,.16),transparent_42%)]"
      />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-300/40 bg-amber-300/10 text-amber-200">
            <Sparkles size={19} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-200">
              Black Friday · Nexus weekly deal
            </p>
            <p className="mt-1 text-lg font-black leading-tight tracking-tight sm:text-2xl">
              Buy 2, get <span className="text-amber-300">30% off</span>
            </p>
            <p className="mt-1 text-xs text-stone-300 sm:text-sm">
              The offer countdown resets every Saturday at 00:00 UTC.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <div
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2"
            aria-label={`Next weekly reset in ${countdown.days} days, ${countdown.hours} hours, ${countdown.minutes} minutes, and ${countdown.seconds} seconds`}
          >
            <Clock3 size={15} className="shrink-0 text-amber-300" aria-hidden="true" />
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-stone-300 sm:text-[10px]">
              Resets in
            </span>
            <span className="font-mono text-sm font-bold tabular-nums text-white sm:text-base">
              {countdown.days}d {pad(countdown.hours)}:{pad(countdown.minutes)}:{pad(countdown.seconds)}
            </span>
          </div>
          <Link
            href="/products"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-2 text-xs font-extrabold text-stone-950 transition-colors hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
          >
            Shop the deal <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
