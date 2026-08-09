import { URL } from 'url';

function cleanSupabaseUrl(rawUrl: string): string | null {
  if (!rawUrl) return null;

  let cleaned = rawUrl
    .replace(/^["']|["']$/g, '')
    .replace(/[\r\n\t]/g, '')
    .trim()
    .replace(/\/+$/, '');

  if (!cleaned) return null;

  if (cleaned.startsWith('postgres://') || cleaned.startsWith('postgresql://') || cleaned.includes('pooler.supabase.com')) {
    const match = cleaned.match(/postgres\.([a-z0-9]+)@/i);
    if (match && match[1]) {
      return `https://${match[1]}.supabase.co`;
    }
    return null;
  }

  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }

  try {
    const parsed = new URL(cleaned);
    let hostname = parsed.hostname;

    if (hostname.includes('pooler.supabase.com') || hostname.startsWith('db.')) {
      return null;
    }

    let port = parsed.port;
    if (port === '443' || port === '80' || (hostname.endsWith('.supabase.co') && port)) {
      port = '';
    }

    const origin = `${parsed.protocol}//${hostname}${port ? ':' + port : ''}`;
    return origin;
  } catch {
    return null;
  }
}

const testCases = [
  'https://lpsujzvospfaomgkrcew.supabase.co',
  'https://lpsujzvospfaomgkrcew.supabase.co:443',
  '"https://lpsujzvospfaomgkrcew.supabase.co/"',
  'postgresql://postgres.lpsujzvospfaomgkrcew:password@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  'aws-1-us-east-1.pooler.supabase.com:5432',
  'lpsujzvospfaomgkrcew.supabase.co',
  'http://localhost:54321',
];

for (const tc of testCases) {
  console.log(`Input:  ${tc}`);
  console.log(`Result: ${cleanSupabaseUrl(tc)}\n`);
}
