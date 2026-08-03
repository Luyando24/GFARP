-- Prevent ambiguous current-subscription lookups while keeping historical rows.
WITH ranked_active AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY academy_id
           ORDER BY COALESCE(activated_at, start_date, created_at) DESC, created_at DESC, id DESC
         ) AS row_number
  FROM public.academy_subscriptions
  WHERE status = 'ACTIVE'
)
UPDATE public.academy_subscriptions subscription
SET status = 'CANCELLED',
    updated_at = now()
FROM ranked_active
WHERE subscription.id = ranked_active.id
  AND ranked_active.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS academy_subscriptions_one_active_per_academy_idx
  ON public.academy_subscriptions (academy_id)
  WHERE status = 'ACTIVE';
