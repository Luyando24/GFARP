function cleanSupabaseUrl(rawUrl?: string): string | null {
  if (!rawUrl) return null;

  const supabaseCoMatch = rawUrl.match(/https?:\/\/[a-z0-9-]+\.supabase\.co/i);
  if (supabaseCoMatch) {
    return supabaseCoMatch[0].toLowerCase();
  }

  const genericMatch = rawUrl.match(/https?:\/\/[a-z0-9.-]+(?::\d+)?/i);
  if (genericMatch) {
    const urlStr = genericMatch[0];
    if (urlStr.includes('pooler.supabase.com')) return null;
    return urlStr;
  }

  return null;
}

function cleanSupabaseKey(rawKey?: string): string | null {
  if (!rawKey) return null;

  let cleaned = rawKey.trim();

  const eqIdx = cleaned.indexOf('=');
  if (eqIdx !== -1) {
    const keyPart = cleaned.slice(0, eqIdx);
    cleaned = keyPart.replace(/[A-Z0-9_]+$/i, '').trim();
  }

  const parts = cleaned.split('.');
  if (parts.length >= 3) {
    const sig = parts[2].slice(0, 43);
    return `${parts[0]}.${parts[1]}.${sig}`;
  }

  return cleaned.replace(/^["']|["']$/g, '').replace(/[\r\n\t]/g, '').trim() || null;
}

const corruptedUrl = "https://lpsujzvospfaomgkrcew.supabase.conext_public_supabase_anon_key=eyjhbgcioijiuzi1niisinr5cci6ikpxvcj9.eyjpc3mioijzdxbhymfzzsisinjlzii6imxwc3vqenzvc3bmyw9tz2tyy2v3iiwicm9szsi6imfub24ilcjpyxqioje3njewmzewmtqsimv4cci6mja3njywnzaxnh0.5q210arv1xd0ab87om5vyklq1yoml6cpmiuzeqrjrde";
const corruptedKey = "eyjhbgcioijiuzi1niisinr5cci6ikpxvcj9.eyjpc3mioijzdxbhymfzzsisinjlzii6imxwc3vqenzvc3bmyw9tz2tyy2v3iiwicm9szsi6imfub24ilcjpyxqioje3njewmzewmtqsimv4cci6mja3njywnzaxnh0.5q210arv1xd0ab87om5vyklq1yoml6cpmiuzeqrjrdeNEXT_PUBLIC_APP_URL=https://soccercircular.com";
const normalKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwc3VqenZvc3BmYW9tZ2tyY2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMzEwMTQsImV4cCI6MjA3NjYwNzAxNH0.5Q210arv1Xd0ab87OM5VYklq1yoML6CpmIuzEQRjRdE";

console.log("Cleaned URL:      ", cleanSupabaseUrl(corruptedUrl));
console.log("Cleaned Corrupt Key:", cleanSupabaseKey(corruptedKey));
console.log("Cleaned Normal Key: ", cleanSupabaseKey(normalKey));
