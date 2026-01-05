import { Router, Request, Response } from 'express';
import { query } from '../lib/db.js';

// Get Academy Profile
export async function handleGetAcademyProfile(req: Request, res: Response) {
  try {
    const academyId = (req as any).user.id;
    
    // Fetch academy details
    // We select columns that exist in the football-auth.ts schema
    // and alias them to match the expected response structure
    const academyResult = await query(
      `SELECT id, name, email, director_name as contact_person, phone, address, 
              district as city, province as country, 
              founded_year, website, 
              status, storage_used, created_at 
       FROM academies WHERE id = $1`,
      [academyId]
    );

    if (academyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Academy not found'
      });
    }

    const academy = academyResult.rows[0];

    // Fetch active subscription
    const subResult = await query(
      `SELECT sp.name, sp.player_limit, sp.storage_limit, 
              asub.status, asub.end_date, asub.auto_renew
       FROM academy_subscriptions asub
       JOIN subscription_plans sp ON asub.plan_id = sp.id
       WHERE asub.academy_id = $1 AND asub.status = 'ACTIVE'
       ORDER BY asub.created_at DESC LIMIT 1`,
      [academyId]
    );

    const currentSubscription = subResult.rows[0] || null;

    // Fetch stats
    let playerStats = { total: 0, active: 0 };
    try {
      const pResult = await query(
        `SELECT COUNT(*) as total, 
                COUNT(CASE WHEN is_active = true THEN 1 END) as active 
         FROM players WHERE academy_id = $1`, 
        [academyId]
      );
      if (pResult.rows.length > 0) {
        playerStats = { 
          total: parseInt(pResult.rows[0].total), 
          active: parseInt(pResult.rows[0].active) 
        };
      }
    } catch (e) {
      // ignore
    }

    let docCount = 0;
    try {
      const dResult = await query(
        `SELECT COUNT(*) as total FROM documents WHERE academy_id = $1`,
        [academyId]
      );
      if (dResult.rows.length > 0) docCount = parseInt(dResult.rows[0].total);
    } catch (e) {
      // ignore
    }

    res.json({
      success: true,
      data: {
        academy: {
          id: academy.id,
          name: academy.name,
          email: academy.email,
          contactPerson: academy.contact_person, 
          phone: academy.phone,
          address: academy.address,
          city: academy.city,
          country: academy.country,
          licenseNumber: null, // Not in schema
          foundedYear: academy.founded_year,
          website: academy.website,
          description: null, // Not in schema
          logo: null, // Not in schema
          isVerified: academy.status === 'active', // Best guess mapping
          storageUsed: parseInt(academy.storage_used || '0'),
          createdAt: academy.created_at
        },
        subscription: currentSubscription ? {
          plan: currentSubscription.name,
          status: currentSubscription.status,
          playerLimit: currentSubscription.player_limit,
          storageLimit: parseInt(currentSubscription.storage_limit || '0'),
          endDate: currentSubscription.end_date,
          autoRenew: currentSubscription.auto_renew
        } : null,
        stats: {
          totalPlayers: playerStats.total,
          activePlayers: playerStats.active,
          totalDocuments: docCount,
          storageUsedMB: Math.round(parseInt(academy.storage_used || '0') / (1024 * 1024))
        },
        recentActivities: [] // Placeholder for now
      }
    });

  } catch (error) {
    console.error('Get academy profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Update Academy Profile
export async function handleUpdateAcademyProfile(req: Request, res: Response) {
  try {
    const academyId = (req as any).user.id;
    const {
      name,
      contactPerson,
      phone,
      address,
      city,
      country,
      licenseNumber,
      foundedYear,
      website,
      description,
      logo
    } = req.body;

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [academyId];
    let paramIndex = 2;

    if (name) { updates.push(`name = $${paramIndex++}`); values.push(name); }
    if (contactPerson) { updates.push(`contact_person = $${paramIndex++}`); values.push(contactPerson); }
    if (phone) { updates.push(`phone = $${paramIndex++}`); values.push(phone); }
    if (address) { updates.push(`address = $${paramIndex++}`); values.push(address); }
    if (city) { updates.push(`city = $${paramIndex++}`); values.push(city); }
    if (country) { updates.push(`country = $${paramIndex++}`); values.push(country); }
    if (licenseNumber) { updates.push(`license_number = $${paramIndex++}`); values.push(licenseNumber); }
    if (foundedYear) { updates.push(`founded_year = $${paramIndex++}`); values.push(parseInt(foundedYear)); }
    if (website) { updates.push(`website = $${paramIndex++}`); values.push(website); }
    if (description) { updates.push(`description = $${paramIndex++}`); values.push(description); }
    if (logo) { updates.push(`logo = $${paramIndex++}`); values.push(logo); }
    
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) { // Only updated_at
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    const result = await query(
      `UPDATE academies SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Academy not found'
      });
    }

    const updatedAcademy = result.rows[0];

    res.json({
      success: true,
      message: 'Academy profile updated successfully',
      data: {
        id: updatedAcademy.id,
        name: updatedAcademy.name,
        contactPerson: updatedAcademy.contact_person,
        phone: updatedAcademy.phone,
        address: updatedAcademy.address,
        city: updatedAcademy.city,
        country: updatedAcademy.country,
        licenseNumber: updatedAcademy.license_number,
        foundedYear: updatedAcademy.founded_year,
        website: updatedAcademy.website,
        description: updatedAcademy.description,
        logo: updatedAcademy.logo,
        updatedAt: updatedAcademy.updated_at
      }
    });

  } catch (error) {
    console.error('Update academy profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Get All Academies (Admin only)
export async function handleGetAllAcademies(req: Request, res: Response) {
  try {
    const { page = 1, limit = 10, search, status, country } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    const limitVal = Number(limit);

    // Base query
    let baseQuery = `FROM academies a LEFT JOIN academy_subscriptions sub ON a.id = sub.academy_id AND sub.status = 'ACTIVE' LEFT JOIN subscription_plans sp ON sub.plan_id = sp.id WHERE 1=1`;
    const params: any[] = [];
    let pIdx = 1;

    if (search) {
      baseQuery += ` AND (a.name ILIKE $${pIdx} OR a.email ILIKE $${pIdx})`;
      params.push(`%${search}%`);
      pIdx++;
    }
    
    if (status) {
        if (status === 'active') {
             baseQuery += ` AND a.status = 'active'`;
        } else if (status === 'inactive') {
             baseQuery += ` AND a.status != 'active'`;
        }
    }
    
    if (country) {
       baseQuery += ` AND a.province ILIKE $${pIdx}`;
       params.push(`%${country}%`);
       pIdx++;
    }

    // Count query
    const countRes = await query(`SELECT COUNT(a.id) as total ${baseQuery}`, params);
    const total = parseInt(countRes.rows[0].total);

    // Data query
    const dataQuery = `
      SELECT a.id, a.name, a.email, a.director_name as "contactPerson", a.phone, 
             a.district as city, a.province as country, 
             a.status, a.created_at,
             sp.name as plan_name, sub.status as sub_status, sub.end_date as sub_end_date,
             (SELECT COUNT(*) FROM players p WHERE p.academy_id = a.id) as player_count,
             (SELECT COUNT(*) FROM documents d WHERE d.academy_id = a.id) as doc_count
      ${baseQuery}
      ORDER BY a.created_at DESC
      LIMIT $${pIdx} OFFSET $${pIdx+1}
    `;
    
    params.push(limitVal, offset);
    
    const result = await query(dataQuery, params);

    const academiesWithStats = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      contactPerson: row.contactPerson,
      phone: row.phone,
      city: row.city,
      country: row.country,
      isActive: row.status === 'active',
      isVerified: row.status === 'active', // mapping status to verified
      createdAt: row.created_at,
      subscription: row.plan_name ? {
        plan: row.plan_name,
        status: row.sub_status,
        endDate: row.sub_end_date
      } : null,
      stats: {
        totalPlayers: parseInt(row.player_count || '0'),
        totalDocuments: parseInt(row.doc_count || '0')
      }
    }));

    res.json({
      success: true,
      data: {
        academies: academiesWithStats,
        pagination: {
          page: Number(page),
          limit: limitVal,
          total,
          pages: Math.ceil(total / limitVal)
        }
      }
    });

  } catch (error) {
    console.error('Get all academies error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Toggle Academy Status (Admin only)
export async function handleToggleAcademyStatus(req: Request, res: Response) {
  try {
    const { academyId } = req.params;
    const { isActive } = req.body;

    const newStatus = isActive ? 'active' : 'inactive';

    const result = await query(
      `UPDATE academies SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, status`,
      [newStatus, academyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Academy not found'
      });
    }

    const updatedAcademy = result.rows[0];

    res.json({
      success: true,
      message: `Academy ${updatedAcademy.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: updatedAcademy.id,
        name: updatedAcademy.name,
        isActive: updatedAcademy.status === 'active'
      }
    });

  } catch (error) {
    console.error('Toggle academy status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Verify Academy (Admin only)
export async function handleVerifyAcademy(req: Request, res: Response) {
  try {
    const { academyId } = req.params;
    const { isVerified } = req.body;

    // Mapping verified to active status for now as there is no specific verified column
    const newStatus = isVerified ? 'active' : 'inactive';

    const result = await query(
      `UPDATE academies SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, status`,
      [newStatus, academyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Academy not found'
      });
    }

    const updatedAcademy = result.rows[0];

    res.json({
      success: true,
      message: `Academy ${updatedAcademy.status === 'active' ? 'verified' : 'unverified'} successfully`,
      data: {
        id: updatedAcademy.id,
        name: updatedAcademy.name,
        isVerified: updatedAcademy.status === 'active'
      }
    });

  } catch (error) {
    console.error('Verify academy error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Get Academy Statistics (Admin only)
export async function handleGetAcademyStatistics(req: Request, res: Response) {
  try {
     // 1. Counts
     const counts = await query(`
       SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN status = 'active' THEN 1 END) as active
       FROM academies
     `);
     const totalAcademies = parseInt(counts.rows[0].total);
     const activeAcademies = parseInt(counts.rows[0].active);
     
     // 2. Players
     const pCount = await query(`SELECT COUNT(*) as total FROM players`);
     const totalPlayers = parseInt(pCount.rows[0].total || '0');

     // 3. Subscriptions
     const sCount = await query(`SELECT COUNT(*) as total FROM academy_subscriptions WHERE status = 'ACTIVE'`);
     const totalSubscriptions = parseInt(sCount.rows[0].total || '0');

     // 4. Recent registrations
     const recent = await query(`
       SELECT id, name, email, district as city, province as country, created_at
       FROM academies
       ORDER BY created_at DESC
       LIMIT 5
     `);
     
     // 5. Subscription distribution
     const dist = await query(`
       SELECT sp.name, COUNT(asub.id) as count
       FROM academy_subscriptions asub
       JOIN subscription_plans sp ON asub.plan_id = sp.id
       WHERE asub.status = 'ACTIVE'
       GROUP BY sp.name
     `);

    res.json({
      success: true,
      data: {
        overview: {
          totalAcademies,
          activeAcademies,
          verifiedAcademies: activeAcademies,
          totalPlayers,
          totalSubscriptions
        },
        subscriptionDistribution: dist.rows.map(r => ({ plan: r.name, count: parseInt(r.count) })),
        recentRegistrations: recent.rows.map(r => ({
          id: r.id,
          name: r.name,
          email: r.email,
          city: r.city,
          country: r.country,
          createdAt: r.created_at
        }))
      }
    });

  } catch (error) {
    console.error('Get academy statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}