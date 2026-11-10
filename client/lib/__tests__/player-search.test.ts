import { describe, expect, it } from "vitest";
import {
  filterPlayersByAdvancedFilters,
  filterPlayersBySearch,
  getPlayerBirthYear,
  matchesDateOfBirth,
} from "../player-search";

const players = [
  {
    id: "1",
    firstName: "Amina",
    lastName: "Banda",
    email: "amina@example.com",
    position: "Midfielder",
    dateOfBirth: "2010-04-12",
    isSelfRegistered: false,
  },
  {
    id: "2",
    firstName: "Joseph",
    lastName: "Phiri",
    email: "joseph@example.com",
    position: "Goalkeeper",
    dateOfBirth: "2012-01-01",
    isSelfRegistered: true,
  },
];

describe("advanced academy player search", () => {
  it("searches by text across name, email, and position", () => {
    expect(filterPlayersBySearch(players, "midfield").map((player) => player.id))
      .toEqual(["1"]);
  });

  it("filters by birth year, position, source, and payment status", () => {
    const result = filterPlayersByAdvancedFilters(
      players,
      {
        birthYear: "2010",
        position: "Midfielder",
        source: "academy",
        paymentStatus: "paid",
      },
      (player) => player.id === "1" ? "paid" : "due",
    );

    expect(result.map((player) => player.id)).toEqual(["1"]);
  });

  it("does not apply a partial birth year while the user is typing", () => {
    expect(
      filterPlayersByAdvancedFilters(players, { birthYear: "201" }),
    ).toHaveLength(2);
    expect(getPlayerBirthYear("not-a-date")).toBeNull();
  });
});

describe("matchesDateOfBirth", () => {
  it("matches a full year, an ISO prefix, and local date formats", () => {
    expect(matchesDateOfBirth("2010-04-12", "2010")).toBe(true);
    expect(matchesDateOfBirth("2010-04-12", "2010-04")).toBe(true);
    expect(matchesDateOfBirth("2010-04-12", "12/04/2010")).toBe(true);
    expect(matchesDateOfBirth("2010-04-12", "12-04-2010")).toBe(true);
    expect(matchesDateOfBirth("2010-04-12", "12 april 2010")).toBe(true);
  });

  it("reads the calendar day without timezone drift", () => {
    expect(matchesDateOfBirth("2010-04-12T00:00:00.000Z", "12/04/2010")).toBe(
      true,
    );
  });

  it("rejects other dates, missing values, and invalid input", () => {
    expect(matchesDateOfBirth("2012-01-01", "2010")).toBe(false);
    expect(matchesDateOfBirth(undefined, "2010")).toBe(false);
    expect(matchesDateOfBirth("not-a-date", "2010")).toBe(false);
  });

  it("returns every player when the query is empty", () => {
    expect(matchesDateOfBirth(undefined, "   ")).toBe(true);
  });
});
