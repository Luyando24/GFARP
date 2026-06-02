import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { getSmtpConfig } from '../lib/smtp-config.js';

export const config = {
    maxDuration: 10,
};

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
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
        // Authentication check
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }

        const token = authHeader.substring(7);
        
        // Initialize Supabase anon client for token verification only
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            return res.status(500).json({
                success: false,
                message: 'Server configuration error'
            });
        }

        // Use anon client for token verification
        const anonClient = createClient(supabaseUrl, supabaseAnonKey);

        // Verify token and get user
        const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
        
        if (authError || !user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid or expired token' 
            });
        }

        // Initialize service-role client for admin operations
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseServiceKey) {
            return res.status(500).json({
                success: false,
                message: 'Server configuration error'
            });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Authorization check - only admins and superadmins can update compliance documents
        const { data: userData, error: userError } = await supabase
            .from('staff_users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            return res.status(403).json({ 
                success: false, 
                message: 'User not found or unauthorized' 
            });
        }

        if (userData.role !== 'admin' && userData.role !== 'superadmin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Insufficient permissions. Admin or superadmin role required.' 
            });
        }

        const { documentId, status, rejectionReason } = req.body;

        if (!documentId || !status) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: documentId, status'
            });
        }

        // Validate status
        const validStatuses = ['pending', 'verified', 'rejected', 'expired'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be one of: pending, verified, rejected, expired'
            });
        }

        // Fetch document details along with academy info for email
        const { data: docInfo, error: fetchError } = await supabase
            .from('fifa_compliance_documents')
            .select(`
                *,
                fifa_compliance (
                    academies (
                        name,
                        email
                    )
                )
            `)
            .eq('id', documentId)
            .single();

        if (fetchError || !docInfo) {
            console.error('[VERCEL] Error fetching document info:', fetchError);
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        // Prepare update data
        const updateData: any = { status };
        if (status === 'rejected' && rejectionReason) {
            updateData.rejection_reason = rejectionReason;
        }

        // Update document status
        const { data, error } = await supabase
            .from('fifa_compliance_documents')
            .update(updateData)
            .eq('id', documentId)
            .select()
            .single();

        if (error) {
            console.error('[VERCEL] Error updating document status:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update document status',
                error: error.message
            });
        }

        // Send Email Notification
        try {
            const smtpConfig = await getSmtpConfig(supabase, '[VERCEL] Compliance Document');

            if (smtpConfig.isValid && smtpConfig.host && smtpConfig.user && smtpConfig.pass) {
                const transporter = nodemailer.createTransport({
                    host: smtpConfig.host,
                    port: smtpConfig.port,
                    secure: smtpConfig.secure,
                    auth: {
                        user: smtpConfig.user,
                        pass: smtpConfig.pass,
                    },
                });

                const academyName = docInfo.fifa_compliance?.academies?.name || 'Academy';
                const academyEmail = docInfo.fifa_compliance?.academies?.email;
                const documentName = docInfo.document_name;

                if (academyEmail) {
                    let subject = '';
                    let htmlContent = '';

                    if (status === 'verified') {
                        subject = 'Compliance Document Approved - Soccer Circular';
                        htmlContent = `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #10b981;">Document Approved</h2>
                                <p>Hello ${academyName},</p>
                                <p>Your document <strong>${documentName}</strong> has been reviewed and <strong>approved</strong>.</p>
                                <p>Thank you for ensuring compliance.</p>
                            </div>
                        `;
                    } else if (status === 'rejected') {
                        subject = 'Compliance Document Rejected - Soccer Circular';
                        htmlContent = `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #ef4444;">Document Rejected</h2>
                                <p>Hello ${academyName},</p>
                                <p>Your document <strong>${documentName}</strong> has been reviewed and <strong>rejected</strong>.</p>
                                ${rejectionReason ? `<p><strong>Reason for rejection:</strong> ${rejectionReason}</p>` : ''}
                                <p>Please review the requirements and upload a corrected version.</p>
                            </div>
                        `;
                    }

                    if (subject && htmlContent) {
                        await transporter.sendMail({
                            from: `"Soccer Circular Compliance" <${smtpConfig.from}>`,
                            to: academyEmail,
                            subject: subject,
                            html: htmlContent
                        });
                        console.log(`[VERCEL] Notification email sent to ${academyEmail} for status ${status}`);
                    }
                }
            } else {
                console.warn('[VERCEL] SMTP configuration invalid or missing, skipping email notification.');
            }
        } catch (emailError) {
            console.error('[VERCEL] Failed to send notification email:', emailError);
            // Don't fail the request, just log it
        }

        // Create In-App Notification
        try {
            if (docInfo.academy_id) {
                // 1. Create Notification
                const notificationType = status === 'verified' ? 'success' : 'error';
                const notificationTitle = status === 'verified' ? 'Document Approved' : 'Document Rejected';
                const notificationMessage = status === 'verified' 
                    ? `Your document "${docInfo.document_name || 'Document'}" has been approved.`
                    : `Your document "${docInfo.document_name || 'Document'}" was rejected. Reason: ${rejectionReason || 'Check details'}`;

                const { data: notification, error: notifError } = await supabase
                    .from('notifications')
                    .insert({
                        title: notificationTitle,
                        message: notificationMessage,
                        type: notificationType,
                        category: 'compliance',
                        priority: 'high',
                        action_url: '/dashboard?tab=fifa-compliance' // Deep link to tab
                    })
                    .select()
                    .single();

                if (notifError) {
                     console.error('[VERCEL] Error creating notification record:', notifError);
                } else {
                    // 2. Link to Academy Users
                    // Find all staff users for this academy
                    const { data: staffUsers, error: staffError } = await supabase
                        .from('staff_users')
                        .select('id')
                        .eq('academy_id', docInfo.academy_id);

                    if (staffUsers && staffUsers.length > 0) {
                        const userNotifications = staffUsers.map((user: any) => ({
                            notification_id: notification.id,
                            user_id: user.id
                        }));

                        const { error: userNotifError } = await supabase
                            .from('user_notifications')
                            .insert(userNotifications);

                        if (userNotifError) console.error('[VERCEL] Error linking notification to users:', userNotifError);
                    }
                }
            }
        } catch (notifError) {
             console.error('[VERCEL] Failed to create in-app notification:', notifError);
        }

        return res.json({
            success: true,
            message: `Document status updated to ${status}`,
            data
        });

    } catch (error: any) {
        console.error('[VERCEL] Update document status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update document status',
            error: error.message
        });
    }
}
