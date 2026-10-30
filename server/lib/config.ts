const DATABASE_ENV_VARS = [
  'DATABASE_URL',
  'SUPABASE_DB_URL',
  'SUPABASE_DB_POOL_URL',
  'SUPABASE_POOLED_DATABASE_URL',
  'SUPABASE_PGBOUNCER_URL',
  'SUPABASE_DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'PG_CONNECTION_STRING',
];

function hasDatabaseConfig(): boolean {
  if (DATABASE_ENV_VARS.some((name) => Boolean(process.env[name]?.trim()))) return true;
  return Boolean(
    process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE,
  );
}

// Missing secrets must never crash the process (serverless hosts surface that as
// an opaque FUNCTION_INVOCATION_FAILED). Boot still succeeds and the operations
// that need a value fail closed with a configuration error instead.
export function missingProductionConfig(): string[] {
  if (process.env.NODE_ENV !== 'production') return [];

  const checks: Array<[string, boolean]> = [
    ['JWT_SECRET', Boolean(process.env.JWT_SECRET?.trim())],
    ['NRC_SALT', Boolean(process.env.NRC_SALT?.trim())],
    ['FIELD_ENCRYPTION_KEY', Boolean(process.env.FIELD_ENCRYPTION_KEY?.trim())],
    ['DATABASE_URL', hasDatabaseConfig()],
  ];

  return checks.filter(([, present]) => !present).map(([name]) => name);
}

const CONFIGURATION_ERROR_PATTERN =
  /is required in production|must be at least 32 characters in production|Database unavailable/i;

export function isConfigurationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return CONFIGURATION_ERROR_PATTERN.test(message);
}
