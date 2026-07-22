import { describe, expect, it } from "vitest";
import type { PlayerFeeSubscription } from "./api";
import {
  filterPlayersByRecurringFees,
  isRecurringFeeExpiringSoon,
} from "./player-fee-filters";

const subscription = (
  overrides: Partial<PlayerFeeSubscription> = {},
): PlayerFeeSubscription => ({
  id: "fee-1",
  academy_id: "academy-1",
  player_id: "player-1",
  player_source: "academy",
  player_name: "Test Player",
  player_email: "player@example.com",
  fee_name: "Monthly academy fee",
  amount: 100,
  currency: "USD",
  billing_cycle: "monthly",
  next_renewal_date: "2026-07-29",
  reminder_days_before: 7,
  status: "active",
  ...overrides,
});

describe("recurring player fee filters", () => {
  const today = new Date("2026-07-22T12:00:00Z");

  it("matches an active recurring fee inside its reminder window", () => {
    expect(isRecurringFeeExpiringSoon(subscription(), today)).toBe(true);
  });

  it("excludes paused, overdue, and later recurring fees from expiring soon", () => {
    expect(isRecurringFeeExpiringSoon(subscription({ status: "paused" }), today)).toBe(false);
    expect(isRecurringFeeExpiringSoon(subscription({ next_renewal_date: "2026-07-21" }), today)).toBe(false);
    expect(isRecurringFeeExpiringSoon(subscription({ next_renewal_date: "2026-07-30" }), today)).toBe(false);
  });

  it("matches players by both player id and registration source", () => {
    const players = [
      { id: "player-1", isSelfRegistered: false },
      { id: "player-1", isSelfRegistered: true },
      { id: "player-2", isSelfRegistered: false },
    ];

    expect(filterPlayersByRecurringFees(players, [subscription()], "active", today)).toEqual([
      players[0],
    ]);
  });
});
