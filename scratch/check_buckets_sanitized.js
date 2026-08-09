import { getSupabase } from '../server/lib/supabase.js';

async function check() {
    try {
        const client = getSupabase();
        console.log('Testing Supabase client URL...');
        const { data, error } = await client.storage.listBuckets();
        if (error) {
            console.error('Error listing buckets:', error);
        } else {
            console.log('Buckets list:', data.map(b => b.name));
            const hasPublicUploads = data.some(b => b.name === 'public-uploads');
            console.log('Has public-uploads bucket:', hasPublicUploads);
            if (!hasPublicUploads) {
                console.log('Creating public-uploads bucket...');
                const createRes = await client.storage.createBucket('public-uploads', { public: true });
                console.log('Create result:', createRes);
            }
        }
    } catch (err) {
        console.error('Check failed:', err);
    }
}

check();
