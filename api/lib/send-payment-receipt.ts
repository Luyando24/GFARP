import nodemailer from 'nodemailer';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
  toEmail: string,
  recipientName: string,
  amount: number,
  currency: string,
  planName: string,
  paymentReference: string
): Promise<boolean> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[PaymentReceipt] SMTP not configured, skipping receipt email');
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const date = new Date();
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);

  await transporter.sendMail({
    from: `"Soccer Circular" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `Payment Confirmed - ${planName}`,
    text: `Dear ${recipientName},\n\nYour payment of ${formattedAmount} for ${planName} was successful.\nReference: ${paymentReference}\nDate: ${date.toLocaleString()}`,
    html: buildReceiptHtml(recipientName, amount, currency, planName, paymentReference, date),
  });

  return true;
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
  const { data: claimed, error: claimError } = await supabase
    .from('subscription_payments')
    .update({ receipt_email_sent_at: new Date().toISOString() })
    .eq('id', paymentId)
    .is('receipt_email_sent_at', null)
    .select('id')
    .maybeSingle();

  if (claimError) {
    if (claimError.message?.includes('receipt_email_sent_at')) {
      return sendViaSmtp(academyEmail, academyName, amount, currency, planName, paymentReference);
    }
    console.error('[PaymentReceipt] Claim error:', claimError);
    return false;
  }

  if (!claimed) {
    return false;
  }

  return sendViaSmtp(academyEmail, academyName, amount, currency, planName, paymentReference);
}
