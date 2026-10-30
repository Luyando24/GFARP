-- Reconcile schema drift: agency-owned player creation writes players.agency_id,
-- but no earlier migration created the column, so fresh databases fail on insert.
ALTER TABLE IF EXISTS public.players
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_players_agency ON public.players(agency_id);
