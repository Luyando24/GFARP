-- Financial Transactions Schema
-- This schema supports comprehensive financial transaction management for football academies

-- Create financial_transactions table
CREATE TABLE IF NOT EXISTS financial_transactions (
  id SERIAL PRIMARY KEY,
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('income', 'expense')),
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(30),
    reference_number VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create budget_categories table
CREATE TABLE IF NOT EXISTS budget_categories (
    id SERIAL PRIMARY KEY,
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    category_name VARCHAR(50) NOT NULL,
    category_type VARCHAR(20) NOT NULL CHECK (category_type IN ('revenue', 'expense')),
    budgeted_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    period_type VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
    fiscal_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(academy_id, category_name, fiscal_year, period_type)
);

-- Create financial_reports table for storing generated reports
CREATE TABLE IF NOT EXISTS financial_reports (
    id SERIAL PRIMARY KEY,
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    report_type VARCHAR(30) NOT NULL,
    report_name VARCHAR(100) NOT NULL,
    report_data JSONB NOT NULL,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    generated_by UUID,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_academy_id ON financial_transactions(academy_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category ON financial_transactions(category);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_status ON financial_transactions(status);

CREATE INDEX IF NOT EXISTS idx_budget_categories_academy_id ON budget_categories(academy_id);
CREATE INDEX IF NOT EXISTS idx_budget_categories_type ON budget_categories(category_type);
CREATE INDEX IF NOT EXISTS idx_budget_categories_year ON budget_categories(fiscal_year);

CREATE INDEX IF NOT EXISTS idx_financial_reports_academy_id ON financial_reports(academy_id);
CREATE INDEX IF NOT EXISTS idx_financial_reports_date ON financial_reports(date_from, date_to);

-- Insert default budget categories for new academies
INSERT INTO budget_categories (academy_id, category_name, category_type, budgeted_amount, period_type, fiscal_year)
SELECT 
    a.id,
    category_data.name,
    category_data.type,
    category_data.amount,
    'monthly',
    EXTRACT(YEAR FROM CURRENT_DATE)
FROM academies a
CROSS JOIN (
    VALUES 
    ('Player Transfers', 'revenue', 50000.00),
    ('Academy Fees', 'revenue', 25000.00),
    ('Sponsorships', 'revenue', 15000.00),
    ('Merchandise', 'revenue', 5000.00),
    ('Other Revenue', 'revenue', 2000.00),
    ('Staff Salaries', 'expense', 35000.00),
    ('Facilities', 'expense', 12000.00),
    ('Equipment', 'expense', 8000.00),
    ('Travel', 'expense', 6000.00),
    ('Marketing', 'expense', 3000.00),
    ('Utilities', 'expense', 4000.00),
    ('Insurance', 'expense', 2500.00),
    ('Other Expenses', 'expense', 2000.00)
) AS category_data(name, type, amount)
WHERE NOT EXISTS (
    SELECT 1 FROM budget_categories bc 
    WHERE bc.academy_id = a.id 
    AND bc.category_name = category_data.name 
    AND bc.fiscal_year = EXTRACT(YEAR FROM CURRENT_DATE)
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_financial_transactions_updated_at 
    BEFORE UPDATE ON financial_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_categories_updated_at 
    BEFORE UPDATE ON budget_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();