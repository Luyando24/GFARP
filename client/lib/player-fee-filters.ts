import type { PlayerFeeSubscription } from "./api";

export type PlayerFeeFilter = "all" | "active" | "expiring";
export type PlayerFeePaymentState = "paid" | "due" | "inactive";

export interface FeeFilterPlayer {
  id: string;
  isSelfRegistered?: boolean;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function playerSubscriptionKey(playerId: string, source: "academy" | "individual") {
  return `${source}:${playerId}`;
}

function renewalDateAtUtcMidnight(subscription: PlayerFeeSubscription): number | null {
  if (!subscription.next_renewal_date) return null;

  const renewalDate = new Date(`${subscription.next_renewal_date.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(renewalDate.getTime()) ? null : renewalDate.getTime();
}

function todayAtUtcMidnight(today: Date): number {
  return Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
}

export function getPlayerFeePaymentState(
  subscription: PlayerFeeSubscription,
  today = new Date(),
): PlayerFeePaymentState {
  if (subscription.status !== "active") return "inactive";

  const renewalTime = renewalDateAtUtcMidnight(subscription);
  if (renewalTime === null) return "due";

  return renewalTime <= todayAtUtcMidnight(today) ? "due" : "paid";
}

export function getPlayerPaymentStateForPlayer(
  player: FeeFilterPlayer,
  subscriptions: PlayerFeeSubscription[],
  today = new Date(),
): PlayerFeePaymentState {
  const playerKey = playerSubscriptionKey(
    player.id,
    player.isSelfRegistered ? "individual" : "academy",
  );
  const paymentStates = subscriptions
    .filter((subscription) =>
      playerSubscriptionKey(subscription.player_id, subscription.player_source) === playerKey,
    )
    .map((subscription) => getPlayerFeePaymentState(subscription, today));

  if (paymentStates.includes("due")) return "due";
  if (paymentStates.includes("paid")) return "paid";
  return "inactive";
}

export function isRecurringFeeExpiringSoon(
  subscription: PlayerFeeSubscription,
  today = new Date(),
): boolean {
  if (subscription.status !== "active" || !subscription.next_renewal_date) return false;

  const renewalTime = renewalDateAtUtcMidnight(subscription);
  if (renewalTime === null) return false;

  const todayUtc = todayAtUtcMidnight(today);
  const reminderDays = Math.max(0, Number(subscription.reminder_days_before) || 0);

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
