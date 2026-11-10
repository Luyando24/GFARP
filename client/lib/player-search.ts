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

const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

export function matchesDateOfBirth(
  dateOfBirth: string | null | undefined,
  query: string,
): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;
  if (!dateOfBirth) return false;

  // Read YYYY-MM-DD straight from the string so timezone offsets cannot shift the day.
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirth);
  const birthDate = isoMatch
    ? {
        year: Number(isoMatch[1]),
        monthIndex: Number(isoMatch[2]) - 1,
        day: Number(isoMatch[3]),
      }
    : (() => {
        const parsed = new Date(dateOfBirth);
        if (Number.isNaN(parsed.getTime())) return null;
        return {
          year: parsed.getFullYear(),
          monthIndex: parsed.getMonth(),
          day: parsed.getDate(),
        };
      })();
  if (!birthDate) return false;

  const year = String(birthDate.year);
  const month = String(birthDate.monthIndex + 1).padStart(2, '0');
  const day = String(birthDate.day).padStart(2, '0');
  const monthName = MONTH_NAMES[birthDate.monthIndex];
  const shortMonth = monthName.slice(0, 3);
  const numericDay = String(birthDate.day);
  const numericMonth = String(birthDate.monthIndex + 1);

  const candidates = [
    `${year}-${month}-${day}`,
    `${year}/${month}/${day}`,
    `${year}-${month}`,
    year,
    `${day}/${month}/${year}`,
    `${numericDay}/${numericMonth}/${year}`,
    `${month}/${day}/${year}`,
    `${numericMonth}/${numericDay}/${year}`,
    `${day}-${month}-${year}`,
    `${numericDay}-${numericMonth}-${year}`,
    `${day} ${monthName} ${year}`,
    `${numericDay} ${monthName} ${year}`,
    `${shortMonth} ${year}`,
    `${day} ${shortMonth} ${year}`,
    `${numericDay} ${shortMonth} ${year}`,
    `${monthName} ${year}`,
  ];

  return candidates.some((candidate) => candidate.includes(normalizedQuery));
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
