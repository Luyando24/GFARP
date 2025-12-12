const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

const decrypt = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && value.startsWith('\\x')) {
    return Buffer.from(value.slice(2), 'hex').toString('utf8');
  }
  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
    return Buffer.from(value).toString('utf8');
  }
  if (typeof value === 'string') return value;
  return String(value);
};

async function testPlayerDetails() {
  try {
    await client.connect();
    
    // Get a player ID
    const res = await client.query('SELECT id, first_name_cipher, last_name_cipher FROM players LIMIT 1');
    if (res.rows.length === 0) {
      console.log('No players found');
      return;
    }
    
    const playerId = res.rows[0].id;
    console.log('Testing with player ID:', playerId);
    console.log('Raw Name (cipher):', res.rows[0].first_name_cipher);
    
    // Run the query from handleGetPlayerDetails
    const playerQuery = `SELECT id, player_card_id, first_name_cipher, last_name_cipher, 
                                dob_cipher, position, email_cipher, phone_cipher, 
                                address_cipher, guardian_contact_name_cipher, guardian_contact_phone_cipher,
                                guardian_contact_email_cipher, medical_info_cipher, emergency_contact_cipher,
                                height_cm, weight_kg, preferred_foot, jersey_number,
                                guardian_info_cipher, playing_history_cipher, gender,
                                registration_date, card_id, card_qr_signature,
                                nationality, training_start_date, training_end_date,
                                emergency_phone_cipher, internal_notes_cipher, notes_cipher,
                                current_club_cipher, city_cipher, country_cipher,
                                created_at, updated_at
                         FROM players WHERE id = $1`;
                         
    const playerResult = await client.query(playerQuery, [playerId]);
    const player = playerResult.rows[0];
    
    const decryptedPlayer = {
        id: player.id,
        playerCardId: player.player_card_id,
        firstName: decrypt(player.first_name_cipher),
        lastName: decrypt(player.last_name_cipher),
        dateOfBirth: decrypt(player.dob_cipher),
        // ... just checking a few key fields
        phone: decrypt(player.phone_cipher),
        nationality: player.nationality
    };
    
    console.log('Decrypted Player:', decryptedPlayer);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

testPlayerDetails();
