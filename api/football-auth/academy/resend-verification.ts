import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('[VERCEL] Resend verification request received');

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
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        // Initialize Supabase client
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('[VERCEL] Missing Supabase environment variables');
            throw new Error('Server configuration error');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Find user
        const { data: user, error: userError } = await supabase
            .from('staff_users')
            .select('*')
            .eq('email', email)
            .single();

        if (userError || !user) {
            // For security, don't reveal if email exists or not, but for this specific flow (post-registration),
            // it's acceptable to return success even if user not found to prevent enumeration,
            // or return specific error if we want to be helpful. 
            // Let's return success but log it.
            console.log('[VERCEL] Resend verification: Email not found:', email);
            return res.status(200).json({ success: true, message: 'If your account exists, a verification email has been sent.' });
        }

        if (user.email_verified) {
             return res.status(400).json({ success: false, message: 'Email is already verified. Please login.' });
        }

        // 2. Generate new token (optional, but good practice to rotate)
        const verificationToken = uuidv4();

        // 3. Update user with new token
        const { error: updateError } = await supabase
            .from('staff_users')
            .update({ verification_token: verificationToken })
            .eq('id', user.id);

        if (updateError) {
            console.error('[VERCEL] Failed to update verification token:', updateError);
            throw new Error('Database error');
        }

        // 4. Send Email
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });

            // Determine base URL
            const baseUrl = process.env.VITE_APP_URL || 'http://localhost:5173'; 
            const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;

            await transporter.sendMail({
                from: `"Soccer Circular Support" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                to: email,
                subject: 'Verify your Soccer Circular Academy Account',
                text: `Welcome to Soccer Circular!\n\nPlease verify your email address by clicking the link below:\n\n${verificationLink}\n\nIf you didn't create an account, you can safely ignore this email.`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #005391;">Verify your email</h2>
                        <p>Please verify your email address to activate your account and access the dashboard.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationLink}" style="background-color: #005391; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
                        </div>
                        <p>Or click this link: <a href="${verificationLink}">${verificationLink}</a></p>
                        <p style="color: #666; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
                    </div>
                `
            });
            console.log('[VERCEL] Verification email resent to:', email);
        } else {
             console.warn('[VERCEL] SMTP configuration missing, skipping email verification send.');
             console.log('[DEV] New Verification Token:', verificationToken);
        }

        return res.status(200).json({
            success: true,
            message: 'Verification email sent successfully'
        });

    } catch (error: any) {
        console.error('[VERCEL] Resend verification error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to send verification email',
            error: error.message
        });
    }
}
