import { describe, expect, it } from "vitest";
import { DAY_MS, isDue, newCard, reviewCard } from "../srs";

describe("SM-2 scheduling", () => {
  const now = 1_000_000;

  it("treats unseen cards as due", () => {
    expect(isDue(undefined, now)).toBe(true);
    expect(isDue(newCard(now), now)).toBe(true);
  });

  it("schedules 1 day, then 6 days, then ease-scaled intervals for Good answers", () => {
    const c1 = reviewCard(newCard(now), 4, now);
    expect(c1.interval).toBe(1);
    expect(c1.due).toBe(now + DAY_MS);
    const c2 = reviewCard(c1, 4, now);
    expect(c2.interval).toBe(6);
    const c3 = reviewCard(c2, 4, now);
    expect(c3.interval).toBe(Math.round(6 * c2.ease));
    expect(c3.reps).toBe(3);
  });

  it("resets progress and lowers ease on a lapse", () => {
    const learned = reviewCard(reviewCard(newCard(now), 4, now), 4, now);
    const lapsed = reviewCard(learned, 1, now);
    expect(lapsed.reps).toBe(0);
    expect(lapsed.interval).toBe(0);
    expect(lapsed.ease).toBeLessThan(learned.ease);
    expect(lapsed.due).toBeGreaterThan(now);
    expect(lapsed.due).toBeLessThan(now + DAY_MS);
  });

  it("never lets ease fall below 1.3", () => {
    let c = newCard(now);
    for (let i = 0; i < 20; i++) c = reviewCard(c, 1, now);
    expect(c.ease).toBe(1.3);
  });

  it("Easy grows the interval faster than Hard", () => {
    const base = reviewCard(reviewCard(newCard(now), 4, now), 4, now);
    expect(reviewCard(base, 5, now).interval).toBeGreaterThan(reviewCard(base, 3, now).interval);
  });
});
