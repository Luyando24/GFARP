import 'dotenv/config';
import { query } from '../server/lib/db.js';

async function run() {
  console.log('🚀 Initializing Sales Agents module...');

  try {
    // 1. Create sales_agents table
    await query(`
      CREATE TABLE IF NOT EXISTS sales_agents (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(50),
        code VARCHAR(50) UNIQUE,
        commission_rate DECIMAL(5,2) DEFAULT 10.00,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ sales_agents table ready');

    // 2. Add sales_agent_id to academies if not exists
    await query(`
      ALTER TABLE academies 
      ADD COLUMN IF NOT EXISTS sales_agent_id UUID REFERENCES sales_agents(id) ON DELETE SET NULL;
    `);
    console.log('✅ academies table updated');

    // 3. Create commissions table
    // Check academy ID type first
    const res = await query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'academies' AND column_name = 'id'
    `);
    const t = res.rows[0]?.data_type?.toLowerCase();
    const academyIdType = (t === 'integer' || t === 'bigint') ? 'INTEGER' : 'UUID';
    console.log(`ℹ️ Academy ID type detected: ${academyIdType}`);

    await query(`
      CREATE TABLE IF NOT EXISTS commissions (
        id UUID PRIMARY KEY,
        sales_agent_id UUID REFERENCES sales_agents(id) ON DELETE CASCADE,
        academy_id ${academyIdType} REFERENCES academies(id) ON DELETE SET NULL,
        amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        currency VARCHAR(10) DEFAULT 'USD',
        status VARCHAR(20) DEFAULT 'pending',
        paid_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ commissions table ready');
    console.log('🎉 Setup complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Setup failed:', err);
    process.exit(1);
  }
}

run();
