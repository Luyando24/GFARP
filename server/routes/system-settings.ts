import { Router, type Request as ExpressRequest, type Response as ExpressResponse } from 'express';
import { query } from '../lib/db';

const router: Router = Router();

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
}

// Default system settings
const defaultSettings: SystemSettingsData = {
  general: {
    siteName: "FIFA Platform Zambia",
    siteDescription: "Official FIFA Football Academy Management Platform",
    timezone: "Africa/Lusaka",
    language: "English",
    dateFormat: "DD/MM/YYYY",
    currency: "ZMW",
    maintenanceMode: false,
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
          (structured[category as keyof SystemSettingsData] as any)[field] = parsedValue;
        } catch {
          // If not JSON, use as string
          (structured[category as keyof SystemSettingsData] as any)[field] = value;
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
      flattened[flatKey] = typeof value === 'object' ? JSON.stringify(value) : String(value);
    });
  });

  return flattened;
}

// GET /api/system-settings - Get all system settings
export async function handleGetSystemSettings(req: ExpressRequest, res: ExpressResponse) {
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
export async function handleUpdateSystemSettings(req: ExpressRequest, res: ExpressResponse) {
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
export async function handleGetSystemSettingsByCategory(req: ExpressRequest, res: ExpressResponse) {
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
        categorySettings[key] = JSON.parse(setting.value);
      } catch {
        categorySettings[key] = setting.value;
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
export async function handleUpdateSystemSettingsByCategory(req: ExpressRequest, res: ExpressResponse) {
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
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
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
export async function handleResetSystemSettings(req: ExpressRequest, res: ExpressResponse) {
  try {
    await query('DELETE FROM system_settings');

    const flatSettings = flattenSettings(defaultSettings);

    for (const [key, value] of Object.entries(flatSettings)) {
      await setSettingValue(key, value);
    }

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
export async function handleExportSystemSettings(req: ExpressRequest, res: ExpressResponse) {
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
export async function handleRestoreSystemSettings(req: ExpressRequest, res: ExpressResponse) {
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

// Route definitions
router.get('/', handleGetSystemSettings);
router.put('/', handleUpdateSystemSettings);
router.get('/category/:category', handleGetSystemSettingsByCategory);
router.put('/category/:category', handleUpdateSystemSettingsByCategory);
router.post('/reset', handleResetSystemSettings);
router.get('/export', handleExportSystemSettings);
router.post('/import', handleRestoreSystemSettings);

export default router;
