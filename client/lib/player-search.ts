export interface SearchablePlayer {
  firstName?: string;
  lastName?: string;
  position?: string;
  email?: string;
}

export type PlayerPaymentStatusFilter = "all" | "paid" | "due" | "inactive";
export type PlayerSourceFilter = "all" | "academy" | "self_registered";

export interface AdvancedSearchablePlayer extends SearchablePlayer {
  dateOfBirth?: string;
  isSelfRegistered?: boolean;
}

export interface AdvancedPlayerFilters {
  birthYear?: string;
  position?: string;
  paymentStatus?: PlayerPaymentStatusFilter;
  source?: PlayerSourceFilter;
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

export function getPlayerBirthYear(dateOfBirth?: string): number | null {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  return Number.isNaN(birthDate.getTime()) ? null : birthDate.getFullYear();
}

export function filterPlayersByAdvancedFilters<T extends AdvancedSearchablePlayer>(
  players: T[],
  filters: AdvancedPlayerFilters,
  getPaymentStatus?: (player: T) => Exclude<PlayerPaymentStatusFilter, "all">,
): T[] {
  const birthYear = /^\d{4}$/.test(filters.birthYear || "")
    ? Number(filters.birthYear)
    : null;
  const position = (filters.position || "all").trim().toLocaleLowerCase();
  const paymentStatus = filters.paymentStatus || "all";
  const source = filters.source || "all";

  return players.filter((player) => {
    if (birthYear !== null && getPlayerBirthYear(player.dateOfBirth) !== birthYear) {
      return false;
    }
    if (
      position !== "all" &&
      (player.position || "").trim().toLocaleLowerCase() !== position
    ) {
      return false;
    }
    if (
      source === "academy" &&
      player.isSelfRegistered
    ) {
      return false;
    }
    if (
      source === "self_registered" &&
      !player.isSelfRegistered
    ) {
      return false;
    }
    if (
      paymentStatus !== "all" &&
      (!getPaymentStatus || getPaymentStatus(player) !== paymentStatus)
    ) {
      return false;
    }
    return true;
  });
}
