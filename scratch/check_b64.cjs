const { Client } = require('pg');
const DB = 'postgresql://postgres.lpsujzvospfaomgkrcew:ZLUmqmSuFaKrTJ9f@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require';

async function main() {
  const client = new Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const res = await client.query(
    'SELECT p.player_id, ip.email, p.profile_image_url, p.cover_image_url, p.gallery_images ' +
    'FROM player_profiles p JOIN individual_players ip ON ip.id = p.player_id ORDER BY p.player_id'
  );

  console.log('Total players:', res.rows.length);
  let base64Count = 0;

  for (const r of res.rows) {
    const hasB64Profile = r.profile_image_url && r.profile_image_url.startsWith('data:');
    const hasB64Cover   = r.cover_image_url   && r.cover_image_url.startsWith('data:');
    const galleryB64    = (r.gallery_images || []).filter(i => i && i.startsWith('data:')).length;

    if (hasB64Profile || hasB64Cover || galleryB64) {
      base64Count++;
      console.log('Player:', r.player_id, '|', r.email);
      if (hasB64Profile) console.log('  profile_image_url: BASE64 -', r.profile_image_url.length, 'chars (~' + Math.round(r.profile_image_url.length * 0.75 / 1024) + 'KB)');
      if (hasB64Cover)   console.log('  cover_image_url:   BASE64 -', r.cover_image_url.length,   'chars (~' + Math.round(r.cover_image_url.length * 0.75 / 1024)   + 'KB)');
      if (galleryB64)    console.log('  gallery_images:   ', galleryB64, 'base64 image(s)');
    }
  }

  if (base64Count === 0) {
    console.log('\nNo base64 images in DB. All images are already URLs.');
  } else {
    console.log('\nPlayers with base64 images stored in DB:', base64Count);
  }

  await client.end();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
