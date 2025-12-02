
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('No database connection string found');
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Create financial_transactions table
    console.log('Creating financial_transactions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS financial_transactions (
        id SERIAL PRIMARY KEY,
        academy_id UUID NOT NULL,
        transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('income', 'expense')),
        category VARCHAR(100) NOT NULL,
        subcategory VARCHAR(100),
        amount DECIMAL(12, 2) NOT NULL,
        description TEXT NOT NULL,
        transaction_date DATE NOT NULL,
        payment_method VARCHAR(50),
        reference_number VARCHAR(100),
        status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
        notes TEXT,
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create budget_categories table
    console.log('Creating budget_categories table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS budget_categories (
        id SERIAL PRIMARY KEY,
        academy_id UUID NOT NULL,
        category_name VARCHAR(100) NOT NULL,
        category_type VARCHAR(20) NOT NULL CHECK (category_type IN ('revenue', 'expense')),
        budgeted_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
        spent_amount DECIMAL(12, 2) DEFAULT 0,
        remaining_amount DECIMAL(12, 2) DEFAULT 0,
        percentage_used DECIMAL(5, 2) DEFAULT 0,
        period_type VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
        fiscal_year INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Tables created successfully');

  } catch (err) {
    console.error('Error creating tables:', err);
  } finally {
    await client.end();
  }
}

run();
