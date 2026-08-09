import { describe, it, expect } from 'vitest';
import { cleanSupabaseUrl, cleanSupabaseKey } from '../supabase.js';

describe('Supabase Environment Variable Sanitization', () => {
  it('extracts valid .supabase.co URL from concatenated environment variable strings', () => {
    const corruptedUrl =
      'https://lpsujzvospfaomgkrcew.supabase.conext_public_supabase_anon_key=eyjhbgcioijiuzi1niisinr5cci6ikpxvcj9';
    expect(cleanSupabaseUrl(corruptedUrl)).toBe('https://lpsujzvospfaomgkrcew.supabase.co');
  });

  it('handles standard clean Supabase URLs', () => {
    expect(cleanSupabaseUrl('https://lpsujzvospfaomgkrcew.supabase.co')).toBe('https://lpsujzvospfaomgkrcew.supabase.co');
    expect(cleanSupabaseUrl('https://lpsujzvospfaomgkrcew.supabase.co/')).toBe('https://lpsujzvospfaomgkrcew.supabase.co');
  });

  it('extracts project ref from PostgreSQL connection strings and pooler URLs', () => {
    const dbUrl = 'postgresql://postgres.lpsujzvospfaomgkrcew:password@aws-1-us-east-1.pooler.supabase.com:5432/postgres';
    expect(cleanSupabaseUrl(dbUrl)).toBe('https://lpsujzvospfaomgkrcew.supabase.co');
  });

  it('cleans concatenated JWT keys', () => {
    const normalKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwc3VqenZvc3BmYW9tZ2tyY2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMzEwMTQsImV4cCI6MjA3NjYwNzAxNH0.5Q210arv1Xd0ab87OM5VYklq1yoML6CpmIuzEQRjRdE';
    const corruptedKey = `${normalKey}NEXT_PUBLIC_APP_URL=https://soccercircular.com`;

    expect(cleanSupabaseKey(corruptedKey)).toBe(normalKey);
    expect(cleanSupabaseKey(normalKey)).toBe(normalKey);
  });
});
