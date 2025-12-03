import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env vars manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('Checking subscriptions table...');
    const { data: subs, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .limit(1);

    if (subError) console.error('Error accessing subscriptions:', subError);
    else console.log('Subscriptions table exists. Sample:', subs);

    console.log('Checking subscription_plans table...');
    const { data: plans, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .limit(1);

    if (planError) console.error('Error accessing subscription_plans:', planError);
    else console.log('Subscription plans table exists. Sample:', plans);
}

checkTables();
