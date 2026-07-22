import { processPlayerFeeRenewalReminders } from '../../server/lib/player-fee-reminders.js';

export const config = {
  schedule: '0 7 * * *',
};

export const handler = async () => {
  try {
    const result = await processPlayerFeeRenewalReminders();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, data: result }),
    };
  } catch (error) {
    console.error('[PlayerFeeReminders] Netlify scheduled run failed:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Failed to process renewal reminders' }),
    };
  }
};
