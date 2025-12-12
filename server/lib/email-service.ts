import nodemailer from 'nodemailer';
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
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure email transporter based on environment variables
    const config: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    };

    this.transporter = nodemailer.createTransport(config);
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"SOFWAN Platform" <${process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
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

    return this.sendEmail({
      to: academyEmail,
      subject,
      html
    });
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

    return this.sendEmail({
      to: academyEmail,
      subject,
      html
    });
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

    return this.sendEmail({
      to: adminEmail,
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
          <h1 style="color: white; margin: 0; font-size: 28px;">SOFWAN Platform</h1>
          <p style="color: #f0f0f0; margin: 10px 0 0 0;">Academy Management System</p>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 48px; margin-bottom: 10px;">${statusIcon}</div>
            <h2 style="color: ${statusColor}; margin: 0; font-size: 24px;">Academy ${isActivated ? 'Activated' : 'Deactivated'}</h2>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 20px;">Dear ${academyName} Team,</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Your academy has been <strong style="color: ${statusColor};">${status}</strong> on the SOFWAN Platform.
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
            <a href="mailto:support@sofwan.com" style="color: #667eea;">support@sofwan.com</a>
          </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
          <p style="margin: 0; font-size: 12px; color: #666;">
            © ${new Date().getFullYear()} SOFWAN Platform. All rights reserved.<br>
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
          <h1 style="color: white; margin: 0; font-size: 28px;">SOFWAN Platform</h1>
          <p style="color: #f0f0f0; margin: 10px 0 0 0;">Academy Management System</p>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 48px; margin-bottom: 10px;">${statusIcon}</div>
            <h2 style="color: ${statusColor}; margin: 0; font-size: 24px;">Academy ${isVerified ? 'Verified' : 'Verification Pending'}</h2>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 20px;">Dear ${academyName} Team,</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Your academy verification status has been updated to <strong style="color: ${statusColor};">${status}</strong> on the SOFWAN Platform.
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
            <a href="mailto:support@sofwan.com" style="color: #667eea;">support@sofwan.com</a>
          </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
          <p style="margin: 0; font-size: 12px; color: #666;">
            © ${new Date().getFullYear()} SOFWAN Platform. All rights reserved.<br>
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
          <h1 style="color: white; margin: 0; font-size: 28px;">SOFWAN Platform</h1>
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
            © ${new Date().getFullYear()} SOFWAN Platform. All rights reserved.<br>
            This is an automated admin notification.
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