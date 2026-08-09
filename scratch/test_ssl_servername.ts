import { createClient } from '@supabase/supabase-js';

const testUrls = [
  'https://aws-1-us-east-1.pooler.supabase.com:5432',
  'postgresql://postgres:password@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  'https://lpsujzvospfaomgkrcew.supabase.co:443',
  'lpsujzvospfaomgkrcew.supabase.co',
  'https://127.0.0.1:5432',
];

const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy';

async function runTests() {
  for (const url of testUrls) {
    console.log(`\n--- Testing URL: "${url}" ---`);
    try {
      const client = createClient(url, key);
      const res = await client.storage.from('public-uploads').upload(`test_${Date.now()}.jpg`, Buffer.from('test'));
      console.log('Result:', res);
    } catch (e: any) {
      console.log('Caught Exception:', e.message || e);
    }
  }
}

runTests();
