import { Router, RequestHandler } from 'express';
import { query, hashPassword, verifyPassword } from '../lib/db.js';
import { emailService } from '../lib/email-service.js';

const router = Router();

// Decrypt function
const decrypt = (value: any) => {
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

// Helper function to log activation history
async function logActivationHistory(
  academyId: string,
  actionType: 'activate' | 'deactivate' | 'verify' | 'unverify',
  previousStatus: boolean | null,
  newStatus: boolean,
  adminEmail?: string,
  reason?: string,
  req?: any
) {
  try {
    const ipAddress = req?.ip || req?.connection?.remoteAddress || null;
    const userAgent = req?.get('User-Agent') || null;

    await query(`
      INSERT INTO academy_activation_history (
        academy_id, action_type, previous_status, new_status, 
        admin_email, reason, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      academyId,
      actionType,
      previousStatus,
      newStatus,
      adminEmail,
      reason,
      ipAddress,
      userAgent
    ]);

    // Send email notifications
    try {
      // Get academy details for email
      const academyResult = await query('SELECT name, email FROM academies WHERE id = $1', [academyId]);
      if (academyResult.rows.length > 0) {
        const academy = academyResult.rows[0];

        // Send email to academy
        if (actionType === 'activate' || actionType === 'deactivate') {
          await emailService.sendAcademyActivationEmail(
            academy.email,
            academy.name,
            newStatus,
            adminEmail || 'system@sofwan.com',
            reason
          );
        } else if (actionType === 'verify' || actionType === 'unverify') {
          await emailService.sendAcademyVerificationEmail(
            academy.email,
            academy.name,
            newStatus,
            adminEmail || 'system@sofwan.com',
            reason
          );
        }

        // Send admin notification if adminEmail is provided
        if (adminEmail) {
          await emailService.sendAdminNotificationEmail(
            adminEmail,
            academy.name,
            actionType,
            previousStatus || false,
            newStatus,
            reason
          );
        }
      }
    } catch (emailError) {
      console.error('Error sending email notifications:', emailError);
      // Don't throw error to avoid breaking the main operation
    }
  } catch (error) {
    console.error('Error logging activation history:', error);
    // Don't throw error to avoid breaking the main operation
  }
}

// Interface for Academy creation/update
interface AcademyData {
  name: string;
  email: string;
  password?: string;
  directorName: string;
  phone: string;
  address: string;
  district: string;
  province: string;
  foundedYear?: number;
  website?: string;
  directorEmail?: string;
  directorPhone?: string;
}

// GET /api/academies - Get all academies with pagination and filtering
const handleGetAcademies: RequestHandler = async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const country = req.query.country as string;

    const skip = (page - 1) * limit;

    // Get academies with filtering and pagination using direct SQL
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR director_name ILIKE $${paramIndex + 1} OR district ILIKE $${paramIndex + 2})`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      paramIndex += 3;
    }

    if (status === 'active') {
      whereClause += ` AND status = $${paramIndex}`;
      params.push('active');
      paramIndex++;
    } else if (status === 'inactive') {
      whereClause += ` AND status IN ($${paramIndex}, $${paramIndex + 1})`;
      params.push('inactive', 'suspended');
      paramIndex += 2;
    }

    if (country) {
      whereClause += ` AND province ILIKE $${paramIndex}`;
      params.push(`%${country}%`);
      paramIndex++;
    }

    const academiesResult = await query(
      `SELECT *, 
        (SELECT COUNT(*) FROM players p WHERE p.academy_id = academies.id) as player_count,
        CASE WHEN status = 'active' THEN true ELSE false END as "isActive",
        COUNT(*) OVER() as total_count
      FROM academies ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, skip]
    );

    const academies = academiesResult.rows;
    const total = academies.length > 0 ? parseInt(academies[0].total_count) : 0;

    res.json({
      success: true,
      data: {
        academies,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching academies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch academies'
    });
  }
};

router.get('/', handleGetAcademies);

// GET /api/academies/:id - Get academy by ID
const handleGetAcademyById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    // Get academy details
    const academyResult = await query(
      'SELECT * FROM academies WHERE id = $1',
      [id]
    );

    if (academyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Academy not found'
      });
    }

    const academy = academyResult.rows[0];

    // Get academy players - using encrypted columns and decrypting them
    const playersResult = await query(
      `SELECT id, 
              first_name_cipher,
              last_name_cipher,
              position, 
              nationality, 
              COALESCE(is_active, true) as "isActive",
              jersey_number as "jerseyNumber",
              registration_date as "registrationDate",
              created_at as "createdAt",
              -- Calculate age from registration date (approximate)
              CASE 
                WHEN registration_date IS NOT NULL THEN 
                  EXTRACT(YEAR FROM AGE(CURRENT_DATE, registration_date + INTERVAL '16 years'))
                ELSE NULL
              END as "estimatedAge",
              player_card_id as "playerCardId"
       FROM players WHERE academy_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    const decryptedPlayers = playersResult.rows.map(p => ({
        ...p,
        firstName: decrypt(p.first_name_cipher),
        lastName: decrypt(p.last_name_cipher),
        first_name_cipher: undefined,
        last_name_cipher: undefined
    }));

    // Get player count - use array length since we fetch all players
    const playerCount = decryptedPlayers.length;

    // Fetch Compliance Data
    let complianceData = null;
    let documents: any[] = []; // Lifted scope for activities usage

    try {
        // Get the compliance record ID for this academy
        const complianceRecordResult = await query(
            `SELECT id, status, compliance_score, due_date FROM fifa_compliance WHERE academy_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [id]
        );

        let complianceId = null;
        let complianceInfo = null;

        if (complianceRecordResult.rows.length > 0) {
            complianceInfo = complianceRecordResult.rows[0];
            complianceId = complianceInfo.id;
        }

        // Get documents
        if (complianceId) {
            const docsResult = await query(
                `SELECT id, document_name as name, document_type, file_path as "fileUrl", 
                        upload_date as "uploadDate", expiry_date as "expiryDate", 
                        status, rejection_reason as "rejectionReason"
                 FROM fifa_compliance_documents 
                 WHERE compliance_id = $1
                 ORDER BY upload_date DESC`,
                [complianceId]
            );
            documents = docsResult.rows;
        }

        // Calculate score and status
        const now = new Date();
        const verifiedDocs = documents.filter(d => {
            const isExpired = d.expiryDate && new Date(d.expiryDate) < now;
            return d.status === 'verified' && !isExpired;
        });
        
        // Simple score calculation (cap at 100)
        // Assuming 10 verified documents is a good target for 100% for now
        const score = Math.min(Math.round((verifiedDocs.length / 10) * 100), 100);
        
        // Determine status based on score or existing status
        const calculatedStatus = score >= 80 ? 'approved' : (score > 30 ? 'under_review' : 'requires_action');
        
        const complianceStatus = complianceInfo?.status && complianceInfo.status !== 'pending' 
            ? complianceInfo.status 
            : calculatedStatus;

        // Generate requirements list with status
        const highlyValuableList = [
            'Official rosters', 'Registration forms', 'League match lists', 
            'Training attendance sheets', 'Tournament rosters', 'Photos/videos with visible timestamps', 
            'Coach evaluations', 'Player ID records', 'Tryout acceptance documents', 
            'Emails confirming registration', 'National association registration history'
        ];
        
        const supportingList = [
            'Press releases', 'Website archives', 'Payment receipts', 'Social-media posts showing training'
        ];

        const requirements = [
            ...highlyValuableList.map((name, idx) => {
                // Fuzzy match name
                const isCompleted = documents.some(d => 
                    d.status === 'verified' && 
                    (d.name.toLowerCase().includes(name.toLowerCase().split(' ')[0]) || 
                     d.document_type === name.toLowerCase().split(' ')[0])
                );
                return {
                    id: `hv-${idx}`,
                    name: name,
                    description: 'Highly Valuable Evidence',
                    status: isCompleted ? 'completed' : 'requires_attention'
                };
            }),
            ...supportingList.map((name, idx) => {
                const isCompleted = documents.some(d => 
                    d.status === 'verified' && 
                    (d.name.toLowerCase().includes(name.toLowerCase().split(' ')[0]) || 
                     d.document_type === name.toLowerCase().split(' ')[0])
                );
                return {
                    id: `sup-${idx}`,
                    name: name,
                    description: 'Supporting Evidence',
                    status: isCompleted ? 'completed' : 'requires_attention'
                };
            })
        ];

        complianceData = {
            complianceScore: complianceInfo?.compliance_score || score,
            overallStatus: complianceStatus,
            nextReviewDate: complianceInfo?.due_date || new Date(Date.now() + 30*24*60*60*1000).toISOString(),
            documents: documents,
            requirements: requirements
        };

    } catch (err) {
        console.error('Error fetching compliance data', err);
    }

    // Fetch Activities
    let activities: any[] = [];
    try {
        // 1. Activation History
        const activationHistory = await query(
            `SELECT action_type, admin_email, reason, created_at 
             FROM academy_activation_history 
             WHERE academy_id = $1 
             ORDER BY created_at DESC LIMIT 20`,
            [id]
        );

        activities.push(...activationHistory.rows.map(h => ({
            id: `act-${new Date(h.created_at).getTime()}`,
            type: 'status',
            action: h.action_type.charAt(0).toUpperCase() + h.action_type.slice(1) + ' Status Change',
            user: h.admin_email || 'System',
            timestamp: h.created_at,
            details: `Status changed to ${h.action_type} - Reason: ${h.reason || 'N/A'}`
        })));

        // 2. Compliance Documents
        if (documents && documents.length > 0) {
             activities.push(...documents.map(d => ({
                id: `doc-${d.id}`,
                type: 'document',
                action: `Document Uploaded: ${d.name}`,
                user: 'Academy Admin',
                timestamp: d.uploadDate,
                details: `Type: ${d.document_type}`
             })));
        }

        // 3. Player Registrations
        const players = decryptedPlayers;
        if (players && players.length > 0) {
             activities.push(...players.map(p => ({
                id: `player-${p.id}`,
                type: 'player',
                action: `Player Registered: ${p.firstName} ${p.lastName}`,
                user: 'Academy Staff',
                timestamp: p.registrationDate || p.createdAt,
                details: `Position: ${p.position}`
             })));
        }

        // Sort by timestamp desc
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        // Limit to 50
        activities = activities.slice(0, 50);

    } catch (err) {
        console.error('Error fetching activities:', err);
    }

    // For now, we'll return basic academy data with players
    // Subscriptions and other relations can be added later if needed
    const academyData = {
      ...academy,
      foundedYear: academy.founded_year,
      directorName: academy.director_name,
      directorEmail: academy.director_email,
      directorPhone: academy.director_phone,
      createdAt: academy.created_at,
      updatedAt: academy.updated_at,
      isActive: academy.status === 'active',
      subscriptionPlan: academy.subscription_plan || 'Pro Plan',
      players: decryptedPlayers,
      compliance: complianceData,
      activities: activities, // Added activities
      player_count: playerCount,
      _count: {
        players: playerCount,
        documents: complianceData?.documents?.length || 0,
        payments: 0   // Can be implemented later
      }
    };

    res.json({
      success: true,
      data: academyData
    });
  } catch (error) {
    console.error('Error fetching academy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch academy'
    });
  }
};

router.get('/:id', handleGetAcademyById);

// POST /api/academies - Create new academy
const handleCreateAcademy: RequestHandler = async (req, res) => {
  try {
    const academyData: AcademyData = req.body;

    // Validate required fields
    const requiredFields = ['name', 'email', 'directorName', 'phone', 'address'];
    const missingFields = requiredFields.filter(field => !academyData[field as keyof AcademyData]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Check if email already exists
    const existingAcademyResult = await query(
      'SELECT id FROM academies WHERE email = $1',
      [academyData.email]
    );

    if (existingAcademyResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Academy with this email already exists'
      });
    }

    // Hash password if provided
    let hashedPassword = '';
    if (academyData.password) {
      hashedPassword = await hashPassword(academyData.password);
    }

    // Insert new academy
    const insertResult = await query(
      `INSERT INTO academies (
        name, email, password_hash, director_name, phone, address, district, province,
        founded_year, website, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING id, name, email, director_name, phone, address, district, province,
                founded_year, website, status, created_at`,
      [
        academyData.name,
        academyData.email,
        hashedPassword,
        academyData.directorName,
        academyData.phone,
        academyData.address,
        academyData.district || null,
        academyData.province || null,
        academyData.foundedYear || null,
        academyData.website || null,
        'active' // status
      ]
    );

    const academy = insertResult.rows[0];

    res.status(201).json({
      success: true,
      data: academy,
      message: 'Academy created successfully'
    });
  } catch (error) {
    console.error('Error creating academy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create academy'
    });
  }
};

router.post('/', handleCreateAcademy);

// PUT /api/academies/:id - Update academy
const handleUpdateAcademy: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const academyData: Partial<AcademyData> = req.body;

    // Check if academy exists
    const existingAcademyResult = await query(
      'SELECT * FROM academies WHERE id = $1',
      [id]
    );

    if (existingAcademyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Academy not found'
      });
    }

    const existingAcademy = existingAcademyResult.rows[0];

    // Check if email is being changed and if it already exists
    if (academyData.email && academyData.email !== existingAcademy.email) {
      const emailExistsResult = await query(
        'SELECT id FROM academies WHERE email = $1 AND id != $2',
        [academyData.email, id]
      );

      if (emailExistsResult.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Academy with this email already exists'
        });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (academyData.name) {
      updateFields.push(`name = $${paramCount++}`);
      updateValues.push(academyData.name);
    }
    if (academyData.email) {
      updateFields.push(`email = $${paramCount++}`);
      updateValues.push(academyData.email);
    }
    if (academyData.address) {
      updateFields.push(`address = $${paramCount++}`);
      updateValues.push(academyData.address);
    }
    if (academyData.phone) {
      updateFields.push(`phone = $${paramCount++}`);
      updateValues.push(academyData.phone);
    }
    if (academyData.district) {
      updateFields.push(`district = $${paramCount++}`);
      updateValues.push(academyData.district);
    }
    if (academyData.province) {
      updateFields.push(`province = $${paramCount++}`);
      updateValues.push(academyData.province);
    }
    if (academyData.website) {
      updateFields.push(`website = $${paramCount++}`);
      updateValues.push(academyData.website);
    }
    if (academyData.foundedYear) {
      updateFields.push(`founded_year = $${paramCount++}`);
      updateValues.push(academyData.foundedYear);
    }
    if (academyData.directorName) {
      updateFields.push(`director_name = $${paramCount++}`);
      updateValues.push(academyData.directorName);
    }
    if (academyData.directorEmail) {
      updateFields.push(`director_email = $${paramCount++}`);
      updateValues.push(academyData.directorEmail);
    }
    if (academyData.directorPhone) {
      updateFields.push(`director_phone = $${paramCount++}`);
      updateValues.push(academyData.directorPhone);
    }

    // Always update the updated_at timestamp
    updateFields.push(`updated_at = $${paramCount++}`);
    updateValues.push(new Date().toISOString());

    // Add the ID for the WHERE clause
    updateValues.push(id);

    if (updateFields.length === 1) { // Only updated_at was added
      return res.status(400).json({
        success: false,
        error: 'No valid fields provided for update'
      });
    }

    const updateQuery = `
      UPDATE academies 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);
    const academy = result.rows[0];

    res.json({
      success: true,
      data: {
        id: academy.id,
        name: academy.name,
        email: academy.email,
        address: academy.address,
        phone: academy.phone,
        website: academy.website,
        foundedYear: academy.founded_year,
        directorName: academy.director_name,
        directorEmail: academy.director_email,
        directorPhone: academy.director_phone,
        createdAt: academy.created_at,
        updatedAt: academy.updated_at,
        isActive: academy.status === 'active',
        subscriptionPlan: academy.subscription_plan
      }
    });
  } catch (error) {
    console.error('Error updating academy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update academy'
    });
  }
};

router.put('/:id', handleUpdateAcademy);
// DELETE /api/academies/:id - Delete academy (soft delete by setting status to inactive)
const handleDeleteAcademy: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    // Check if academy exists
    const existingAcademyResult = await query(
      'SELECT * FROM academies WHERE id = $1',
      [id]
    );

    if (existingAcademyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Academy not found'
      });
    }

    if (permanent === 'true') {
      // Permanent delete - remove from database
      await query('DELETE FROM academies WHERE id = $1', [id]);

      res.json({
        success: true,
        message: 'Academy permanently deleted'
      });
    } else {
      // Soft delete - set status to inactive
      const result = await query(
        'UPDATE academies SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *',
        ['inactive', new Date().toISOString(), id]
      );

      const academy = result.rows[0];

      res.json({
        success: true,
        data: {
          id: academy.id,
          name: academy.name,
          email: academy.email,
          isActive: academy.status === 'active'
        },
        message: 'Academy deactivated successfully'
      });
    }
  } catch (error) {
    console.error('Error deleting academy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete academy'
    });
  }
};

router.delete('/:id', handleDeleteAcademy);
// PATCH /api/academies/:id/activate - Activate/Deactivate academy
const handleActivateAcademy: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, reason, adminEmail } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isActive must be a boolean value'
      });
    }

    // Get current academy status for history tracking
    const currentAcademyResult = await query(
      'SELECT status FROM academies WHERE id = $1',
      [id]
    );

    if (currentAcademyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Academy not found'
      });
    }

    const currentAcademy = currentAcademyResult.rows[0];
    const newStatus = isActive ? 'active' : 'inactive';

    // Update academy status
    const result = await query(
      'UPDATE academies SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      [newStatus, new Date().toISOString(), id]
    );

    const academy = result.rows[0];

    res.json({
      success: true,
      data: {
        id: academy.id,
        name: academy.name,
        email: academy.email,
        isActive: academy.status === 'active'
      },
      message: `Academy ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error updating academy status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update academy status'
    });
  }
};

router.patch('/:id/activate', handleActivateAcademy);
// PATCH /api/academies/:id/verify - Verify academy
const handleVerifyAcademy: RequestHandler = async (req, res) => {
  try {
    const { id: academyId } = req.params;
    const { isVerified, reason } = req.body;
    const adminEmail = (req as any).user?.email;
    const ipAddress = req.ip || req.connection?.remoteAddress || null;
    const userAgent = req.get('User-Agent') || null;

    // Get current status
    const academyResult = await query('SELECT is_verified FROM academies WHERE id = $1', [academyId]);
    if (academyResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Academy not found' });
    }
    const previousStatus = academyResult.rows[0].is_verified;
    const newStatus = isVerified;
    const actionType = isVerified ? 'verify' : 'unverify';

    // Update academy status
    const result = await query(
      'UPDATE academies SET is_verified = $1, verified_at = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [isVerified, new Date().toISOString(), academyId]
    );

    // Log activation history
    await logActivationHistory(
      academyId,
      actionType,
      previousStatus,
      newStatus,
      adminEmail,
      reason,
      req
    );

    const academy = result.rows[0];

    res.json({
      success: true,
      data: academy,
      message: `Academy ${isVerified ? 'verified' : 'unverified'} successfully`
    });
  } catch (error) {
    console.error('Error updating academy verification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update academy verification'
    });
  }
};

router.patch('/:id/verify', handleVerifyAcademy);

// GET /api/academies/stats/overview - Get academy statistics
const handleGetAcademyStats: RequestHandler = async (req, res) => {
  try {
    // Optimized single query to fetch all stats
    const statsResult = await query(`
      SELECT 
        (SELECT COUNT(*) FROM academies) as total_academies,
        (SELECT COUNT(*) FROM academies WHERE status = 'active') as active_academies,
        (SELECT COUNT(*) FROM academies WHERE status IN ('inactive', 'suspended')) as inactive_academies,
        (SELECT COUNT(*) FROM players) as total_players,
        (SELECT COUNT(*) FROM academies WHERE created_at >= NOW() - INTERVAL '30 days') as recent_registrations
    `);
    
    const row = statsResult.rows[0];
    
    const stats = {
      totalAcademies: parseInt(row.total_academies),
      activeAcademies: parseInt(row.active_academies),
      inactiveAcademies: parseInt(row.inactive_academies),
      verifiedAcademies: 0, // Placeholder
      unverifiedAcademies: parseInt(row.total_academies), // Placeholder logic from original
      totalPlayers: parseInt(row.total_players),
      recentRegistrations: parseInt(row.recent_registrations)
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching academy stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch academy statistics'
    });
  }
};

router.get('/stats/overview', handleGetAcademyStats);

export default router;