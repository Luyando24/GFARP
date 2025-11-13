-- Stripe Integration Schema Updates
-- This file adds Stripe-related fields to existing tables

-- Add Stripe fields to academies table
ALTER TABLE academies ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- Add Stripe fields to subscription_plans table
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS stripe_price_id TEXT UNIQUE;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;

-- Add Stripe fields to academy_subscriptions table
ALTER TABLE academy_subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE;
ALTER TABLE academy_subscriptions ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;

-- Add Stripe fields to subscription_payments table
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;

-- Create indexes for better performance with Stripe lookups
CREATE INDEX IF NOT EXISTS idx_academies_stripe_customer ON academies(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_price ON subscription_plans(stripe_price_id);
CREATE INDEX IF NOT EXISTS idx_academy_subscriptions_stripe ON academy_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_stripe_payment_intent ON subscription_payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_stripe_invoice ON subscription_payments(stripe_invoice_id);

-- Update existing subscription plans with Stripe price IDs (these would be set manually or via API)
-- Example: UPDATE subscription_plans SET stripe_price_id = 'price_1234567890' WHERE name = 'Basic Plan';

-- Add comments for documentation
COMMENT ON COLUMN academies.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN subscription_plans.stripe_price_id IS 'Stripe price ID for this subscription plan';
COMMENT ON COLUMN subscription_plans.stripe_product_id IS 'Stripe product ID for this subscription plan';
COMMENT ON COLUMN academy_subscriptions.stripe_subscription_id IS 'Stripe subscription ID for tracking';
COMMENT ON COLUMN academy_subscriptions.stripe_invoice_id IS 'Latest Stripe invoice ID for this subscription';
COMMENT ON COLUMN subscription_payments.stripe_payment_intent_id IS 'Stripe payment intent ID for one-time payments';
COMMENT ON COLUMN subscription_payments.stripe_invoice_id IS 'Stripe invoice ID for subscription payments';