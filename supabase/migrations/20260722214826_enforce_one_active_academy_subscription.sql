-- Prevent ambiguous current-subscription lookups while keeping historical rows.
CREATE UNIQUE INDEX IF NOT EXISTS academy_subscriptions_one_active_per_academy_idx
  ON public.academy_subscriptions (academy_id)
  WHERE status = 'ACTIVE';
