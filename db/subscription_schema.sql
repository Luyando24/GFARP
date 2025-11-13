-- Subscription Management Schema
-- This schema handles subscription plans, academy subscriptions, and billing

-- Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('MONTHLY', 'YEARLY', 'LIFETIME')),
  player_limit INTEGER NOT NULL DEFAULT 2,
  storage_limit BIGINT NOT NULL DEFAULT 1073741824, -- 1GB in bytes
  features JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_free BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Academy Subscriptions
CREATE TABLE IF NOT EXISTS academy_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
  payment_method TEXT CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CARD', 'PAYPAL')),
  payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
  amount_paid DECIMAL(10,2),
  payment_reference TEXT,
  notes TEXT,
  activated_by UUID, -- Admin who activated the subscription (no foreign key constraint)
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subscription History (for tracking changes and renewals)
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES academy_subscriptions(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('CREATED', 'ACTIVATED', 'RENEWED', 'UPGRADED', 'DOWNGRADED', 'SUSPENDED', 'CANCELLED', 'EXPIRED')),
  old_status TEXT,
  new_status TEXT,
  old_plan_id UUID REFERENCES subscription_plans(id),
  new_plan_id UUID REFERENCES subscription_plans(id),
  performed_by UUID, -- Admin who performed the action (no foreign key constraint)
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment Records
CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES academy_subscriptions(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CARD', 'PAYPAL')),
  payment_reference TEXT,
  payment_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
  processed_by UUID, -- Admin who processed the payment (no foreign key constraint)
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_academy_subscriptions_academy ON academy_subscriptions(academy_id);
CREATE INDEX IF NOT EXISTS idx_academy_subscriptions_status ON academy_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_academy_subscriptions_dates ON academy_subscriptions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription ON subscription_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription ON subscription_payments(subscription_id);

-- Add storage_used column to academies table if it doesn't exist
ALTER TABLE academies ADD COLUMN IF NOT EXISTS storage_used BIGINT DEFAULT 0;

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price, currency, billing_cycle, player_limit, storage_limit, features, is_active, is_free, sort_order) VALUES
('Free Plan', 'Perfect for small academies getting started', 0.00, 'USD', 'LIFETIME', 2, 1073741824, 
 '["Basic player management", "Document storage (1GB)", "Email support", "Basic reporting"]', 
 TRUE, TRUE, 1),
('Basic Plan', 'Great for growing academies', 29.99, 'USD', 'MONTHLY', 50, 5368709120, 
 '["Advanced player management", "Document storage (5GB)", "Email support", "Advanced reporting", "Player analytics"]', 
 TRUE, FALSE, 2),
('Pro Plan', 'For established academies', 59.99, 'USD', 'MONTHLY', 200, 10737418240, 
 '["Unlimited player management", "Document storage (10GB)", "Priority support", "Advanced analytics", "Custom reports", "API access"]', 
 TRUE, FALSE, 3),
('Elite Plan', 'For large academies and organizations', 99.99, 'USD', 'MONTHLY', 1000, 53687091200, 
 '["Unlimited features", "Document storage (50GB)", "24/7 support", "White-label options", "Multi-academy management", "Advanced integrations"]', 
 TRUE, FALSE, 4)
ON CONFLICT (name) DO NOTHING;