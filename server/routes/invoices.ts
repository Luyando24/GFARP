
import { Router, RequestHandler } from 'express';
import { query, transaction } from '../lib/db.js';

const router = Router();

// GET /api/invoices/:academyId or /api/invoices?academy_id=...
const handleGetInvoices: RequestHandler = async (req, res) => {
    try {
        const academyId = req.params.academyId || req.query.academy_id;
        const { page = 1, limit = 20, status, search } = req.query;

        let whereClause = 'WHERE academy_id = $1';
        let params: any[] = [academyId];
        let paramIndex = 2;

        if (status && status !== 'all') {
            whereClause += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (search) {
            whereClause += ` AND (client_name ILIKE $${paramIndex} OR invoice_number ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        const offset = (Number(page) - 1) * Number(limit);

        const countQuery = `SELECT COUNT(*) as total FROM invoices ${whereClause}`;
        const dataQuery = `
            SELECT * FROM invoices 
            ${whereClause} 
            ORDER BY created_at DESC 
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        params.push(Number(limit), offset);

        const [countResult, dataResult] = await Promise.all([
            query(countQuery, params.slice(0, -2)),
            query(dataQuery, params)
        ]);

        res.json({
            success: true,
            data: {
                invoices: dataResult.rows,
                pagination: {
                    total: Number(countResult.rows[0].total),
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(Number(countResult.rows[0].total) / Number(limit))
                }
            }
        });
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
    }
};

// GET /api/invoices/detail/:id
const handleGetInvoiceDetail: RequestHandler = async (req, res) => {
    try {
        const { id } = req.params;

        const invoiceResult = await query('SELECT * FROM invoices WHERE id = $1', [id]);
        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Invoice not found' });
        }

        const itemsResult = await query('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);

        res.json({
            success: true,
            data: {
                ...invoiceResult.rows[0],
                items: itemsResult.rows
            }
        });
    } catch (error) {
        console.error('Error fetching invoice detail:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch invoice details' });
    }
};

// POST /api/invoices
const handleCreateInvoice: RequestHandler = async (req, res) => {
    try {
        const {
            academy_id,
            invoice_number,
            client_name,
            client_email,
            client_address,
            issue_date,
            due_date,
            notes,
            items,
            subtotal,
            total_amount,
            status = 'draft'
        } = req.body;

        await transaction(async (client) => {
            // 1. Create Invoice
            const invoiceResult = await client.query(`
                INSERT INTO invoices (
                    academy_id, invoice_number, client_name, client_email, 
                    client_address, issue_date, due_date, notes, 
                    subtotal, total_amount, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id
            `, [
                academy_id, invoice_number, client_name, client_email,
                client_address, issue_date, due_date, notes,
                subtotal, total_amount, status
            ]);

            const invoiceId = invoiceResult.rows[0].id;

            // 2. Create Invoice Items
            for (const item of items) {
                await client.query(`
                    INSERT INTO invoice_items (
                        invoice_id, description, quantity, unit_price, amount
                    ) VALUES ($1, $2, $3, $4, $5)
                `, [
                    invoiceId, item.description, item.quantity, 
                    item.unitPrice, item.amount
                ]);
            }

            // 3. Create Financial Transaction (if needed)
            // We create a 'pending' income transaction linked to this invoice
            await client.query(`
                INSERT INTO financial_transactions (
                    academy_id, transaction_type, category, amount, 
                    description, transaction_date, status, 
                    reference_number, notes
                ) VALUES ($1, 'income', 'Academy Fees', $2, $3, $4, $5, $6, $7)
            `, [
                academy_id, 
                total_amount, 
                `Invoice ${invoice_number} for ${client_name}`,
                issue_date,
                status === 'paid' ? 'completed' : 'pending',
                invoice_number,
                `Linked to Invoice ID: ${invoiceId}`
            ]);
        });

        res.status(201).json({ success: true, message: 'Invoice created successfully' });
    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({ success: false, error: 'Failed to create invoice' });
    }
};

// PUT /api/invoices/:id
const handleUpdateInvoice: RequestHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            academy_id,
            invoice_number,
            client_name,
            client_email,
            client_address,
            issue_date,
            due_date,
            notes,
            items,
            subtotal,
            total_amount,
            status
        } = req.body;

        await transaction(async (client) => {
            // 1. Update Invoice
            await client.query(`
                UPDATE invoices SET
                    invoice_number = $1, client_name = $2, client_email = $3, 
                    client_address = $4, issue_date = $5, due_date = $6, notes = $7, 
                    subtotal = $8, total_amount = $9, status = $10, updated_at = NOW()
                WHERE id = $11 AND academy_id = $12
            `, [
                invoice_number, client_name, client_email,
                client_address, issue_date, due_date, notes,
                subtotal, total_amount, status,
                id, academy_id
            ]);

            // 2. Delete existing items
            await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);

            // 3. Create new items
            for (const item of items) {
                await client.query(`
                    INSERT INTO invoice_items (
                        invoice_id, description, quantity, unit_price, amount
                    ) VALUES ($1, $2, $3, $4, $5)
                `, [
                    id, item.description, item.quantity, 
                    item.unitPrice, item.amount
                ]);
            }

            // 4. Update Financial Transaction (if linked)
            // This is complex as we need to find the transaction linked to this invoice.
            // For now, let's assume we update it if we can match by reference_number (invoice_number) or notes.
            // Ideally, we should store transaction_id on invoice or vice versa. 
            // The CREATE implementation stores "Linked to Invoice ID: ..." in notes.
            
            await client.query(`
                UPDATE financial_transactions SET
                    amount = $1,
                    description = $2,
                    transaction_date = $3,
                    status = $4,
                    reference_number = $5
                WHERE academy_id = $6 AND notes LIKE $7
            `, [
                total_amount,
                `Invoice ${invoice_number} for ${client_name}`,
                issue_date,
                status === 'paid' ? 'completed' : 'pending',
                invoice_number,
                academy_id,
                `%Linked to Invoice ID: ${id}%`
            ]);
        });

        res.json({ success: true, message: 'Invoice updated successfully' });
    } catch (error) {
        console.error('Error updating invoice:', error);
        res.status(500).json({ success: false, error: 'Failed to update invoice' });
    }
};

router.get('/', handleGetInvoices);
router.get('/:academyId', handleGetInvoices);
router.get('/detail/:id', handleGetInvoiceDetail);
router.post('/', handleCreateInvoice);
router.put('/:id', handleUpdateInvoice);

export default router;
