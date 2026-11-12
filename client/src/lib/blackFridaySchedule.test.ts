import { describe, expect, it } from "vitest";
import {
  isBlackFridayPromoActive,
  timeUntilSaturdayReset,
} from "./blackFridaySchedule";

describe("Black Friday UTC schedule", () => {
  it("opens at Wednesday 00:00 UTC", () => {
    expect(isBlackFridayPromoActive(new Date("2026-11-11T00:00:00.000Z"))).toBe(true);
  });

  it("stays open through Friday 23:59:59 UTC", () => {
    expect(isBlackFridayPromoActive(new Date("2026-11-13T23:59:59.999Z"))).toBe(true);
  });

  it("closes at Saturday 00:00 UTC and stays closed through Tuesday", () => {
    for (const instant of [
      "2026-11-14T00:00:00.000Z",
      "2026-11-15T12:00:00.000Z",
      "2026-11-17T23:59:59.999Z",
    ]) {
      expect(isBlackFridayPromoActive(new Date(instant))).toBe(false);
    }
  });

  it("counts down from Wednesday midnight to Saturday midnight", () => {
    expect(timeUntilSaturdayReset(new Date("2026-11-11T00:00:00.000Z"))).toEqual({
      days: 3,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it("shows the final second before the banner closes", () => {
    expect(timeUntilSaturdayReset(new Date("2026-11-13T23:59:59.000Z"))).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 1,
    });
  });

  it("rolls the next reset to the following Saturday once the window closes", () => {
    expect(timeUntilSaturdayReset(new Date("2026-11-14T00:00:00.000Z"))).toEqual({
      days: 7,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });
});
