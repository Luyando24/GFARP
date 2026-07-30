export interface ResendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
}

export interface ResendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendResendEmail(
  options: ResendEmailOptions,
): Promise<ResendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY || '';
  const fromEmail =
    options.fromEmail ||
    process.env.RESEND_FROM_EMAIL ||
    'notifications@soccercircular.com';
  const fromName =
    options.fromName ||
    process.env.RESEND_FROM_NAME ||
    'Soccer Circular';
  const replyTo =
    options.replyTo === undefined
      ? process.env.RESEND_REPLY_TO || 'support@soccercircular.com'
      : options.replyTo;

  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY is not configured' };
  }
  if (!fromEmail) {
    return { success: false, error: 'RESEND_FROM_EMAIL is not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        ...(options.text ? { text: options.text } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    const result = (await response.json()) as {
      id?: string;
      message?: string;
      name?: string;
    };

    if (!response.ok) {
      return {
        success: false,
        error:
          result.message ||
          result.name ||
          `Resend request failed (${response.status})`,
      };
    }

    return { success: true, id: result.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Resend error',
    };
  }
}
