import { SupabaseClient } from '@supabase/supabase-js';

export interface SmtpConfig {
  host: string | null;
  port: number;
  secure: boolean;
  user: string | null;
  pass: string | null;
  from: string | null;
  source: 'database' | 'environment' | 'none';
  isValid: boolean;
  validationErrors: string[];
}

/**
 * Decrypt password using AES-256-GCM
 * This function should match the server-side decryption logic
 * Handles legacy plaintext and malformed values gracefully
 */
function decryptPassword(encrypted: string): string {
  if (!encrypted) return '';
  
  try {
    // Check if the password appears to be encrypted (base64 format)
    try {
      const decoded = Buffer.from(encrypted, 'base64');
      // If it's long enough to be encrypted, try to decrypt
      if (decoded.length >= 96) { // 64 (salt) + 16 (iv) + 16 (tag) = 96 minimum
        // For now, return as-is since we don't have the encryption key in Vercel functions
        // The server-side email-service handles decryption
        console.warn('[SMTP Config] Encrypted password detected but cannot decrypt in Vercel function without encryption key');
        return encrypted;
      }
    } catch {
      // Not base64, treat as plain text (legacy plaintext password)
      console.log('[SMTP Config] Password appears to be plaintext (legacy format)');
      return encrypted;
    }
    
    // If it's base64 but too short to be encrypted, treat as plaintext
    console.log('[SMTP Config] Password is base64 but too short to be encrypted, treating as plaintext');
    return encrypted;
  } catch (error) {
    console.error('[SMTP Config] Error checking password encryption:', error);
    // Return as-is on any error to avoid breaking email functionality
    return encrypted;
  }
}

/**
 * Validate email address format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate SMTP port number
 */
function validatePort(port: any): { valid: boolean; port: number; error?: string } {
  if (port === null || port === undefined) {
    return { valid: false, port: 587, error: 'Port is null or undefined' };
  }
  
  const parsedPort = parseInt(String(port), 10);
  
  if (isNaN(parsedPort)) {
    return { valid: false, port: 587, error: 'Port is not a valid number' };
  }
  
  if (!isFinite(parsedPort)) {
    return { valid: false, port: 587, error: 'Port is not finite' };
  }
  
  if (parsedPort < 1 || parsedPort > 65535) {
    return { valid: false, port: 587, error: 'Port is out of valid range (1-65535)' };
  }
  
  return { valid: true, port: parsedPort };
}

/**
 * Get SMTP configuration from environment variables or database
 * For Vercel functions, prioritize environment variables since they can't decrypt database passwords
 * For server-side code, database settings can be used with proper encryption key
 */
export async function getSmtpConfig(
  supabase: SupabaseClient,
  context: string = 'SMTP',
  preferDatabase: boolean = false
): Promise<SmtpConfig> {
  const validationErrors: string[] = [];
  let source: 'database' | 'environment' | 'none' = 'none';
  
  // Default config from environment variables
  const config: SmtpConfig = {
    host: process.env.SMTP_HOST || null,
    port: 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || null,
    pass: process.env.SMTP_PASS || null,
    from: process.env.SMTP_FROM || null,
    source: 'none',
    isValid: false,
    validationErrors: []
  };

  // If environment variables are configured, use them (Vercel functions can't decrypt database passwords)
  if (config.host && config.user && config.pass && !preferDatabase) {
    source = 'environment';
    console.log(`[${context}] Using SMTP settings from environment variables`);
  } else {
    // Try to get SMTP settings from database (for server-side code with encryption key)
    try {
      const { data: smtpSettings, error: smtpError } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['email.smtpHost', 'email.smtpPort', 'email.smtpSecure', 'email.smtpUser', 'email.smtpPass', 'email.smtpFrom']);

      if (!smtpError && smtpSettings && smtpSettings.length > 0) {
        // Use database settings
        source = 'database';
        smtpSettings.forEach(setting => {
          const key = setting.key.replace('email.', '');
          if (key === 'smtpHost') config.host = setting.value;
          if (key === 'smtpPort') config.port = parseInt(setting.value);
          if (key === 'smtpSecure') config.secure = setting.value === 'true';
          if (key === 'smtpUser') config.user = setting.value;
          if (key === 'smtpPass') config.pass = decryptPassword(setting.value);
          if (key === 'smtpFrom') config.from = setting.value;
        });
        
        console.log(`[${context}] Using SMTP settings from database`);
      } else {
        // Use environment variables as fallback
        source = 'environment';
        console.log(`[${context}] Using SMTP settings from environment variables (fallback)`);
      }
    } catch (error: any) {
      source = 'environment';
      console.warn(`[${context}] Failed to fetch SMTP settings from database:`, error.message);
    }
  }

  config.source = source;

  // Validate port
  const portValidation = validatePort(config.port);
  if (!portValidation.valid) {
    validationErrors.push(portValidation.error || 'Invalid port');
    config.port = portValidation.port; // Use fallback
  } else {
    config.port = portValidation.port;
  }

  // Validate required fields
  if (!config.host) {
    validationErrors.push('SMTP host is required');
  }
  
  if (!config.user) {
    validationErrors.push('SMTP username is required');
  }
  
  if (!config.pass) {
    validationErrors.push('SMTP password is required');
  }

  // Validate from address
  if (!config.from) {
    validationErrors.push('SMTP from address is required');
  } else if (!isValidEmail(config.from)) {
    validationErrors.push('SMTP from address is not a valid email address');
  }

  config.validationErrors = validationErrors;
  config.isValid = validationErrors.length === 0;

  // Log validation results (without secrets)
  console.log(`[${context}] SMTP Config Validation:`, {
    source,
    isValid: config.isValid,
    hasHost: !!config.host,
    hasUser: !!config.user,
    hasPass: !!config.pass,
    hasFrom: !!config.from,
    port: config.port,
    secure: config.secure,
    validationErrors: validationErrors.length > 0 ? validationErrors : undefined
  });

  if (!config.isValid) {
    console.warn(`[${context}] SMTP configuration is invalid:`, validationErrors);
  }

  // Ensure from field has a value (fallback to user if from is invalid but user is valid)
  if (!config.from && config.user && isValidEmail(config.user)) {
    config.from = config.user;
    console.log(`[${context}] Using smtpConfig.user as fallback for from address`);
  }

  return config;
}
