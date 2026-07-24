export interface SearchablePlayer {
  firstName?: string;
  lastName?: string;
  position?: string;
  email?: string;
}

export function filterPlayersBySearch<T extends SearchablePlayer>(
  players: T[],
  searchQuery: string,
): T[] {
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  if (!normalizedQuery) return players;

  return players.filter((player) => {
    const searchableValues = [
      `${player.firstName || ""} ${player.lastName || ""}`,
      player.position || "",
      player.email || "",
    ];

    return searchableValues.some((value) =>
      value.toLocaleLowerCase().includes(normalizedQuery),
    );
  });
}
