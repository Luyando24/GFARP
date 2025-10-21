import { Router, Request, Response } from 'express';

// Mock data for development - replace with actual Prisma calls when database is connected
const mockPlayers = [
  {
    id: 'player-1',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('2005-03-15'),
    position: 'Forward',
    jerseyNumber: 10,
    height: 175,
    weight: 70,
    nationality: 'USA',
    parentName: 'Jane Doe',
    parentPhone: '+1234567890',
    parentEmail: 'jane.doe@email.com',
    medicalInfo: 'No known allergies',
    emergencyContact: 'Jane Doe - +1234567890',
    isActive: true,
    academyId: 'academy-1',
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2023-01-15')
  },
  {
    id: 'player-2',
    firstName: 'Mike',
    lastName: 'Smith',
    dateOfBirth: new Date('2004-08-22'),
    position: 'Midfielder',
    jerseyNumber: 8,
    height: 180,
    weight: 75,
    nationality: 'USA',
    parentName: 'Sarah Smith',
    parentPhone: '+1234567891',
    parentEmail: 'sarah.smith@email.com',
    medicalInfo: 'Asthma - carries inhaler',
    emergencyContact: 'Sarah Smith - +1234567891',
    isActive: true,
    academyId: 'academy-1',
    createdAt: new Date('2023-02-10'),
    updatedAt: new Date('2023-02-10')
  }
];

// Create Player
export async function handleCreatePlayer(req: Request, res: Response) {
  try {
    const academyId = (req as any).user.id;
    const {
      firstName,
      lastName,
      dateOfBirth,
      position,
      email,
      phone,
      address,
      city,
      country,
      parentName,
      parentPhone,
      parentEmail,
      medicalInfo,
      emergencyContact,
      emergencyPhone,
      height,
      weight,
      preferredFoot,
      jerseyNumber,
      notes
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !dateOfBirth || !position) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: firstName, lastName, dateOfBirth, position'
      });
    }

    // Check academy's subscription limits
    const academy = await prisma.academy.findUnique({
      where: { id: academyId },
      include: {
        subscriptions: {
          include: {
            plan: true
          },
          where: {
            status: 'ACTIVE'
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        },
        _count: {
          select: {
            players: {
              where: {
                isActive: true
              }
            }
          }
        }
      }
    });

    if (!academy) {
      return res.status(404).json({
        success: false,
        message: 'Academy not found'
      });
    }

    const currentSubscription = academy.subscriptions[0];
    if (!currentSubscription) {
      return res.status(403).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Check player limit
    if (academy._count.players >= currentSubscription.plan.playerLimit) {
      return res.status(403).json({
        success: false,
        message: `Player limit reached. Your ${currentSubscription.plan.name} plan allows up to ${currentSubscription.plan.playerLimit} players.`
      });
    }

    // Check if jersey number is already taken (if provided)
    if (jerseyNumber) {
      const existingPlayer = await prisma.player.findFirst({
        where: {
          academyId,
          jerseyNumber: parseInt(jerseyNumber),
          isActive: true
        }
      });

      if (existingPlayer) {
        return res.status(409).json({
          success: false,
          message: `Jersey number ${jerseyNumber} is already taken`
        });
      }
    }

    // Create player
    const player = await prisma.player.create({
      data: {
        academyId,
        firstName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
        position,
        email,
        phone,
        address,
        city,
        country,
        parentName,
        parentPhone,
        parentEmail,
        medicalInfo,
        emergencyContact,
        emergencyPhone,
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
        preferredFoot,
        jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : null,
        notes,
        isActive: true
      }
    });

    // Log activity
    await prisma.activity.create({
      data: {
        academyId,
        action: 'player_created',
        description: `Player ${firstName} ${lastName} added to academy`,
        metadata: { 
          playerId: player.id,
          position,
          jerseyNumber: jerseyNumber || null
        },
        ipAddress: req.ip
      }
    });

    res.status(201).json({
      success: true,
      message: 'Player created successfully',
      data: {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        dateOfBirth: player.dateOfBirth,
        position: player.position,
        email: player.email,
        phone: player.phone,
        jerseyNumber: player.jerseyNumber,
        isActive: player.isActive,
        createdAt: player.createdAt
      }
    });

  } catch (error) {
    console.error('Create player error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Get Academy Players
export async function handleGetAcademyPlayers(req: Request, res: Response) {
  try {
    const academyId = (req as any).user.id;
    const { page = 1, limit = 10, search, position, status } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { academyId };

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (position) {
      where.position = position;
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: [
          { jerseyNumber: 'asc' },
          { lastName: 'asc' }
        ]
      }),
      prisma.player.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        players,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    console.error('Get academy players error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Get Player Details
export async function handleGetPlayerDetails(req: Request, res: Response) {
  try {
    const academyId = (req as any).user.id;
    const { playerId } = req.params;

    const player = await prisma.player.findFirst({
      where: {
        id: playerId,
        academyId
      }
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    res.json({
      success: true,
      data: player
    });

  } catch (error) {
    console.error('Get player details error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Update Player
export async function handleUpdatePlayer(req: Request, res: Response) {
  try {
    const academyId = (req as any).user.id;
    const { playerId } = req.params;
    const updateData = req.body;

    // Check if player belongs to academy
    const existingPlayer = await prisma.player.findFirst({
      where: {
        id: playerId,
        academyId
      }
    });

    if (!existingPlayer) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Check jersey number conflict (if updating jersey number)
    if (updateData.jerseyNumber && updateData.jerseyNumber !== existingPlayer.jerseyNumber) {
      const conflictPlayer = await prisma.player.findFirst({
        where: {
          academyId,
          jerseyNumber: parseInt(updateData.jerseyNumber),
          isActive: true,
          id: { not: playerId }
        }
      });

      if (conflictPlayer) {
        return res.status(409).json({
          success: false,
          message: `Jersey number ${updateData.jerseyNumber} is already taken`
        });
      }
    }

    // Prepare update data
    const dataToUpdate: any = {
      updatedAt: new Date()
    };

    // Only update provided fields
    const allowedFields = [
      'firstName', 'lastName', 'dateOfBirth', 'position', 'email', 'phone',
      'address', 'city', 'country', 'parentName', 'parentPhone', 'parentEmail',
      'medicalInfo', 'emergencyContact', 'emergencyPhone', 'height', 'weight',
      'preferredFoot', 'jerseyNumber', 'notes', 'isActive'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (field === 'dateOfBirth') {
          dataToUpdate[field] = new Date(updateData[field]);
        } else if (field === 'height' || field === 'weight') {
          dataToUpdate[field] = updateData[field] ? parseFloat(updateData[field]) : null;
        } else if (field === 'jerseyNumber') {
          dataToUpdate[field] = updateData[field] ? parseInt(updateData[field]) : null;
        } else {
          dataToUpdate[field] = updateData[field];
        }
      }
    });

    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: dataToUpdate
    });

    // Log activity
    await prisma.activity.create({
      data: {
        academyId,
        action: 'player_updated',
        description: `Player ${updatedPlayer.firstName} ${updatedPlayer.lastName} profile updated`,
        metadata: { 
          playerId: updatedPlayer.id,
          updatedFields: Object.keys(updateData)
        },
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'Player updated successfully',
      data: updatedPlayer
    });

  } catch (error) {
    console.error('Update player error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Delete Player
export async function handleDeletePlayer(req: Request, res: Response) {
  try {
    const academyId = (req as any).user.id;
    const { playerId } = req.params;

    // Check if player belongs to academy
    const player = await prisma.player.findFirst({
      where: {
        id: playerId,
        academyId
      }
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Soft delete - set isActive to false
    const deletedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: { 
        isActive: false,
        updatedAt: new Date()
      }
    });

    // Log activity
    await prisma.activity.create({
      data: {
        academyId,
        action: 'player_deleted',
        description: `Player ${player.firstName} ${player.lastName} removed from academy`,
        metadata: { 
          playerId: player.id,
          playerName: `${player.firstName} ${player.lastName}`
        },
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'Player deleted successfully',
      data: {
        id: deletedPlayer.id,
        firstName: deletedPlayer.firstName,
        lastName: deletedPlayer.lastName,
        isActive: deletedPlayer.isActive
      }
    });

  } catch (error) {
    console.error('Delete player error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Get Player Statistics
export async function handleGetPlayerStatistics(req: Request, res: Response) {
  try {
    const academyId = (req as any).user.id;

    const [
      totalPlayers,
      activePlayers,
      positionStats,
      ageGroups,
      recentPlayers
    ] = await Promise.all([
      prisma.player.count({ where: { academyId } }),
      prisma.player.count({ where: { academyId, isActive: true } }),
      prisma.player.groupBy({
        by: ['position'],
        where: { academyId, isActive: true },
        _count: true,
        orderBy: {
          _count: {
            position: 'desc'
          }
        }
      }),
      prisma.$queryRaw`
        SELECT 
          CASE 
            WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 12 THEN 'Under 12'
            WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 15 THEN 'Under 15'
            WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 18 THEN 'Under 18'
            ELSE 'Over 18'
          END as age_group,
          COUNT(*) as count
        FROM "Player" 
        WHERE academy_id = ${academyId} AND is_active = true
        GROUP BY age_group
        ORDER BY count DESC
      `,
      prisma.player.findMany({
        where: { academyId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          position: true,
          dateOfBirth: true,
          createdAt: true
        }
      })
    ]);

    const positionDistribution = positionStats.map(stat => ({
      position: stat.position,
      count: stat._count
    }));

    res.json({
      success: true,
      data: {
        overview: {
          totalPlayers,
          activePlayers,
          inactivePlayers: totalPlayers - activePlayers
        },
        positionDistribution,
        ageGroups,
        recentPlayers
      }
    });

  } catch (error) {
    console.error('Get player statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Bulk Import Players
export async function handleBulkImportPlayers(req: Request, res: Response) {
  try {
    const academyId = (req as any).user.id;
    const { players } = req.body;

    if (!Array.isArray(players) || players.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Players array is required and cannot be empty'
      });
    }

    // Check academy's subscription limits
    const academy = await prisma.academy.findUnique({
      where: { id: academyId },
      include: {
        subscriptions: {
          include: {
            plan: true
          },
          where: {
            status: 'ACTIVE'
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        },
        _count: {
          select: {
            players: {
              where: {
                isActive: true
              }
            }
          }
        }
      }
    });

    if (!academy) {
      return res.status(404).json({
        success: false,
        message: 'Academy not found'
      });
    }

    const currentSubscription = academy.subscriptions[0];
    if (!currentSubscription) {
      return res.status(403).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Check if bulk import would exceed player limit
    const newPlayerCount = academy._count.players + players.length;
    if (newPlayerCount > currentSubscription.plan.playerLimit) {
      return res.status(403).json({
        success: false,
        message: `Bulk import would exceed player limit. Your ${currentSubscription.plan.name} plan allows up to ${currentSubscription.plan.playerLimit} players. You currently have ${academy._count.players} players and are trying to add ${players.length} more.`
      });
    }

    const results = {
      successful: [],
      failed: []
    };

    // Process each player
    for (let i = 0; i < players.length; i++) {
      const playerData = players[i];
      
      try {
        // Validate required fields
        if (!playerData.firstName || !playerData.lastName || !playerData.dateOfBirth || !playerData.position) {
          results.failed.push({
            row: i + 1,
            data: playerData,
            error: 'Missing required fields: firstName, lastName, dateOfBirth, position'
          });
          continue;
        }

        // Check jersey number conflict
        if (playerData.jerseyNumber) {
          const existingPlayer = await prisma.player.findFirst({
            where: {
              academyId,
              jerseyNumber: parseInt(playerData.jerseyNumber),
              isActive: true
            }
          });

          if (existingPlayer) {
            results.failed.push({
              row: i + 1,
              data: playerData,
              error: `Jersey number ${playerData.jerseyNumber} is already taken`
            });
            continue;
          }
        }

        // Create player
        const player = await prisma.player.create({
          data: {
            academyId,
            firstName: playerData.firstName,
            lastName: playerData.lastName,
            dateOfBirth: new Date(playerData.dateOfBirth),
            position: playerData.position,
            email: playerData.email || null,
            phone: playerData.phone || null,
            address: playerData.address || null,
            city: playerData.city || null,
            country: playerData.country || null,
            parentName: playerData.parentName || null,
            parentPhone: playerData.parentPhone || null,
            parentEmail: playerData.parentEmail || null,
            medicalInfo: playerData.medicalInfo || null,
            emergencyContact: playerData.emergencyContact || null,
            emergencyPhone: playerData.emergencyPhone || null,
            height: playerData.height ? parseFloat(playerData.height) : null,
            weight: playerData.weight ? parseFloat(playerData.weight) : null,
            preferredFoot: playerData.preferredFoot || null,
            jerseyNumber: playerData.jerseyNumber ? parseInt(playerData.jerseyNumber) : null,
            notes: playerData.notes || null,
            isActive: true
          }
        });

        results.successful.push({
          row: i + 1,
          player: {
            id: player.id,
            firstName: player.firstName,
            lastName: player.lastName,
            position: player.position,
            jerseyNumber: player.jerseyNumber
          }
        });

      } catch (error) {
        results.failed.push({
          row: i + 1,
          data: playerData,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Log activity
    await prisma.activity.create({
      data: {
        academyId,
        action: 'players_bulk_imported',
        description: `Bulk import completed: ${results.successful.length} successful, ${results.failed.length} failed`,
        metadata: { 
          totalAttempted: players.length,
          successful: results.successful.length,
          failed: results.failed.length
        },
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: `Bulk import completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      data: results
    });

  } catch (error) {
    console.error('Bulk import players error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}