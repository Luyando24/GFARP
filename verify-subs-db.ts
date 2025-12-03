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

async function verifyQueries() {
    console.log('--- Verifying Plans Query ---');
    const { data: plans, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

    if (plansError) console.error('Plans Query Failed:', plansError);
    else console.log(`Plans Query Success: Found ${plans?.length} plans`);

    // Get an academy ID to test with (if any)
    const { data: academy } = await supabase.from('academies').select('id').limit(1).single();
    const academyId = academy?.id;

    if (academyId) {
        console.log(`\n--- Verifying Current Subscription Query for Academy ${academyId} ---`);
        const { data: sub, error: subError } = await supabase
            .from('academy_subscriptions')
            .select(`
                *,
                subscription_plans (
                    name,
                    price,
                    billing_cycle,
                    player_limit,
                    features
                )
            `)
            .eq('academy_id', academyId)
            .eq('status', 'ACTIVE')
            .single();

        if (subError && subError.code !== 'PGRST116') console.error('Subscription Query Failed:', subError);
        else console.log('Subscription Query Success:', sub ? 'Found subscription' : 'No active subscription');

        console.log(`\n--- Verifying History Query for Academy ${academyId} ---`);
        // First get sub IDs
        const { data: subs } = await supabase.from('academy_subscriptions').select('id').eq('academy_id', academyId);
        const subIds = subs?.map(s => s.id) || [];

        if (subIds.length > 0) {
            const { data: hist, error: histError } = await supabase
                .from('subscription_history')
                .select(`
                    id,
                    action,
                    notes,
                    created_at,
                    old_plan:old_plan_id(name),
                    new_plan:new_plan_id(name)
                `)
                .in('subscription_id', subIds)
                .order('created_at', { ascending: false });

            if (histError) console.error('History Query Failed:', histError);
            else console.log(`History Query Success: Found ${hist?.length} history items`);
        } else {
            console.log('No subscriptions found, skipping history query verification (logic is sound though)');
        }
    } else {
        console.log('\nNo academies found to test subscription queries.');
    }
}

verifyQueries();
