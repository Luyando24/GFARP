-- Player fee transactions and recurring fee schedules for academies.
-- Payments recorded here are informational records for money collected outside
-- Soccer Circular; this migration does not introduce an online payment flow.

CREATE TABLE IF NOT EXISTS academy_financial_settings (
  academy_id UUID PRIMARY KEY REFERENCES academies(id) ON DELETE CASCADE,
  default_currency VARCHAR(3) NOT NULL DEFAULT 'USD'
    CHECK (default_currency ~ '^[A-Z]{3}$'),
  renewal_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  default_reminder_days INTEGER NOT NULL DEFAULT 7
    CHECK (default_reminder_days BETWEEN 0 AND 90),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_fee_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  player_source VARCHAR(20) NOT NULL
    CHECK (player_source IN ('academy', 'individual')),
  player_name TEXT NOT NULL,
  player_email TEXT NOT NULL,
  fee_name TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  billing_cycle VARCHAR(20) NOT NULL
    CHECK (billing_cycle IN ('monthly', 'yearly', 'custom')),
  custom_billing_label TEXT,
  next_renewal_date DATE NOT NULL,
  reminder_days_before INTEGER NOT NULL DEFAULT 7
    CHECK (reminder_days_before BETWEEN 0 AND 90),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'cancelled', 'completed')),
  notes TEXT,
  created_by UUID,
  last_reminder_sent_for DATE,
  last_reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (billing_cycle <> 'custom' OR NULLIF(TRIM(custom_billing_label), '') IS NOT NULL)
);

ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS player_id UUID,
  ADD COLUMN IF NOT EXISTS player_source VARCHAR(20),
  ADD COLUMN IF NOT EXISTS player_name TEXT,
  ADD COLUMN IF NOT EXISTS player_email TEXT,
  ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS custom_payment_type TEXT,
  ADD COLUMN IF NOT EXISTS is_external_payment BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fee_subscription_id UUID REFERENCES player_fee_subscriptions(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'financial_transactions_currency_check'
  ) THEN
    ALTER TABLE financial_transactions
      ADD CONSTRAINT financial_transactions_currency_check
      CHECK (currency ~ '^[A-Z]{3}$');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'financial_transactions_player_source_check'
  ) THEN
    ALTER TABLE financial_transactions
      ADD CONSTRAINT financial_transactions_player_source_check
      CHECK (player_source IS NULL OR player_source IN ('academy', 'individual'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'financial_transactions_payment_type_check'
  ) THEN
    ALTER TABLE financial_transactions
      ADD CONSTRAINT financial_transactions_payment_type_check
      CHECK (payment_type IS NULL OR payment_type IN ('monthly', 'yearly', 'custom'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS player_fee_reminder_deliveries (
  id BIGSERIAL PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES player_fee_subscriptions(id) ON DELETE CASCADE,
  renewal_date DATE NOT NULL,
  recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('academy', 'player')),
  recipient_email TEXT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('processing', 'sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subscription_id, renewal_date, recipient_type)
);

INSERT INTO academy_financial_settings (academy_id, default_currency)
SELECT id, 'USD' FROM academies
ON CONFLICT (academy_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_player_fee_subscriptions_academy
  ON player_fee_subscriptions(academy_id, status);
CREATE INDEX IF NOT EXISTS idx_player_fee_subscriptions_due
  ON player_fee_subscriptions(next_renewal_date)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_financial_transactions_player
  ON financial_transactions(academy_id, player_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_fee_subscription
  ON financial_transactions(fee_subscription_id);
CREATE INDEX IF NOT EXISTS idx_player_fee_reminder_delivery_lookup
  ON player_fee_reminder_deliveries(subscription_id, renewal_date, status);

ALTER TABLE academy_financial_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_fee_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_fee_reminder_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Academies manage financial settings" ON academy_financial_settings;
CREATE POLICY "Academies manage financial settings"
  ON academy_financial_settings FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = academy_id)
  WITH CHECK ((SELECT auth.uid()) = academy_id);

DROP POLICY IF EXISTS "Academies manage player fee subscriptions" ON player_fee_subscriptions;
CREATE POLICY "Academies manage player fee subscriptions"
  ON player_fee_subscriptions FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = academy_id)
  WITH CHECK ((SELECT auth.uid()) = academy_id);

DROP POLICY IF EXISTS "Academies view reminder deliveries" ON player_fee_reminder_deliveries;
CREATE POLICY "Academies view reminder deliveries"
  ON player_fee_reminder_deliveries FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM player_fee_subscriptions pfs
    WHERE pfs.id = subscription_id AND pfs.academy_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Academies manage financial transactions" ON financial_transactions;
CREATE POLICY "Academies manage financial transactions"
  ON financial_transactions FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = academy_id)
  WITH CHECK ((SELECT auth.uid()) = academy_id);

DROP TRIGGER IF EXISTS update_academy_financial_settings_updated_at ON academy_financial_settings;
CREATE TRIGGER update_academy_financial_settings_updated_at
  BEFORE UPDATE ON academy_financial_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_player_fee_subscriptions_updated_at ON player_fee_subscriptions;
CREATE TRIGGER update_player_fee_subscriptions_updated_at
  BEFORE UPDATE ON player_fee_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
