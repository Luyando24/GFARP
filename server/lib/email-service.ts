import nodemailer from 'nodemailer';
import { query } from './db.js';
import { decryptPassword } from './encryption.js';
import dotenv from 'dotenv';

dotenv.config();

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from?: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Get SMTP configuration from database, falling back to environment variables
 */
async function getSmtpConfig(): Promise<EmailConfig> {
  try {
    // Try to get settings from database
    const smtpHost = await query('SELECT value FROM system_settings WHERE key = $1', ['email.smtpHost']);
    const smtpPort = await query('SELECT value FROM system_settings WHERE key = $1', ['email.smtpPort']);
    const smtpSecure = await query('SELECT value FROM system_settings WHERE key = $1', ['email.smtpSecure']);
    const smtpUser = await query('SELECT value FROM system_settings WHERE key = $1', ['email.smtpUser']);
    const smtpPass = await query('SELECT value FROM system_settings WHERE key = $1', ['email.smtpPass']);
    const smtpFrom = await query('SELECT value FROM system_settings WHERE key = $1', ['email.smtpFrom']);

    // Check if we have database settings configured
    if (smtpHost.rows.length > 0 && smtpHost.rows[0].value) {
      const host = smtpHost.rows[0].value;
      const port = smtpPort.rows.length > 0 ? parseInt(smtpPort.rows[0].value) : 587;
      let secure = smtpSecure.rows.length > 0 ? smtpSecure.rows[0].value === 'true' : false;

      // Fix Nodemailer secure flag based on standard port configurations
      // Port 465 is implicit TLS (secure: true)
      // Port 587 and 25 use STARTTLS (secure: false)
      if (port === 587 || port === 25) {
        secure = false;
      } else if (port === 465) {
        secure = true;
      }

      const user = smtpUser.rows.length > 0 ? smtpUser.rows[0].value : '';
      const encryptedPass = smtpPass.rows.length > 0 ? smtpPass.rows[0].value : '';
      const from = smtpFrom.rows.length > 0 ? smtpFrom.rows[0].value : '';

      // Decrypt password
      let pass = '';
      if (encryptedPass) {
        pass = decryptPassword(encryptedPass);
      }

      console.log('[EmailService] Using database SMTP configuration');
      return {
        host,
        port,
        secure,
        auth: {
          user,
          pass
        },
        from: from || user
      };
    }
  } catch (error) {
    console.warn('[EmailService] Failed to load SMTP settings from database, falling back to environment variables:', error);
  }

  // Fall back to environment variables
  console.log('[EmailService] Using environment variable SMTP configuration');
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    },
    from: process.env.SMTP_FROM || process.env.SMTP_USER || ''
  };
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;

  constructor() {
    // Initialize with environment variables first (synchronous)
    const envPort = parseInt(process.env.SMTP_PORT || '587');
    let envSecure = process.env.SMTP_SECURE === 'true';
    if (envPort === 587 || envPort === 25) envSecure = false;
    else if (envPort === 465) envSecure = true;

    this.config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: envPort,
      secure: envSecure,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      },
      from: process.env.SMTP_FROM || process.env.SMTP_USER || ''
    };
    this.transporter = nodemailer.createTransport(this.config);
  }

  /**
   * Initialize SMTP configuration from database
   * Call this after constructing the EmailService instance
   */
  async initializeFromDatabase(): Promise<void> {
    try {
      this.config = await getSmtpConfig();
      this.transporter = nodemailer.createTransport(this.config);
    } catch (error) {
      console.error('[EmailService] Failed to initialize from database:', error);
    }
  }

  /**
   * Reload SMTP configuration from database
   * Call this after updating SMTP settings in the database
   */
  async reloadConfiguration(): Promise<void> {
    console.log('[EmailService] Reloading SMTP configuration...');
    try {
      this.config = await getSmtpConfig();
      this.transporter = nodemailer.createTransport(this.config);
      console.log('[EmailService] SMTP configuration reloaded successfully');
    } catch (error) {
      console.error('[EmailService] Failed to reload configuration:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      const mailOptions = {
        from: `"Soccer Circular" <${this.config.from || this.config.auth.user}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to send email:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error occurred while sending email' 
      };
    }
  }

  async sendAcademyActivationEmail(
    academyEmail: string,
    academyName: string,
    isActivated: boolean,
    adminEmail: string,
    reason?: string
  ): Promise<boolean> {
    const subject = `Academy ${isActivated ? 'Activated' : 'Deactivated'} - ${academyName}`;
    
    const html = this.generateActivationEmailTemplate(
      academyName,
      isActivated,
      adminEmail,
      reason
    );

    const result = await this.sendEmail({
      to: academyEmail,
      subject,
      html
    });
    return result.success;
  }

  async sendAcademyVerificationEmail(
    academyEmail: string,
    academyName: string,
    isVerified: boolean,
    adminEmail: string,
    reason?: string
  ): Promise<boolean> {
    const subject = `Academy ${isVerified ? 'Verified' : 'Unverified'} - ${academyName}`;
    
    const html = this.generateVerificationEmailTemplate(
      academyName,
      isVerified,
      adminEmail,
      reason
    );

    const result = await this.sendEmail({
      to: academyEmail,
      subject,
      html
    });
    return result.success;
  }

  async sendAdminNotificationEmail(
    adminEmail: string,
    academyName: string,
    actionType: string,
    previousStatus: boolean,
    newStatus: boolean,
    reason?: string
  ): Promise<boolean> {
    const subject = `Academy Status Changed - ${academyName}`;
    
    const html = this.generateAdminNotificationTemplate(
      academyName,
      actionType,
      previousStatus,
      newStatus,
      reason
    );

    const result = await this.sendEmail({
      to: adminEmail,
      subject,
      html
    });
    return result.success;
  }

  async sendPlayerRegistrationVerificationEmail(
    playerEmail: string,
    playerName: string,
    verificationLink: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your player account</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #059669 0%, #2563eb 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Soccer Circular</h1>
          <p style="color: #f0f0f0; margin: 10px 0 0 0;">Player Profile</p>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
          <p style="font-size: 16px;">Hi ${playerName},</p>
          <p style="font-size: 16px;">Thanks for registering. Please verify your email address to activate your player account and access your dashboard.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background: linear-gradient(135deg, #059669, #2563eb); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email Address</a>
          </div>
          <p style="font-size: 14px; color: #666;">Or copy this link: <a href="${verificationLink}">${verificationLink}</a></p>
          <p style="font-size: 12px; color: #999;">If you didn't create an account, you can safely ignore this email.</p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: playerEmail,
      subject: 'Verify your Soccer Circular Player Account',
      html,
      text: `Hi ${playerName},\n\nPlease verify your email by visiting:\n${verificationLink}\n\nIf you didn't create an account, ignore this email.`,
    });
  }

  async sendPaymentConfirmationEmail(
    toEmail: string,
    recipientName: string,
    amount: number,
    currency: string,
    planName: string,
    paymentReference: string,
    date: Date,
    stripeInvoiceId?: string
  ): Promise<boolean> {
    const subject = `Payment Confirmed - ${planName} Plan`;
    
    const html = this.generatePaymentConfirmationTemplate(
      recipientName,
      amount,
      currency,
      planName,
      paymentReference,
      date,
      stripeInvoiceId
    );

    return this.sendEmail({
      to: toEmail,
      subject,
      html
    });
  }

  private generateActivationEmailTemplate(
    academyName: string,
    isActivated: boolean,
    adminEmail: string,
    reason?: string
  ): string {
    const status = isActivated ? 'activated' : 'deactivated';
    const statusColor = isActivated ? '#10b981' : '#ef4444';
    const statusIcon = isActivated ? '✅' : '❌';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Academy Status Update</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Soccer Circular</h1>
          <p style="color: #f0f0f0; margin: 10px 0 0 0;">Academy Management System</p>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 48px; margin-bottom: 10px;">${statusIcon}</div>
            <h2 style="color: ${statusColor}; margin: 0; font-size: 24px;">Academy ${isActivated ? 'Activated' : 'Deactivated'}</h2>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 20px;">Dear ${academyName} Team,</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Your academy has been <strong style="color: ${statusColor};">${status}</strong> on Soccer Circular.
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #495057;">Details:</h3>
            <p style="margin: 5px 0;"><strong>Academy:</strong> ${academyName}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: ${statusColor};">${isActivated ? 'Active' : 'Inactive'}</span></p>
            <p style="margin: 5px 0;"><strong>Updated by:</strong> ${adminEmail}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            ${reason ? `<p style="margin: 5px 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
          </div>
          
          ${isActivated ? `
            <div style="background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0;">✅ What this means:</h4>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Your academy is now active on the platform</li>
                <li>You can access all academy management features</li>
                <li>Students and staff can use the system</li>
                <li>All services are available</li>
              </ul>
            </div>
          ` : `
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0;">⚠️ What this means:</h4>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Your academy access has been temporarily suspended</li>
                <li>Some features may be limited or unavailable</li>
                <li>Please contact support for assistance</li>
                <li>This action can be reversed by administrators</li>
              </ul>
            </div>
          `}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL || 'https://soccercircular.com'}" 
               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Access Platform
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            If you have any questions or concerns, please contact our support team at 
            <a href="mailto:support@soccercircular.com" style="color: #667eea;">support@soccercircular.com</a>
          </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
          <p style="margin: 0; font-size: 12px; color: #666;">
            © ${new Date().getFullYear()} Soccer Circular. All rights reserved.<br>
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  private generateVerificationEmailTemplate(
    academyName: string,
    isVerified: boolean,
    adminEmail: string,
    reason?: string
  ): string {
    const status = isVerified ? 'verified' : 'unverified';
    const statusColor = isVerified ? '#10b981' : '#f59e0b';
    const statusIcon = isVerified ? '🏆' : '⏳';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Academy Verification Update</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Soccer Circular</h1>
          <p style="color: #f0f0f0; margin: 10px 0 0 0;">Academy Management System</p>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 48px; margin-bottom: 10px;">${statusIcon}</div>
            <h2 style="color: ${statusColor}; margin: 0; font-size: 24px;">Academy ${isVerified ? 'Verified' : 'Verification Pending'}</h2>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 20px;">Dear ${academyName} Team,</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Your academy verification status has been updated to <strong style="color: ${statusColor};">${status}</strong> on Soccer Circular.
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #495057;">Details:</h3>
            <p style="margin: 5px 0;"><strong>Academy:</strong> ${academyName}</p>
            <p style="margin: 5px 0;"><strong>Verification Status:</strong> <span style="color: ${statusColor};">${isVerified ? 'Verified' : 'Pending'}</span></p>
            <p style="margin: 5px 0;"><strong>Updated by:</strong> ${adminEmail}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            ${reason ? `<p style="margin: 5px 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
          </div>
          
          ${isVerified ? `
            <div style="background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0;">🏆 Congratulations!</h4>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Your academy is now officially verified</li>
                <li>You have access to premium features</li>
                <li>Enhanced credibility and trust</li>
                <li>Priority support and assistance</li>
              </ul>
            </div>
          ` : `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0;">⏳ Verification Status:</h4>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Your academy verification is currently pending</li>
                <li>Some premium features may be limited</li>
                <li>Please ensure all required documents are submitted</li>
                <li>Contact support if you need assistance</li>
              </ul>
            </div>
          `}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL || 'https://soccercircular.com'}" 
               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Access Platform
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            If you have any questions or concerns, please contact our support team at 
            <a href="mailto:support@soccercircular.com" style="color: #667eea;">support@soccercircular.com</a>
          </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
          <p style="margin: 0; font-size: 12px; color: #666;">
            © ${new Date().getFullYear()} Soccer Circular. All rights reserved.<br>
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  private generateAdminNotificationTemplate(
    academyName: string,
    actionType: string,
    previousStatus: boolean,
    newStatus: boolean,
    reason?: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Academy Status Change Notification</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Soccer Circular</h1>
          <p style="color: #f0f0f0; margin: 10px 0 0 0;">Admin Notification</p>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
          <h2 style="color: #495057; margin: 0 0 20px 0;">Academy Status Change</h2>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            The following academy status change has been processed:
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #495057;">Change Details:</h3>
            <p style="margin: 5px 0;"><strong>Academy:</strong> ${academyName}</p>
            <p style="margin: 5px 0;"><strong>Action Type:</strong> ${actionType}</p>
            <p style="margin: 5px 0;"><strong>Previous Status:</strong> ${previousStatus ? 'Active/Verified' : 'Inactive/Unverified'}</p>
            <p style="margin: 5px 0;"><strong>New Status:</strong> ${newStatus ? 'Active/Verified' : 'Inactive/Unverified'}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            ${reason ? `<p style="margin: 5px 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL || 'https://soccercircular.com'}/admin/academies" 
               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              View Academy Management
            </a>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
          <p style="margin: 0; font-size: 12px; color: #666;">
            © ${new Date().getFullYear()} Soccer Circular. All rights reserved.<br>
            This is an automated admin notification.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  private generatePaymentConfirmationTemplate(
    recipientName: string,
    amount: number,
    currency: string,
    planName: string,
    paymentReference: string,
    date: Date,
    stripeInvoiceId?: string
  ): string {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Soccer Circular</h1>
          <p style="color: #f0f0f0; margin: 10px 0 0 0;">Payment Receipt</p>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 48px; margin-bottom: 10px;">💳</div>
            <h2 style="color: #10b981; margin: 0; font-size: 24px;">Payment Successful</h2>
            <p style="color: #666; margin: 5px 0 0 0;">Thank you for your payment!</p>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 20px;">Dear ${recipientName},</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            This email confirms that we have successfully received your payment for the <strong>${planName} Plan</strong>.
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #495057;">Payment Details:</h3>
            <p style="margin: 5px 0;"><strong>Plan:</strong> ${planName}</p>
            <p style="margin: 5px 0;"><strong>Amount Paid:</strong> ${formattedAmount}</p>
            <p style="margin: 5px 0;"><strong>Payment Method:</strong> Online</p>
            <p style="margin: 5px 0;"><strong>Payment Reference:</strong> ${paymentReference}</p>
            ${stripeInvoiceId ? `<p style="margin: 5px 0;"><strong>Invoice ID:</strong> ${stripeInvoiceId}</p>` : ''}
            <p style="margin: 5px 0;"><strong>Date:</strong> ${date.toLocaleString()}</p>
          </div>
          
          <div style="background: #e8f5e9; border: 1px solid #c8e6c9; color: #2e7d32; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0;">✅ Access Active:</h4>
            <p style="margin: 0;">Your plan's benefits are immediately active on your account. You can log in at any time to manage players, view reports, or adjust settings.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL || 'https://soccercircular.com'}" 
               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Access Dashboard
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            If you have any questions about this invoice or your subscription, please contact our support team at 
            <a href="mailto:support@soccercircular.com" style="color: #667eea;">support@soccercircular.com</a>
          </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
          <p style="margin: 0; font-size: 12px; color: #666;">
            © ${new Date().getFullYear()} Soccer Circular. All rights reserved.<br>
            This is an automated receipt. Please do not reply to this email.
          </p>
        </div>
      </body>
      </html>
    `;
  }


  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email service connection verified successfully');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
export default EmailService;