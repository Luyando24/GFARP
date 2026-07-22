import type { PlayerFeeSubscription } from "./api";

export type PlayerFeeFilter = "all" | "active" | "expiring";

export interface FeeFilterPlayer {
  id: string;
  isSelfRegistered?: boolean;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function playerSubscriptionKey(playerId: string, source: "academy" | "individual") {
  return `${source}:${playerId}`;
}

export function isRecurringFeeExpiringSoon(
  subscription: PlayerFeeSubscription,
  today = new Date(),
): boolean {
  if (subscription.status !== "active" || !subscription.next_renewal_date) return false;

  const renewalDate = new Date(`${subscription.next_renewal_date.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(renewalDate.getTime())) return false;

  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const reminderDays = Math.max(0, Number(subscription.reminder_days_before) || 0);
  const renewalTime = renewalDate.getTime();

  return renewalTime >= todayUtc && renewalTime <= todayUtc + reminderDays * DAY_IN_MS;
}

export function filterPlayersByRecurringFees<T extends FeeFilterPlayer>(
  players: T[],
  subscriptions: PlayerFeeSubscription[],
  filter: Exclude<PlayerFeeFilter, "all">,
  today = new Date(),
): T[] {
  const matchingSubscriptions = subscriptions.filter((subscription) => {
    if (filter === "active") return subscription.status === "active";
    return isRecurringFeeExpiringSoon(subscription, today);
  });

  const matchingPlayers = new Set(
    matchingSubscriptions.map((subscription) =>
      playerSubscriptionKey(subscription.player_id, subscription.player_source),
    ),
  );

  return players.filter((player) =>
    matchingPlayers.has(
      playerSubscriptionKey(
        player.id,
        player.isSelfRegistered ? "individual" : "academy",
      ),
    ),
  );
}
