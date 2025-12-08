-- Create a view to combine financial transactions and transfers for a unified financial history
CREATE OR REPLACE VIEW financial_activity_view AS
SELECT 
    ft.id::text as id,
    ft.academy_id,
    ft.amount,
    ft.transaction_type,
    ft.category,
    ft.status,
    ft.transaction_date,
    ft.description,
    ft.created_at,
    'transaction' as source_type
FROM financial_transactions ft
UNION ALL
SELECT 
    t.id::text as id,
    t.academy_id,
    t.transfer_amount as amount,
    CASE 
        WHEN t.transfer_type = 'loan' THEN 'income' -- Simplification
        ELSE 'income' -- Default to income for transfer fees
    END as transaction_type,
    'Transfer Fees' as category,
    t.status,
    t.transfer_date as transaction_date,
    CONCAT('Transfer: ', t.player_name, ' (', t.from_club, ' -> ', t.to_club, ')') as description,
    t.created_at,
    'transfer' as source_type
FROM transfers t
WHERE t.status = 'completed' AND t.transfer_amount > 0;
