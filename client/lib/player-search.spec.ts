import { describe, expect, it } from "vitest";
import { filterPlayersBySearch } from "./player-search";

const players = [
  {
    id: "1",
    firstName: "Lamar",
    lastName: "Khaled Mansour",
    position: "Forward",
    email: "lamar@example.com",
  },
  {
    id: "2",
    firstName: "Amina",
    lastName: "Banda",
    position: "Goalkeeper",
    email: "amina@example.com",
  },
];

describe("filterPlayersBySearch", () => {
  it("matches a player by any part of the full name", () => {
    expect(filterPlayersBySearch(players, "khaled")).toEqual([players[0]]);
  });

  it("matches position and email without being case-sensitive", () => {
    expect(filterPlayersBySearch(players, "GOALKEEPER")).toEqual([players[1]]);
    expect(filterPlayersBySearch(players, "LAMAR@EXAMPLE.COM")).toEqual([players[0]]);
  });

  it("returns the complete roster for a blank query", () => {
    expect(filterPlayersBySearch(players, "   ")).toEqual(players);
  });
});
