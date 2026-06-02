import { Router, RequestHandler } from 'express';
import { query } from '../lib/db.js';
import { encryptPassword, decryptPassword } from '../lib/encryption.js';
import { emailService } from '../lib/email-service.js';

const router = Router();

// System Settings interfaces
interface SystemSettingsData {
  general: {
    siteName: string;
    siteDescription: string;
    timezone: string;
    language: string;
    dateFormat: string;
    currency: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
    maintenanceEndTime: string;
    registrationEnabled: boolean;
  };
  security: {
    twoFactorAuth: boolean;
    passwordExpiry: number;
    sessionTimeout: number;
    maxLoginAttempts: number;
    ipWhitelist: string[];
    sslEnabled: boolean;
    encryptionLevel: string;
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    adminAlerts: boolean;
    systemAlerts: boolean;
    maintenanceAlerts: boolean;
    emailProvider: string;
    smsProvider: string;
  };
  backup: {
    autoBackup: boolean;
    backupFrequency: string;
    backupRetention: number;
    lastBackup: string;
    backupLocation: string;
    backupSize: string;
  };
  performance: {
    cacheEnabled: boolean;
    compressionEnabled: boolean;
    cdnEnabled: boolean;
    maxFileSize: string;
    sessionStorage: string;
    databaseOptimization: boolean;
  };
  integrations: {
    fifaApi: boolean;
    paymentGateway: string;
    smsGateway: string;
    emailService: string;
    cloudStorage: string;
    analyticsService: string;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string;
    smtpPass: string;
    smtpFrom: string;
    testEmail: string;
  };
}

// Default system settings
const defaultSettings: SystemSettingsData = {
  general: {
    siteName: "Soccer Circular",
    siteDescription: "Official Soccer Circular Academy Management Platform",
    timezone: "America/New_York",
    language: "English",
    dateFormat: "MM/DD/YYYY",
    currency: "USD",
    maintenanceMode: false,
    maintenanceMessage: "Soccer Circular is currently undergoing scheduled maintenance. We'll be back shortly!",
    maintenanceEndTime: "",
    registrationEnabled: true
  },
  security: {
    twoFactorAuth: true,
    passwordExpiry: 90,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    ipWhitelist: ["192.168.1.0/24", "10.0.0.0/8"],
    sslEnabled: true,
    encryptionLevel: "AES-256"
  },
  notifications: {
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    adminAlerts: true,
    systemAlerts: true,
    maintenanceAlerts: true,
    emailProvider: "SendGrid",
    smsProvider: "Twilio"
  },
  backup: {
    autoBackup: true,
    backupFrequency: "daily",
    backupRetention: 30,
    lastBackup: "2024-01-20 02:00:00",
    backupLocation: "AWS S3",
    backupSize: "2.4 GB"
  },
  performance: {
    cacheEnabled: true,
    compressionEnabled: true,
    cdnEnabled: true,
    maxFileSize: "10 MB",
    sessionStorage: "Redis",
    databaseOptimization: true
  },
  integrations: {
    fifaApi: true,
    paymentGateway: "Stripe",
    smsGateway: "Twilio",
    emailService: "SendGrid",
    cloudStorage: "AWS S3",
    analyticsService: "Google Analytics"
  },
  email: {
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: "",
    smtpPass: "",
    smtpFrom: "",
    testEmail: ""
  }
};

// Helper function to get setting value by key
async function getSettingValue(key: string): Promise<string | null> {
  try {
    const result = await query('SELECT value FROM system_settings WHERE key = $1', [key]);
    return result.rows.length > 0 ? result.rows[0].value : null;
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return null;
  }
}

// Helper function to set setting value by key
async function setSettingValue(key: string, value: string): Promise<void> {
  try {
    await query(
      'INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [key, value]
    );
  } catch (error) {
    console.error(`Error setting ${key}:`, error);
    throw error;
  }
}

// Helper function to convert flat settings to structured format
function structureSettings(settings: Record<string, string>): SystemSettingsData {
  const structured = JSON.parse(JSON.stringify(defaultSettings)); // Deep clone

  // Map flat keys to structured object
  Object.entries(settings).forEach(([key, value]) => {
    const parts = key.split('.');
    if (parts.length === 2) {
      const [category, field] = parts;
      if (structured[category as keyof SystemSettingsData] &&
        typeof structured[category as keyof SystemSettingsData] === 'object') {
        try {
          // Try to parse as JSON for complex types
          const parsedValue = JSON.parse(value);
          
          // Decrypt SMTP password if this is the email.smtpPass field
          if (category === 'email' && field === 'smtpPass' && typeof parsedValue === 'string') {
            (structured[category as keyof SystemSettingsData] as any)[field] = decryptPassword(parsedValue);
          } else {
            (structured[category as keyof SystemSettingsData] as any)[field] = parsedValue;
          }
        } catch {
          // If not JSON, use as string
          let stringValue = value;
          
          // Decrypt SMTP password if this is the email.smtpPass field
          if (category === 'email' && field === 'smtpPass') {
            stringValue = decryptPassword(value);
          }
          
          (structured[category as keyof SystemSettingsData] as any)[field] = stringValue;
        }
      }
    }
  });

  return structured;
}

// Helper function to flatten structured settings
function flattenSettings(settings: SystemSettingsData): Record<string, string> {
  const flattened: Record<string, string> = {};

  Object.entries(settings).forEach(([category, categorySettings]) => {
    Object.entries(categorySettings).forEach(([key, value]) => {
      const flatKey = `${category}.${key}`;
      
      // Encrypt SMTP password before saving
      if (category === 'email' && key === 'smtpPass' && value) {
        flattened[flatKey] = encryptPassword(String(value));
      } else {
        flattened[flatKey] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
    });
  });

  return flattened;
}

// GET /api/system-settings - Get all system settings
export const handleGetSystemSettings: RequestHandler = async (req, res) => {
  try {
    const result = await query('SELECT key, value FROM system_settings');
    const settings = result.rows;

    if (settings.length === 0) {
      // Initialize with default settings if none exist
      const flatSettings = flattenSettings(defaultSettings);

      for (const [key, value] of Object.entries(flatSettings)) {
        await setSettingValue(key, value);
      }

      return res.json(defaultSettings);
    }

    // Convert flat settings to structured format
    const settingsMap: Record<string, string> = {};
    settings.forEach(setting => {
      settingsMap[setting.key] = setting.value;
    });

    const structuredSettings = structureSettings(settingsMap);
    res.json(structuredSettings);
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
}

// PUT /api/system-settings - Update system settings
export const handleUpdateSystemSettings: RequestHandler = async (req, res) => {
  try {
    const settingsData: SystemSettingsData = req.body;

    if (!settingsData || typeof settingsData !== 'object') {
      return res.status(400).json({ error: 'Invalid settings data' });
    }

    const flatSettings = flattenSettings(settingsData);

    const updatePromises = Object.entries(flatSettings).map(([key, value]) =>
      setSettingValue(key, value)
    );

    await Promise.all(updatePromises);

    // Reload email service configuration to apply new settings
    await emailService.reloadConfiguration();

    res.json({
      success: true,
      message: 'System settings updated successfully',
      settings: settingsData
    });
  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({ error: 'Failed to update system settings' });
  }
}

// GET /api/system-settings/:category - Get settings for a specific category
export const handleGetSystemSettingsByCategory: RequestHandler = async (req, res) => {
  try {
    const { category } = req.params;

    if (!category || !defaultSettings[category as keyof SystemSettingsData]) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const result = await query(
      'SELECT key, value FROM system_settings WHERE key LIKE $1',
      [`${category}.%`]
    );
    const settings = result.rows;

    const categorySettings: Record<string, any> = {};
    settings.forEach(setting => {
      const key = setting.key.replace(`${category}.`, '');
      try {
        const parsedValue = JSON.parse(setting.value);
        
        // Decrypt SMTP password if this is the email category and smtpPass field
        if (category === 'email' && key === 'smtpPass' && typeof parsedValue === 'string') {
          categorySettings[key] = decryptPassword(parsedValue);
        } else {
          categorySettings[key] = parsedValue;
        }
      } catch {
        let stringValue = setting.value;
        
        // Decrypt SMTP password if this is the email category and smtpPass field
        if (category === 'email' && key === 'smtpPass') {
          stringValue = decryptPassword(setting.value);
        }
        
        categorySettings[key] = stringValue;
      }
    });

    const defaultCategorySettings = defaultSettings[category as keyof SystemSettingsData];
    const mergedSettings = { ...defaultCategorySettings, ...categorySettings };

    res.json(mergedSettings);
  } catch (error) {
    console.error('Error fetching category settings:', error);
    res.status(500).json({ error: 'Failed to fetch category settings' });
  }
}

// PUT /api/system-settings/:category - Update settings for a specific category
export const handleUpdateSystemSettingsByCategory: RequestHandler = async (req, res) => {
  try {
    const { category } = req.params;
    const categoryData = req.body;

    if (!category || !defaultSettings[category as keyof SystemSettingsData]) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    if (!categoryData || typeof categoryData !== 'object') {
      return res.status(400).json({ error: 'Invalid category data' });
    }

    // Update each setting in the category
    const updatePromises = Object.entries(categoryData).map(([key, value]) => {
      const flatKey = `${category}.${key}`;
      
      // Encrypt SMTP password before saving
      let stringValue: string;
      if (category === 'email' && key === 'smtpPass' && value) {
        stringValue = encryptPassword(String(value));
      } else {
        stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
      
      return setSettingValue(flatKey, stringValue);
    });

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: `${category} settings updated successfully`,
      settings: categoryData
    });
  } catch (error) {
    console.error('Error updating category settings:', error);
    res.status(500).json({ error: 'Failed to update category settings' });
  }
}

// DELETE /api/system-settings/reset - Reset all settings to defaults
export const handleResetSystemSettings: RequestHandler = async (req, res) => {
  try {
    await query('DELETE FROM system_settings');

    const flatSettings = flattenSettings(defaultSettings);

    for (const [key, value] of Object.entries(flatSettings)) {
      await setSettingValue(key, value);
    }

    // Reload email service configuration after reset
    await emailService.reloadConfiguration();

    res.json({
      success: true,
      message: 'System settings reset to defaults',
      settings: defaultSettings
    });
  } catch (error) {
    console.error('Error resetting system settings:', error);
    res.status(500).json({ error: 'Failed to reset system settings' });
  }
}

// GET /api/system-settings/backup - Export settings as backup
export const handleExportSystemSettings: RequestHandler = async (req, res) => {
  try {
    const result = await query('SELECT key, value FROM system_settings');
    const settings = result.rows;

    const backup = {
      exportDate: new Date().toISOString(),
      version: "1.0",
      settings: settings.map(setting => ({
        key: setting.key,
        value: setting.value
      }))
    };

    res.set('Content-Type', 'application/json');
    res.set('Content-Disposition', `attachment; filename="system-settings-backup-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(backup);
  } catch (error) {
    console.error('Error exporting system settings:', error);
    res.status(500).json({ error: 'Failed to export system settings' });
  }
}

// POST /api/system-settings/restore - Restore settings from backup
export const handleRestoreSystemSettings: RequestHandler = async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({ error: 'Invalid backup data' });
    }

    await query('DELETE FROM system_settings');

    const restorePromises = settings.map((setting: any) =>
      setSettingValue(setting.key, setting.value)
    );

    await Promise.all(restorePromises);

    // Reload email service configuration after restore
    await emailService.reloadConfiguration();

    res.json({
      success: true,
      message: 'System settings restored successfully',
      restoredCount: settings.length
    });
  } catch (error) {
    console.error('Error restoring system settings:', error);
    res.status(500).json({ error: 'Failed to restore system settings' });
  }
}

// POST /api/system-settings/email/test - Test email configuration
export const handleTestEmail: RequestHandler = async (req, res) => {
  try {
    const { toEmail } = req.body;

    console.log('[TestEmail] Request received for:', toEmail);

    if (!toEmail) {
      return res.status(400).json({ error: 'Test email address is required' });
    }

    // Reload email service configuration to use latest database settings
    console.log('[TestEmail] Reloading email service configuration...');
    await emailService.reloadConfiguration();
    console.log('[TestEmail] Configuration reloaded');

    // Send test email
    console.log('[TestEmail] Sending test email...');
    const result = await emailService.sendEmail({
      to: toEmail,
      subject: 'Soccer Circular - SMTP Configuration Test',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SMTP Test</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Soccer Circular</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0;">SMTP Configuration Test</p>
          </div>

          <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
              <h2 style="color: #10b981; margin: 0; font-size: 24px;">SMTP Configuration Successful</h2>
              <p style="color: #666; margin: 5px 0 0 0;">Your email settings are working correctly!</p>
            </div>

            <p style="font-size: 16px; margin-bottom: 20px;">
              This email confirms that your SMTP configuration is working properly. You can now send emails through the Soccer Circular platform.
            </p>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #495057;">Test Details:</h3>
              <p style="margin: 5px 0;"><strong>Test Date:</strong> ${new Date().toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Recipient:</strong> ${toEmail}</p>
            </div>
          </div>

          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
            <p style="margin: 0; font-size: 12px; color: #666;">
              © ${new Date().getFullYear()} Soccer Circular. All rights reserved.<br>
              This is an automated test email.
            </p>
          </div>
        </body>
        </html>
      `
    });

    console.log('[TestEmail] Email send result:', result.success);

    if (result.success) {
      res.json({
        success: true,
        message: 'Test email sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send test email'
      });
    }
  } catch (error) {
    console.error('[TestEmail] Error sending test email:', error);
    console.error('[TestEmail] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({
      success: false,
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Route definitions
router.get('/', handleGetSystemSettings);
router.put('/', handleUpdateSystemSettings);
router.get('/category/:category', handleGetSystemSettingsByCategory);
router.put('/category/:category', handleUpdateSystemSettingsByCategory);
router.post('/reset', handleResetSystemSettings);
router.get('/export', handleExportSystemSettings);
router.post('/import', handleRestoreSystemSettings);
router.post('/email/test', handleTestEmail);

export default router;