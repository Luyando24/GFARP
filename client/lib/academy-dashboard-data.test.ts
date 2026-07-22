import { describe, expect, it } from "vitest";
import {
  hasCurrentSubscription,
  getDashboardPlayerTotal,
  normalizeAcademyDashboardProfile,
} from "./academy-dashboard-data";

describe("academy dashboard data", () => {
  it("accepts and normalizes an academy profile without a subscription property", () => {
    expect(normalizeAcademyDashboardProfile({
      id: "academy-1",
      name: "Example Academy",
      director_name: "Academy Director",
      founded_year: 2018,
    })).toMatchObject({
      id: "academy-1",
      name: "Example Academy",
      directorName: "Academy Director",
      foundedYear: 2018,
      address: "",
      phone: "",
    });
  });

  it("only reports a subscription when a real subscription object exists", () => {
    expect(hasCurrentSubscription({ subscription: null })).toBe(false);
    expect(hasCurrentSubscription({ subscription: { id: "subscription-1" } })).toBe(true);
  });

  it("keeps the player total even when unrelated dashboard requests fail", () => {
    expect(getDashboardPlayerTotal({
      success: true,
      data: { pagination: { total: 27 } },
    }, { success: false })).toBe(27);

    expect(getDashboardPlayerTotal({ success: false }, {
      success: true,
      data: { totalPlayers: 19 },
    })).toBe(19);
  });
});
