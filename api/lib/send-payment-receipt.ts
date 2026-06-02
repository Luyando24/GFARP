import nodemailer from 'nodemailer';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSmtpConfig } from './smtp-config.js';

function buildReceiptHtml(
  recipientName: string,
  amount: number,
  currency: string,
  planName: string,
  paymentReference: string,
  date: Date
): string {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);

  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Soccer Circular</h1>
        <p style="color: #f0f0f0; margin: 10px 0 0 0;">Payment Receipt</p>
      </div>
      <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
        <h2 style="color: #10b981;">Payment Successful</h2>
        <p>Dear ${recipientName},</p>
        <p>Thank you for your payment for the <strong>${planName}</strong> plan.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Plan:</strong> ${planName}</p>
          <p><strong>Amount:</strong> ${formattedAmount}</p>
          <p><strong>Reference:</strong> ${paymentReference}</p>
          <p><strong>Date:</strong> ${date.toLocaleString()}</p>
        </div>
        <p style="font-size: 14px; color: #666;">Your subscription benefits are now active on your account.</p>
      </div>
    </body>
    </html>
  `;
}

async function sendViaSmtp(
  supabase: SupabaseClient,
  toEmail: string,
  recipientName: string,
  amount: number,
  currency: string,
  planName: string,
  paymentReference: string
): Promise<boolean> {
  try {
    const smtpConfig = await getSmtpConfig(supabase, '[PaymentReceipt]');

    if (!smtpConfig.isValid || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      console.warn('[PaymentReceipt] SMTP configuration invalid or missing, skipping receipt email');
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
    });

    const date = new Date();
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);

    await transporter.sendMail({
      from: `"Soccer Circular" <${smtpConfig.from}>`,
      to: toEmail,
      subject: `Payment Confirmed - ${planName}`,
      text: `Dear ${recipientName},\n\nYour payment of ${formattedAmount} for ${planName} was successful.\nReference: ${paymentReference}\nDate: ${date.toLocaleString()}`,
      html: buildReceiptHtml(recipientName, amount, currency, planName, paymentReference, date),
    });

    return true;
  } catch (error: any) {
    console.error('[PaymentReceipt] Failed to send receipt email:', error);
    return false;
  }
}

export async function sendAcademyPaymentReceipt(
  supabase: SupabaseClient,
  paymentId: string,
  academyEmail: string,
  academyName: string,
  planName: string,
  amount: number,
  currency: string,
  paymentReference: string
): Promise<boolean> {
  try {
    // Check if receipt has already been sent
    const { data: existingPayment } = await supabase
      .from('subscription_payments')
      .select('id, receipt_email_sent_at')
      .eq('id', paymentId)
      .maybeSingle();

    if (existingPayment && existingPayment.receipt_email_sent_at) {
      console.log('[PaymentReceipt] Receipt already sent for this payment');
      return false;
    }

    // Attempt to send the email first
    const emailSent = await sendViaSmtp(supabase, academyEmail, academyName, amount, currency, planName, paymentReference);

    if (!emailSent) {
      console.warn('[PaymentReceipt] Failed to send receipt email, not marking as sent');
      return false;
    }

    // Only mark as sent after successful email delivery
    const { error: updateError } = await supabase
      .from('subscription_payments')
      .update({ receipt_email_sent_at: new Date().toISOString() })
      .eq('id', paymentId);

    if (updateError) {
      // If the column doesn't exist, log but don't fail (email was sent successfully)
      if (updateError.code === '42703') {
        console.log('[PaymentReceipt] receipt_email_sent_at column does not exist, but email was sent successfully');
        return true;
      }
      console.error('[PaymentReceipt] Failed to mark receipt as sent:', updateError);
      // Email was sent successfully, so return true even if the update failed
      return true;
    }

    console.log('[PaymentReceipt] Receipt sent and marked successfully');
    return true;
  } catch (error: any) {
    console.error('[PaymentReceipt] Unexpected error in sendAcademyPaymentReceipt:', error);
    return false;
  }
}
