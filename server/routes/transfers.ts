import { Request, Response, Router } from 'express';
import { query } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Helper function to create financial transactions for transfers
async function createFinancialTransactionsForTransfer(transfer: any, isUpdate: boolean = false) {
  try {
    const transactions = [];
    
    // Create income transaction for transfer amount (if receiving player)
    if (transfer.transfer_amount && transfer.transfer_amount > 0) {
      const transferTransaction = {
        academy_id: transfer.academy_id,
        transaction_type: 'income',
        category: 'Player Transfers',
        subcategory: 'Transfer Fee',
        amount: transfer.transfer_amount,
        description: `Transfer fee for ${transfer.player_name} from ${transfer.from_club} to ${transfer.to_club}`,
        transaction_date: transfer.transfer_date,
        payment_method: 'Bank Transfer',
        reference_number: `TRF-${transfer.id}`,
        status: transfer.status === 'completed' ? 'completed' : 'pending',
        notes: `Auto-generated from transfer ID: ${transfer.id}`,
        created_by: transfer.created_by
      };
      
      const result = await query(`
        INSERT INTO financial_transactions (
          academy_id, transaction_type, category, subcategory, amount, 
          description, transaction_date, payment_method, reference_number, 
          status, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        transferTransaction.academy_id,
        transferTransaction.transaction_type,
        transferTransaction.category,
        transferTransaction.subcategory,
        transferTransaction.amount,
        transferTransaction.description,
        transferTransaction.transaction_date,
        transferTransaction.payment_method,
        transferTransaction.reference_number,
        transferTransaction.status,
        transferTransaction.notes,
        transferTransaction.created_by
      ]);
      
      transactions.push(result.rows[0]);
    }
    
    // Create expense transaction for agent fee (if applicable)
    if (transfer.agent_fee && transfer.agent_fee > 0) {
      const agentFeeTransaction = {
        academy_id: transfer.academy_id,
        transaction_type: 'expense',
        category: 'Player Transfers',
        subcategory: 'Agent Fee',
        amount: transfer.agent_fee,
        description: `Agent fee for ${transfer.player_name} transfer (Agent: ${transfer.agent_name || 'Unknown'})`,
        transaction_date: transfer.transfer_date,
        payment_method: 'Bank Transfer',
        reference_number: `AGT-${transfer.id}`,
        status: transfer.status === 'completed' ? 'completed' : 'pending',
        notes: `Auto-generated from transfer ID: ${transfer.id}`,
        created_by: transfer.created_by
      };
      
      const result = await query(`
        INSERT INTO financial_transactions (
          academy_id, transaction_type, category, subcategory, amount, 
          description, transaction_date, payment_method, reference_number, 
          status, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        agentFeeTransaction.academy_id,
        agentFeeTransaction.transaction_type,
        agentFeeTransaction.category,
        agentFeeTransaction.subcategory,
        agentFeeTransaction.amount,
        agentFeeTransaction.description,
        agentFeeTransaction.transaction_date,
        agentFeeTransaction.payment_method,
        agentFeeTransaction.reference_number,
        agentFeeTransaction.status,
        agentFeeTransaction.notes,
        agentFeeTransaction.created_by
      ]);
      
      transactions.push(result.rows[0]);
    }
    
    return transactions;
  } catch (error) {
    console.error('Error creating financial transactions for transfer:', error);
    throw error;
  }
}

// Get all transfers for an academy
export async function handleGetTransfers(req: Request, res: Response) {
  try {
    const { academyId, limit = 50, offset = 0, status } = req.query;
    
    let sql = `
      SELECT 
        id,
        academy_id,
        player_id,
        player_name,
        from_club,
        to_club,
        transfer_amount,
        currency,
        transfer_date,
        contract_start_date,
        contract_end_date,
        status,
        transfer_type,
        priority,
        agent_name,
        agent_fee,
        notes,
        documents,
        fifa_clearance_status,
        fifa_clearance_date,
        created_by,
        approved_by,
        created_at,
        updated_at
      FROM transfers
    `;
    
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (academyId) {
      conditions.push(`academy_id = $${params.length + 1}`);
      params.push(academyId);
    }
    
    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await query(sql, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching transfers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transfers'
    });
  }
}

// Get a single transfer by ID
export async function handleGetTransfer(req: Request, res: Response) {
  try {
    const { transferId } = req.params;
    
    const result = await query(
      `SELECT * FROM transfers WHERE id = $1`,
      [transferId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transfer not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching transfer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transfer'
    });
  }
}

// Create a new transfer
export async function handleCreateTransfer(req: Request, res: Response) {
  try {
    const {
      academyId,
      playerId,
      playerName,
      fromClub,
      toClub,
      transferAmount,
      currency = 'USD',
      transferDate,
      contractStartDate,
      contractEndDate,
      status = 'pending',
      transferType = 'permanent',
      priority = 'medium',
      agentName,
      agentFee,
      notes,
      documents = [],
      createdBy
    } = req.body;
    
    const transferId = uuidv4();
    
    const result = await query(
      `INSERT INTO transfers (
        id, academy_id, player_id, player_name, from_club, to_club,
        transfer_amount, currency, transfer_date, contract_start_date,
        contract_end_date, status, transfer_type, priority, agent_name,
        agent_fee, notes, documents, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      ) RETURNING *`,
      [
        transferId, academyId, playerId, playerName, fromClub, toClub,
        transferAmount, currency, transferDate, contractStartDate,
        contractEndDate, status, transferType, priority, agentName,
        agentFee, notes, JSON.stringify(documents), createdBy
      ]
    );
    
    const createdTransfer = result.rows[0];
    
    // Automatically create financial transactions for this transfer
    try {
      const financialTransactions = await createFinancialTransactionsForTransfer(createdTransfer);
      console.log(`Created ${financialTransactions.length} financial transactions for transfer ${transferId}`);
    } catch (financialError) {
      console.error('Failed to create financial transactions for transfer:', financialError);
      // Don't fail the transfer creation if financial transaction creation fails
    }
    
    res.status(201).json({
      success: true,
      data: createdTransfer
    });
  } catch (error) {
    console.error('Error creating transfer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create transfer'
    });
  }
}

// Update a transfer
export async function handleUpdateTransfer(req: Request, res: Response) {
  try {
    const { transferId } = req.params;
    const {
      playerName,
      fromClub,
      toClub,
      transferAmount,
      currency,
      transferDate,
      contractStartDate,
      contractEndDate,
      status,
      transferType,
      priority,
      agentName,
      agentFee,
      notes,
      documents,
      fifaClearanceStatus,
      fifaClearanceDate,
      approvedBy
    } = req.body;
    
    // Get the current transfer to compare status changes
    const currentTransferResult = await query(
      `SELECT * FROM transfers WHERE id = $1`,
      [transferId]
    );
    
    if (currentTransferResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transfer not found'
      });
    }
    
    const currentTransfer = currentTransferResult.rows[0];
    
    const result = await query(
      `UPDATE transfers SET
        player_name = COALESCE($2, player_name),
        from_club = COALESCE($3, from_club),
        to_club = COALESCE($4, to_club),
        transfer_amount = COALESCE($5, transfer_amount),
        currency = COALESCE($6, currency),
        transfer_date = COALESCE($7, transfer_date),
        contract_start_date = COALESCE($8, contract_start_date),
        contract_end_date = COALESCE($9, contract_end_date),
        status = COALESCE($10, status),
        transfer_type = COALESCE($11, transfer_type),
        priority = COALESCE($12, priority),
        agent_name = COALESCE($13, agent_name),
        agent_fee = COALESCE($14, agent_fee),
        notes = COALESCE($15, notes),
        documents = COALESCE($16, documents),
        fifa_clearance_status = COALESCE($17, fifa_clearance_status),
        fifa_clearance_date = COALESCE($18, fifa_clearance_date),
        approved_by = COALESCE($19, approved_by),
        updated_at = now()
      WHERE id = $1
      RETURNING *`,
      [
        transferId, playerName, fromClub, toClub, transferAmount, currency,
        transferDate, contractStartDate, contractEndDate, status, transferType,
        priority, agentName, agentFee, notes, 
        documents ? JSON.stringify(documents) : null,
        fifaClearanceStatus, fifaClearanceDate, approvedBy
      ]
    );
    
    const updatedTransfer = result.rows[0];
    
    // Update financial transactions if status changed to 'completed' or if amounts changed
    if (status && (status !== currentTransfer.status || transferAmount !== currentTransfer.transfer_amount || agentFee !== currentTransfer.agent_fee)) {
      try {
        // Update existing financial transactions status
        if (status === 'completed' && currentTransfer.status !== 'completed') {
          await query(
            `UPDATE financial_transactions 
             SET status = 'completed', updated_at = CURRENT_TIMESTAMP 
             WHERE reference_number IN ($1, $2)`,
            [`TRF-${transferId}`, `AGT-${transferId}`]
          );
          console.log(`Updated financial transaction status to completed for transfer ${transferId}`);
        } else if (status === 'cancelled' && currentTransfer.status !== 'cancelled') {
          await query(
            `UPDATE financial_transactions 
             SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
             WHERE reference_number IN ($1, $2)`,
            [`TRF-${transferId}`, `AGT-${transferId}`]
          );
          console.log(`Updated financial transaction status to cancelled for transfer ${transferId}`);
        }
        
        // If amounts changed significantly, we might want to create new transactions
        // For now, we'll just log this case
        if (transferAmount !== currentTransfer.transfer_amount || agentFee !== currentTransfer.agent_fee) {
          console.log(`Transfer amounts changed for ${transferId}, consider manual financial transaction review`);
        }
      } catch (financialError) {
        console.error('Failed to update financial transactions for transfer:', financialError);
        // Don't fail the transfer update if financial transaction update fails
      }
    }
    
    res.json({
      success: true,
      data: updatedTransfer
    });
  } catch (error) {
    console.error('Error updating transfer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update transfer'
    });
  }
}

// Delete a transfer
export async function handleDeleteTransfer(req: Request, res: Response) {
  try {
    const { transferId } = req.params;
    
    const result = await query(
      `DELETE FROM transfers WHERE id = $1 RETURNING id`,
      [transferId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transfer not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Transfer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transfer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete transfer'
    });
  }
}

// Sync existing transfers with financial transactions
export async function handleSyncTransfersWithFinances(req: Request, res: Response) {
  try {
    const { academyId } = req.params;
    
    // Get all completed transfers that might not have financial transactions
    const transfersResult = await query(
      `SELECT * FROM transfers 
       WHERE academy_id = $1 
       AND status = 'completed' 
       AND (transfer_amount > 0 OR agent_fee > 0)`,
      [academyId]
    );
    
    let syncedCount = 0;
    const errors = [];
    
    for (const transfer of transfersResult.rows) {
      try {
        // Check if financial transactions already exist for this transfer
        const existingTransactions = await query(
          `SELECT COUNT(*) as count FROM financial_transactions 
           WHERE reference_number IN ($1, $2)`,
          [`TRF-${transfer.id}`, `AGT-${transfer.id}`]
        );
        
        if (existingTransactions.rows[0].count === 0) {
          // No existing financial transactions, create them
          await createFinancialTransactionsForTransfer(transfer);
          syncedCount++;
        }
      } catch (error) {
        errors.push({
          transferId: transfer.id,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Synced ${syncedCount} transfers with financial transactions`,
      syncedCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error syncing transfers with finances:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync transfers with financial transactions'
    });
  }
}

// Get transfer statistics
export async function handleGetTransferStats(req: Request, res: Response) {
  try {
    const { academyId } = req.query;
    
    let whereClause = '';
    const params: any[] = [];
    
    if (academyId) {
      whereClause = 'WHERE academy_id = $1';
      params.push(academyId);
    }
    
    const result = await query(
      `SELECT 
        COUNT(*) as total_transfers,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transfers,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transfers,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_transfers,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN transfer_amount END), 0) as total_transfer_value,
        COALESCE(AVG(CASE WHEN status = 'completed' THEN transfer_amount END), 0) as avg_transfer_value
      FROM transfers ${whereClause}`,
      params
    );
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching transfer stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transfer statistics'
    });
  }
}

// Routes
router.get('/', handleGetTransfers);
router.get('/stats', handleGetTransferStats);
router.get('/:transferId', handleGetTransfer);
router.post('/', handleCreateTransfer);
router.post('/:academyId/sync-finances', handleSyncTransfersWithFinances);
router.put('/:transferId', handleUpdateTransfer);
router.delete('/:transferId', handleDeleteTransfer);

export default router;