import { Client } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const AGENCY_ID = '71d7fa29-e4df-4e55-95cb-b2da2efe276a';

const encrypt = (text: string) => Buffer.from(text || '', 'utf8');

const players = [
  { firstName: 'James', lastName: 'Mwamba', dob: '2005-05-15', position: 'Forward', jersey: 9 },
  { firstName: 'Chanda', lastName: 'Kapere', dob: '2004-08-20', position: 'Midfielder', jersey: 10 },
  { firstName: 'Bwalya', lastName: 'Phiri', dob: '2006-01-10', position: 'Defender', jersey: 4 },
  { firstName: 'Mulenga', lastName: 'Chanda', dob: '2005-11-30', position: 'Goalkeeper', jersey: 1 },
  { firstName: 'Kelvin', lastName: 'Lungu', dob: '2004-03-25', position: 'Midfielder', jersey: 8 }
];

async function seed() {
  try {
    await client.connect();
    console.log('Connected to DB');

    for (const p of players) {
      const playerId = uuidv4();
      const playerCardId = Math.random().toString(36).substr(2, 6).toUpperCase();
      const cardId = `CARD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      const query = `
        INSERT INTO players (
          id, player_card_id, 
          first_name_cipher, last_name_cipher, dob_cipher,
          position, jersey_number,
          agency_id, is_active, registration_date,
          card_id, card_qr_signature,
          nrc_hash, nrc_salt,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      `;
      
      const values = [
        playerId,
        playerCardId,
        encrypt(p.firstName),
        encrypt(p.lastName),
        encrypt(p.dob),
        p.position,
        p.jersey,
        AGENCY_ID,
        true,
        new Date(),
        cardId,
        `QR-${playerId}`,
        `HASH-${playerId}`,
        `SALT-${playerId}`
      ];

      await client.query(query, values);
      console.log(`Seeded player: ${p.firstName} ${p.lastName}`);
    }

    console.log('✅ Seeding complete');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await client.end();
  }
}

seed();
