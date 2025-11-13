-- System Settings key-value store for application configuration
-- Focused on Postgres-only usage (no Prisma)

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  is_secret BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

COMMENT ON TABLE system_settings IS 'Key-value store for system settings (e.g., Stripe keys)';
COMMENT ON COLUMN system_settings.is_secret IS 'Indicates the value contains a secret (e.g., API key)';