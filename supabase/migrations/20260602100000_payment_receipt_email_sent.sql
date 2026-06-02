-- Track payment confirmation / receipt emails to avoid duplicate sends
ALTER TABLE subscription_payments
ADD COLUMN IF NOT EXISTS receipt_email_sent_at TIMESTAMPTZ;

ALTER TABLE player_purchases
ADD COLUMN IF NOT EXISTS receipt_email_sent_at TIMESTAMPTZ;
