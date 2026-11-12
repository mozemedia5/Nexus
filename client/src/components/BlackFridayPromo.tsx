import { useEffect, useState } from "react";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { Link } from "wouter";
import {
  isBlackFridayPromoActive,
  timeUntilSaturdayReset,
} from "@/lib/blackFridaySchedule";
import "./BlackFridayPromo.css";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export default function BlackFridayPromo() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!isBlackFridayPromoActive(now)) return null;

  const countdown = timeUntilSaturdayReset(now);
  const countdownLabel = `Resets in ${countdown.days} days, ${countdown.hours} hours, ${countdown.minutes} minutes, and ${countdown.seconds} seconds`;

  return (
    <aside className="black-friday-promo" aria-label="Black Friday weekly deal">
      <div className="black-friday-promo__inner">
        <div className="black-friday-promo__intro">
          <p className="black-friday-promo__eyebrow">
            Black Friday <span aria-hidden="true">/</span> Nexus weekly deal
          </p>
          <p className="black-friday-promo__headline">
            Buy 2, get <span>30% off</span>
          </p>
          <p className="black-friday-promo__fineprint">
            This offer window closes Saturday at 00:00 UTC.
          </p>
        </div>

        <div className="black-friday-promo__actions">
          <div
            className="black-friday-promo__timer"
            role="timer"
            aria-label={countdownLabel}
          >
            <Clock3 size={16} aria-hidden="true" />
            <span>Ends in</span>
            <strong>
              {countdown.days}d {pad(countdown.hours)}:{pad(countdown.minutes)}:
              {pad(countdown.seconds)}
            </strong>
          </div>
          <Link href="/products" className="black-friday-promo__button">
            Shop the deal <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
