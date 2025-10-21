import { PrismaClient } from '../generated/prisma/index.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedFootballData() {
  console.log('🌱 Starting football academy database seeding...');

  try {
    // Create subscription plans
    console.log('📋 Creating subscription plans...');
    const basicPlan = await prisma.subscriptionPlan.create({
      data: {
        name: 'Basic',
        description: 'Perfect for small academies getting started',
        price: 29.99,
        currency: 'USD',
        playerLimit: 20,
        storageLimit: 524288000, // 500MB in bytes
        features: [
          'Up to 20 players',
          '500MB storage',
          'Basic player profiles',
          'Document uploads',
          'Email support'
        ],
        isActive: true
      }
    });

    const proPlan = await prisma.subscriptionPlan.create({
      data: {
        name: 'Pro',
        description: 'Ideal for growing academies with more players',
        price: 79.99,
        currency: 'USD',
        playerLimit: 100,
        storageLimit: 2147483648, // 2GB in bytes
        features: [
          'Up to 100 players',
          '2GB storage',
          'Advanced player profiles',
          'Document uploads',
          'Performance analytics',
          'Priority support',
          'Export capabilities'
        ],
        isActive: true
      }
    });

    const elitePlan = await prisma.subscriptionPlan.create({
      data: {
        name: 'Elite',
        description: 'For large academies with unlimited needs',
        price: 199.99,
        currency: 'USD',
        playerLimit: -1, // Unlimited
        storageLimit: 10737418240, // 10GB in bytes
        features: [
          'Unlimited players',
          '10GB storage',
          'Premium player profiles',
          'Document uploads',
          'Advanced analytics',
          'Custom reports',
          'API access',
          'Dedicated support',
          'White-label options'
        ],
        isActive: true
      }
    });

    // Create demo admin users
    console.log('👤 Creating admin users...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const superAdmin = await prisma.admin.create({
      data: {
        email: 'admin@gfarp.com',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        isActive: true
      }
    });

    const regularAdmin = await prisma.admin.create({
      data: {
        email: 'support@gfarp.com',
        password: hashedPassword,
        firstName: 'Support',
        lastName: 'Admin',
        role: 'ADMIN',
        isActive: true
      }
    });

    // Create demo academies
    console.log('🏟️ Creating demo academies...');
    const academyPassword = await bcrypt.hash('academy123', 10);

    const academy1 = await prisma.academy.create({
      data: {
        name: 'Barcelona Youth Academy',
        email: 'info@barcelonayouth.com',
        password: academyPassword,
        contactPerson: 'Carlos Rodriguez',
        phone: '+34-123-456-789',
        address: 'Camp Nou, Barcelona',
        city: 'Barcelona',
        country: 'Spain',
        licenseNumber: 'FIFA-ES-001',
        foundedYear: 1995,
        website: 'https://barcelonayouth.com',
        description: 'Premier youth football academy in Barcelona focusing on technical development',
        isActive: true,
        isVerified: true,
        storageUsed: 157286400 // ~150MB
      }
    });

    const academy2 = await prisma.academy.create({
      data: {
        name: 'Manchester United Academy',
        email: 'academy@manutd.com',
        password: academyPassword,
        contactPerson: 'James Wilson',
        phone: '+44-161-868-8000',
        address: 'Old Trafford, Manchester',
        city: 'Manchester',
        country: 'England',
        licenseNumber: 'FIFA-EN-002',
        foundedYear: 1998,
        website: 'https://manutd.com/academy',
        description: 'Historic academy producing world-class football talent',
        isActive: true,
        isVerified: true,
        storageUsed: 314572800 // ~300MB
      }
    });

    // Create subscriptions for academies
    console.log('💳 Creating subscriptions...');
    const subscription1 = await prisma.subscription.create({
      data: {
        academyId: academy1.id,
        planId: proPlan.id,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        autoRenew: true
      }
    });

    const subscription2 = await prisma.subscription.create({
      data: {
        academyId: academy2.id,
        planId: elitePlan.id,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        autoRenew: true
      }
    });

    // Create demo players
    console.log('⚽ Creating demo players...');
    const players = [
      {
        academyId: academy1.id,
        firstName: 'Lionel',
        lastName: 'Martinez',
        dateOfBirth: new Date('2005-06-24'),
        nationality: 'Argentina',
        position: 'Forward',
        height: 170.0,
        weight: 68.0,
        email: 'lionel.martinez@email.com',
        phone: '+34-600-123-456',
        currentClub: 'Barcelona Youth',
        trainingStartDate: new Date('2023-01-15'),
        internalNotes: 'Exceptional dribbling skills, left-footed'
      },
      {
        academyId: academy1.id,
        firstName: 'Sofia',
        lastName: 'Garcia',
        dateOfBirth: new Date('2006-03-12'),
        nationality: 'Spain',
        position: 'Midfielder',
        height: 165.0,
        weight: 58.0,
        email: 'sofia.garcia@email.com',
        phone: '+34-600-789-123',
        currentClub: 'Barcelona Youth',
        trainingStartDate: new Date('2023-02-01'),
        internalNotes: 'Great vision and passing ability'
      },
      {
        academyId: academy2.id,
        firstName: 'Marcus',
        lastName: 'Johnson',
        dateOfBirth: new Date('2005-09-18'),
        nationality: 'England',
        position: 'Defender',
        height: 185.0,
        weight: 78.0,
        email: 'marcus.johnson@email.com',
        phone: '+44-7700-900-123',
        currentClub: 'Manchester United Academy',
        trainingStartDate: new Date('2023-01-10'),
        internalNotes: 'Strong in aerial duels, leadership qualities'
      },
      {
        academyId: academy2.id,
        firstName: 'Emma',
        lastName: 'Thompson',
        dateOfBirth: new Date('2006-01-30'),
        nationality: 'England',
        position: 'Goalkeeper',
        height: 175.0,
        weight: 65.0,
        email: 'emma.thompson@email.com',
        phone: '+44-7700-900-456',
        currentClub: 'Manchester United Academy',
        trainingStartDate: new Date('2023-03-01'),
        internalNotes: 'Excellent reflexes, good distribution'
      }
    ];

    for (const playerData of players) {
      await prisma.player.create({ data: playerData });
    }

    // Create demo payments
    console.log('💰 Creating payment records...');
    await prisma.payment.create({
      data: {
        academyId: academy1.id,
        subscriptionId: subscription1.id,
        amount: 79.99,
        currency: 'USD',
        status: 'COMPLETED',
        paymentMethod: 'stripe',
        transactionId: 'txn_1234567890',
        paymentDate: new Date()
      }
    });

    await prisma.payment.create({
      data: {
        academyId: academy2.id,
        subscriptionId: subscription2.id,
        amount: 199.99,
        currency: 'USD',
        status: 'COMPLETED',
        paymentMethod: 'paypal',
        transactionId: 'txn_0987654321',
        paymentDate: new Date()
      }
    });

    // Create system settings
    console.log('⚙️ Creating system settings...');
    const systemSettings = [
      {
        key: 'platform_name',
        value: 'Global Football Academy Registration Platform',
        description: 'The name of the platform',
        isPublic: true
      },
      {
        key: 'max_file_size',
        value: '10485760', // 10MB in bytes
        description: 'Maximum file upload size in bytes',
        isPublic: false
      },
      {
        key: 'allowed_file_types',
        value: 'pdf,jpg,jpeg,png,doc,docx',
        description: 'Allowed file types for uploads',
        isPublic: false
      },
      {
        key: 'support_email',
        value: 'support@gfarp.com',
        description: 'Support contact email',
        isPublic: true
      },
      {
        key: 'maintenance_mode',
        value: 'false',
        description: 'Whether the platform is in maintenance mode',
        isPublic: false
      }
    ];

    for (const setting of systemSettings) {
      await prisma.systemSetting.create({ data: setting });
    }

    // Create activity logs
    console.log('📝 Creating activity logs...');
    await prisma.activity.create({
      data: {
        academyId: academy1.id,
        action: 'academy_registered',
        description: 'Academy registered successfully',
        metadata: { plan: 'Pro' },
        ipAddress: '192.168.1.100'
      }
    });

    await prisma.activity.create({
      data: {
        adminId: superAdmin.id,
        action: 'admin_login',
        description: 'Super admin logged in',
        metadata: { role: 'SUPER_ADMIN' },
        ipAddress: '10.0.0.1'
      }
    });

    console.log('✅ Football academy database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Created 3 subscription plans (Basic, Pro, Elite)`);
    console.log(`- Created 2 admin users`);
    console.log(`- Created 2 demo academies`);
    console.log(`- Created 4 demo players`);
    console.log(`- Created 2 payment records`);
    console.log(`- Created 5 system settings`);
    console.log(`- Created 2 activity logs`);
    console.log('\n🔐 Demo Credentials:');
    console.log('Admin: admin@gfarp.com / admin123');
    console.log('Academy: info@barcelonayouth.com / academy123');
    console.log('Academy: academy@manutd.com / academy123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedFootballData()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });