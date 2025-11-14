import { Router, Request, Response } from 'express';
import { query, hashPassword, verifyPassword } from '../lib/db';
import { emailService } from '../lib/email-service';

const router = Router();

// Helper function to log activation history
async function logActivationHistory(
  academyId: string,
  actionType: 'activate' | 'deactivate' | 'verify' | 'unverify',
  previousStatus: boolean | null,
  newStatus: boolean,
  adminEmail?: string,
  reason?: string,
  req?: Request
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
  contactPerson: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  licenseNumber?: string;
  foundedYear?: number;
  website?: string;
  description?: string;
}

// GET /api/academies - Get all academies with pagination and filtering
router.get('/', async (req: Request, res: Response) => {
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
        CASE WHEN status = 'active' THEN true ELSE false END as "isActive"
      FROM academies ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, skip]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM academies ${whereClause}`,
      params
    );

    const academies = academiesResult.rows;
    const total = parseInt(countResult.rows[0].total);

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
});

// GET /api/academies/:id - Get academy by ID
router.get('/:id', async (req: Request, res: Response) => {
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
    // For now, we'll use placeholder names since we need to implement decryption
    const playersResult = await query(
      `SELECT id, 
              CASE 
                WHEN first_name_cipher IS NOT NULL THEN CONCAT('Player ', ROW_NUMBER() OVER (ORDER BY created_at))
                ELSE 'Unknown Player'
              END as "firstName",
              CASE 
                WHEN last_name_cipher IS NOT NULL THEN CONCAT('#', jersey_number)
                ELSE CONCAT('ID-', SUBSTRING(id::text, 1, 6))
              END as "lastName",
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

    // Get player count
    const playerCountResult = await query(
      'SELECT COUNT(*) as count FROM players WHERE academy_id = $1',
      [id]
    );

    // For now, we'll return basic academy data with players
    // Subscriptions and other relations can be added later if needed
    const academyData = {
      ...academy,
      foundedYear: academy.founded_year,
      createdAt: academy.created_at,
      updatedAt: academy.updated_at,
      isActive: academy.status === 'active',
      subscriptionPlan: academy.subscription_plan || 'Free Plan',
      players: playersResult.rows,
      player_count: parseInt(playerCountResult.rows[0].count) || 0,
      _count: {
        players: parseInt(playerCountResult.rows[0].count) || 0,
        documents: 0, // Can be implemented later
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
});

// POST /api/academies - Create new academy
router.post('/', async (req: Request, res: Response) => {
  try {
    const academyData: AcademyData = req.body;

    // Validate required fields
    const requiredFields = ['name', 'email', 'contactPerson', 'phone', 'address', 'city', 'country'];
    const missingFields = requiredFields.filter(field => !academyData[field]);

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

    // Check if license number already exists (if provided)
    if (academyData.licenseNumber) {
      const existingLicenseResult = await query(
        'SELECT id FROM academies WHERE license_number = $1',
        [academyData.licenseNumber]
      );

      if (existingLicenseResult.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Academy with this license number already exists'
        });
      }
    }

    // Hash password if provided
    let hashedPassword = '';
    if (academyData.password) {
      hashedPassword = await hashPassword(academyData.password);
    }

    // Insert new academy
    const insertResult = await query(
      `INSERT INTO academies (
        name, email, password, contact_person, phone, address, city, country,
        license_number, founded_year, website, description, is_active, is_verified, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING id, name, email, contact_person, phone, address, city, country,
                license_number, founded_year, website, description, is_active, is_verified, created_at`,
      [
        academyData.name,
        academyData.email,
        hashedPassword,
        academyData.contactPerson,
        academyData.phone,
        academyData.address,
        academyData.city,
        academyData.country,
        academyData.licenseNumber || null,
        academyData.foundedYear || null,
        academyData.website || null,
        academyData.description || null,
        true, // is_active
        false // is_verified
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
});

// PUT /api/academies/:id - Update academy
router.put('/:id', async (req: Request, res: Response) => {
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
    updateValues.push(new Date());

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
});
// DELETE /api/academies/:id - Delete academy (soft delete by setting status to inactive)
router.delete('/:id', async (req: Request, res: Response) => {
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
        ['inactive', new Date(), id]
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
});
// PATCH /api/academies/:id/activate - Activate/Deactivate academy
router.patch('/:id/activate', async (req: Request, res: Response) => {
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
      [newStatus, new Date(), id]
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
});
// PATCH /api/academies/:id/verify - Verify academy
router.patch('/:id/verify', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isVerified, reason } = req.body;
    const adminEmail = (req as any).user?.email;

    // Get current status
    const academyResult = await query('SELECT is_verified FROM academies WHERE id = $1', [id]);
    if (academyResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Academy not found' });
    }
    const previousStatus = academyResult.rows[0].is_verified;

    // Update academy status
    const result = await query(
      'UPDATE academies SET is_verified = $1, verified_at = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [isVerified, new Date().toISOString(), id]
    );

    // Log activation history
    await logActivationHistory(
      academyId,
      actionType,
      previousStatus,
      newStatus,
      adminEmail,
      reason,
      ipAddress,
      userAgent
    );

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
    console.error('Error updating academy verification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update academy verification'
    });
  }
});

// GET /api/academies/stats/overview - Get academy statistics
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    // Get total academies count
    const totalAcademiesResult = await query('SELECT COUNT(*) as count FROM academies');
    const totalAcademies = parseInt(totalAcademiesResult.rows[0].count);

    // Get active academies count
    const activeAcademiesResult = await query('SELECT COUNT(*) as count FROM academies WHERE status = \'active\'');
    const activeAcademies = parseInt(activeAcademiesResult.rows[0].count);

    // Get inactive academies count
    const inactiveAcademiesResult = await query('SELECT COUNT(*) as count FROM academies WHERE status IN (\'inactive\', \'suspended\')');
    const inactiveAcademies = parseInt(inactiveAcademiesResult.rows[0].count);

    // Get verified academies count (assuming we don't have this column yet, set to 0)
    const verifiedAcademies = 0;

    // Get unverified academies count
    const unverifiedAcademies = totalAcademies;

    // Get total players count
    const totalPlayersResult = await query('SELECT COUNT(*) as count FROM players');
    const totalPlayers = parseInt(totalPlayersResult.rows[0].count);

    // Get recent registrations (last 30 days)
    const recentRegistrationsResult = await query(`
      SELECT COUNT(*) as count 
      FROM academies 
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    const recentRegistrations = parseInt(recentRegistrationsResult.rows[0].count);

    const stats = {
      totalAcademies,
      activeAcademies,
      inactiveAcademies,
      verifiedAcademies,
      unverifiedAcademies,
      totalPlayers,
      recentRegistrations
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
});

export default router;