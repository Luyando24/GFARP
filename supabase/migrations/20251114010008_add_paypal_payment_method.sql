-- Migration to add PAYPAL as a valid payment method
-- This updates the CHECK constraints to include PAYPAL

-- Update academy_subscriptions table constraint
ALTER TABLE academy_subscriptions 
DROP CONSTRAINT IF EXISTS academy_subscriptions_payment_method_check;

ALTER TABLE academy_subscriptions 
ADD CONSTRAINT academy_subscriptions_payment_method_check 
CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CARD', 'PAYPAL'));

-- Update subscription_payments table constraint
ALTER TABLE subscription_payments 
DROP CONSTRAINT IF EXISTS subscription_payments_payment_method_check;

ALTER TABLE subscription_payments 
ADD CONSTRAINT subscription_payments_payment_method_check 
CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CARD', 'PAYPAL'));