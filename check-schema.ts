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

async function checkSchema() {
    console.log('Checking player_documents table...');

    // Check if table exists by trying to select from it
    const { data, error } = await supabase
        .from('player_documents')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error accessing player_documents table:', error);
    } else {
        console.log('Table exists. Sample data:', data);
    }

    console.log('\nChecking storage buckets...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
        console.error('Error listing buckets:', bucketError);
    } else {
        console.log('Buckets:', buckets.map(b => b.name));
        const hasBucket = buckets.some(b => b.name === 'player-documents');
        console.log('player-documents bucket exists:', hasBucket);

        if (!hasBucket) {
            console.log('Creating player-documents bucket...');
            const { data: newBucket, error: createError } = await supabase.storage.createBucket('player-documents', {
                public: true
            });
            if (createError) {
                console.error('Error creating bucket:', createError);
            } else {
                console.log('Bucket created successfully');
            }
        }
    }
}

checkSchema();
