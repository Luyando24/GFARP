import { Router, Request, Response } from 'express';

// Mock data for development - replace with actual Prisma calls when database is connected
const mockSubscriptionPlans = [
  {
    id: 'plan-1',
    name: 'Basic',
    price: 99,
    currency: 'USD',
    billingCycle: 'MONTHLY',
    playerLimit: 50,
    features: ['Basic player management', 'Document storage', 'Email support'],
    isActive: true
  },
  {
    id: 'plan-2',
    name: 'Pro',
    price: 199,
    currency: 'USD',
    billingCycle: 'MONTHLY',
    playerLimit: 200,
    features: ['Advanced player management', 'Analytics dashboard', 'Priority support', 'Custom reports'],
    isActive: true
  },
  {
    id: 'plan-3',
    name: 'Elite',
    price: 399,
    currency: 'USD',
    billingCycle: 'MONTHLY',
    playerLimit: 1000,
    features: ['Unlimited features', 'API access', '24/7 support', 'White-label options'],
    isActive: true
  }
];

// Get Subscription Plans
export async function handleGetSubscriptionPlans(req: Request, res: Response) {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });

    res.json({
      success: true,
      data: plans
    });

  } catch (error) {
    console.error('Get subscription plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Get Academy Subscription
export async function handleGetAcademySubscription(req: Request, res: Response) {
  try {
    const academyId = (req as any).user.id;

    const subscription = await prisma.subscription.findFirst({
      where: { 
        academyId,
        status: 'ACTIVE'
      },
      include: {
        plan: true,
        academy: {
          select: {
            name: true,
            email: true,
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
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Calculate usage statistics
    const daysRemaining = Math.ceil((subscription.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const playerUsagePercentage = (subscription.academy._count.players / subscription.plan.playerLimit) * 100;

    res.json({
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          autoRenew: subscription.autoRenew,
          daysRemaining: Math.max(0, daysRemaining),
          isExpiringSoon: daysRemaining <= 30 && daysRemaining > 0,
          isExpired: daysRemaining <= 0
        },
        plan: {
          id: subscription.plan.id,
          name: subscription.plan.name,
          description: subscription.plan.description,
          price: subscription.plan.price,
          currency: subscription.plan.currency,
          billingCycle: subscription.plan.billingCycle,
          playerLimit: subscription.plan.playerLimit,
          storageLimit: subscription.plan.storageLimit,
          features: subscription.plan.features
        },
        usage: {
          playersUsed: subscription.academy._count.players,
          playerLimit: subscription.plan.playerLimit,
          playerUsagePercentage: Math.round(playerUsagePercentage),
          storageUsed: subscription.academy.storageUsed || 0,
          storageLimit: subscription.plan.storageLimit
        }
      }
    });

  } catch (error) {
    console.error('Get academy subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Upgrade Subscription
export async function handleUpgradeSubscription(req: Request, res: Response) {
  try {
    const academyId = (req as any).user.id;
    const { planId, paymentMethodId } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required'
      });
    }

    // Get current subscription
    const currentSubscription = await prisma.subscription.findFirst({
      where: { 
        academyId,
        status: 'ACTIVE'
      },
      include: {
        plan: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!currentSubscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Get new plan
    const newPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!newPlan || !newPlan.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Invalid subscription plan'
      });
    }

    // Check if it's actually an upgrade
    if (newPlan.price <= currentSubscription.plan.price) {
      return res.status(400).json({
        success: false,
        message: 'New plan must be higher tier than current plan'
      });
    }

    // Calculate prorated amount
    const remainingDays = Math.ceil((currentSubscription.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const totalDays = Math.ceil((currentSubscription.endDate.getTime() - currentSubscription.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const proratedCredit = (currentSubscription.plan.price * remainingDays) / totalDays;
    const upgradeAmount = newPlan.price - proratedCredit;

    // Simulate payment processing (replace with actual payment gateway)
    const paymentResult = await simulatePaymentProcessing(upgradeAmount, paymentMethodId);

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Payment failed: ' + paymentResult.error
      });
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        academyId,
        subscriptionId: currentSubscription.id,
        amount: upgradeAmount,
        currency: newPlan.currency,
        status: 'COMPLETED',
        paymentMethod: 'CREDIT_CARD',
        transactionId: paymentResult.transactionId,
        metadata: {
          type: 'upgrade',
          fromPlan: currentSubscription.plan.name,
          toPlan: newPlan.name,
          proratedCredit
        }
      }
    });

    // Update current subscription to cancelled
    await prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: { 
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    });

    // Create new subscription
    const newSubscription = await prisma.subscription.create({
      data: {
        academyId,
        planId: newPlan.id,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        autoRenew: currentSubscription.autoRenew
      }
    });

    // Log activity
    await prisma.activity.create({
      data: {
        academyId,
        action: 'subscription_upgraded',
        description: `Subscription upgraded from ${currentSubscription.plan.name} to ${newPlan.name}`,
        metadata: { 
          fromPlan: currentSubscription.plan.name,
          toPlan: newPlan.name,
          amount: upgradeAmount,
          paymentId: payment.id
        },
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'Subscription upgraded successfully',
      data: {
        subscription: {
          id: newSubscription.id,
          status: newSubscription.status,
          startDate: newSubscription.startDate,
          endDate: newSubscription.endDate
        },
        plan: {
          name: newPlan.name,
          playerLimit: newPlan.playerLimit,
          storageLimit: newPlan.storageLimit
        },
        payment: {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status
        }
      }
    });

  } catch (error) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Renew Subscription
export async function handleRenewSubscription(req: Request, res: Response) {
  try {
    const academyId = (req as any).user.id;
    const { paymentMethodId } = req.body;

    // Get current subscription
    const currentSubscription = await prisma.subscription.findFirst({
      where: { 
        academyId,
        status: { in: ['ACTIVE', 'EXPIRED'] }
      },
      include: {
        plan: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!currentSubscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found'
      });
    }

    // Simulate payment processing
    const paymentResult = await simulatePaymentProcessing(currentSubscription.plan.price, paymentMethodId);

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Payment failed: ' + paymentResult.error
      });
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        academyId,
        subscriptionId: currentSubscription.id,
        amount: currentSubscription.plan.price,
        currency: currentSubscription.plan.currency,
        status: 'COMPLETED',
        paymentMethod: 'CREDIT_CARD',
        transactionId: paymentResult.transactionId,
        metadata: {
          type: 'renewal',
          plan: currentSubscription.plan.name
        }
      }
    });

    // Calculate new end date
    const startDate = currentSubscription.status === 'EXPIRED' ? new Date() : currentSubscription.endDate;
    const endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

    // Update subscription
    const renewedSubscription = await prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        status: 'ACTIVE',
        startDate: currentSubscription.status === 'EXPIRED' ? new Date() : currentSubscription.startDate,
        endDate,
        updatedAt: new Date()
      }
    });

    // Log activity
    await prisma.activity.create({
      data: {
        academyId,
        action: 'subscription_renewed',
        description: `Subscription renewed for ${currentSubscription.plan.name} plan`,
        metadata: { 
          plan: currentSubscription.plan.name,
          amount: currentSubscription.plan.price,
          paymentId: payment.id,
          newEndDate: endDate
        },
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'Subscription renewed successfully',
      data: {
        subscription: {
          id: renewedSubscription.id,
          status: renewedSubscription.status,
          startDate: renewedSubscription.startDate,
          endDate: renewedSubscription.endDate
        },
        payment: {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status
        }
      }
    });

  } catch (error) {
    console.error('Renew subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Cancel Subscription
export async function handleCancelSubscription(req: Request, res: Response) {
  try {
    const academyId = (req as any).user.id;
    const { reason } = req.body;

    // Get current subscription
    const currentSubscription = await prisma.subscription.findFirst({
      where: { 
        academyId,
        status: 'ACTIVE'
      },
      include: {
        plan: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!currentSubscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Update subscription to cancelled (but keep active until end date)
    const cancelledSubscription = await prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        autoRenew: false,
        updatedAt: new Date()
      }
    });

    // Log activity
    await prisma.activity.create({
      data: {
        academyId,
        action: 'subscription_cancelled',
        description: `Subscription cancelled for ${currentSubscription.plan.name} plan`,
        metadata: { 
          plan: currentSubscription.plan.name,
          reason: reason || 'No reason provided',
          endDate: currentSubscription.endDate
        },
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'Subscription cancelled successfully. Access will continue until the end of the current billing period.',
      data: {
        subscription: {
          id: cancelledSubscription.id,
          status: cancelledSubscription.status,
          autoRenew: cancelledSubscription.autoRenew,
          endDate: cancelledSubscription.endDate
        }
      }
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Get Subscription History
export async function handleGetSubscriptionHistory(req: Request, res: Response) {
  try {
    const academyId = (req as any).user.id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where: { academyId },
        include: {
          plan: true,
          payments: {
            orderBy: {
              createdAt: 'desc'
            }
          }
        },
        skip,
        take: parseInt(limit as string),
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.subscription.count({ where: { academyId } })
    ]);

    res.json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Get Payment History
export async function handleGetPaymentHistory(req: Request, res: Response) {
  try {
    const academyId = (req as any).user.id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { academyId },
        include: {
          subscription: {
            include: {
              plan: true
            }
          }
        },
        skip,
        take: parseInt(limit as string),
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.payment.count({ where: { academyId } })
    ]);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Admin: Get All Subscriptions
export async function handleGetAllSubscriptions(req: Request, res: Response) {
  try {
    const { page = 1, limit = 10, status, planId } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (planId) {
      where.planId = planId;
    }

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          academy: {
            select: {
              id: true,
              name: true,
              email: true,
              city: true,
              country: true
            }
          },
          plan: true
        },
        skip,
        take: parseInt(limit as string),
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.subscription.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    console.error('Get all subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Simulate payment processing (replace with actual payment gateway integration)
async function simulatePaymentProcessing(amount: number, paymentMethodId?: string): Promise<{
  success: boolean;
  transactionId?: string;
  error?: string;
}> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simulate random success/failure for demo purposes
  const success = Math.random() > 0.1; // 90% success rate

  if (success) {
    return {
      success: true,
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  } else {
    return {
      success: false,
      error: 'Payment declined by bank'
    };
  }
}