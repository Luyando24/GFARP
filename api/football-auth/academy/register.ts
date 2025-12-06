import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('[VERCEL] Academy registration request received');

    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const body = req.body;
        console.log('[VERCEL] Registration data received:', { name: body.name, email: body.email });

        // Validate required fields - only email and password are required
        if (!body.email || !body.password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        // Initialize Supabase client
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('[VERCEL] Missing Supabase environment variables');
            throw new Error('Server configuration error');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Check if email already exists
        const { data: existingUser, error: checkError } = await supabase
            .from('staff_users')
            .select('id')
            .eq('email', body.email)
            .single();

        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        // 2. Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(body.password, salt);

        // 3. Generate IDs
        const academyId = uuidv4();
        const userId = uuidv4();

        // Use default name if not provided
        const academyName = body.name || 'New Academy';

        // Generate a simple code from name (e.g., "Academy Name" -> "AN-1234")
        const nameInitials = academyName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 3);
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const academyCode = `${nameInitials}-${randomSuffix}`;

        // 4. Insert Academy
        const { error: academyError } = await supabase
            .from('academies')
            .insert({
                id: academyId,
                name: academyName,
                code: academyCode,
                email: body.email,
                phone: body.phone,
                address: body.address,
                district: body.city, // Mapping city to district for now
                province: body.country, // Mapping country to province/region
                director_name: body.contactPerson,
                founded_year: body.foundedYear,
                facilities: body.description ? [body.description] : [], // Storing description in facilities for now or separate field if schema allows
                status: 'active',
                academy_type: 'youth' // Default
            });

        if (academyError) {
            console.error('[VERCEL] Academy creation error:', academyError);
            throw new Error('Failed to create academy record');
        }

        // 5. Generate Verification Token
        const verificationToken = uuidv4();

        // 6. Insert Admin User with token and unverified status
        const nameParts = body.contactPerson ? body.contactPerson.split(' ') : ['Admin'];
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';

        const { error: userError } = await supabase
            .from('staff_users')
            .insert({
                id: userId,
                academy_id: academyId,
                email: body.email,
                password_hash: passwordHash,
                role: 'academy_admin',
                first_name: firstName,
                last_name: lastName,
                phone: body.phone,
                is_active: true,
                email_verified: false, // New field
                verification_token: verificationToken // New field
            });

        if (userError) {
            // Rollback academy creation (manual compensation since no transactions in REST)
            await supabase.from('academies').delete().eq('id', academyId);
            console.error('[VERCEL] User creation error:', userError);
            throw new Error('Failed to create admin user');
        }

        console.log('[VERCEL] Academy and admin created successfully:', academyId);

        // 7. Send Verification Email
        // Only attempt if mail credentials are present
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            try {
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: parseInt(process.env.SMTP_PORT || '587'),
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    },
                });

                // Determine base URL (handle localhost vs production)
                const baseUrl = process.env.VITE_APP_URL || 'http://localhost:5173'; 
                // Wait, frontend usually runs on 5173 in dev. 
                // But the verification link should point to the frontend page that calls the verification API.
                // Or point directly to the API? Better to point to a frontend page for better UX.
                const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;

                await transporter.sendMail({
                    from: `"GFARP Support" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                    to: body.email,
                    subject: 'Verify your GFARP Academy Account',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #005391;">Welcome to GFARP!</h2>
                            <p>Thank you for registering your academy. Please verify your email address to activate your account and access the dashboard.</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${verificationLink}" style="background-color: #005391; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
                            </div>
                            <p style="color: #666; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
                        </div>
                    `
                });
                console.log('[VERCEL] Verification email sent to:', body.email);
            } catch (emailError) {
                console.error('[VERCEL] Failed to send verification email:', emailError);
                // Don't fail the registration, just log it. User might need to resend.
            }
        } else {
             console.warn('[VERCEL] SMTP configuration missing, skipping email verification send.');
             // For dev/testing without SMTP, you might want to return the token in the response
             // or log it clearly.
             console.log('[DEV] Verification Token:', verificationToken);
        }

        // 8. Return Success
        return res.status(200).json({
            success: true,
            message: 'Academy registered successfully. Please check your email to verify your account.',
            data: {
                academy: {
                    id: academyId,
                    name: academyName,
                    email: body.email,
                    role: 'academy_admin'
                },
                // token: `mock_jwt_${userId}` // Do NOT return auth token yet, force verification
                requireVerification: true
            }
        });

    } catch (error: any) {
        console.error('[VERCEL] Registration error:', error);
        return res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
}

