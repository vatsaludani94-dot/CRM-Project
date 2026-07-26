const MarketingCampaign = require('../models/MarketingCampaign');
const { executeCampaignDelivery } = require('../controllers/marketingController');

let isSchedulerRunning = false;

/**
 * Check and process due scheduled marketing campaigns across all tenants
 */
const checkAndExecuteScheduledCampaigns = async () => {
  if (isSchedulerRunning) return;
  isSchedulerRunning = true;

  try {
    const dueCampaigns = await MarketingCampaign.find({
      status: 'Scheduled',
      'schedule.sendType': 'Scheduled',
      'schedule.scheduledAt': { $lte: new Date() },
    });

    for (const campaign of dueCampaigns) {
      console.log(`[MARKETING SCHEDULER] Processing due campaign: "${campaign.name}" (${campaign._id}) for tenant ${campaign.tenant}`);
      try {
        await executeCampaignDelivery(campaign._id, campaign.tenant, campaign.createdBy);
        console.log(`[MARKETING SCHEDULER] Successfully completed campaign: "${campaign.name}"`);
      } catch (err) {
        console.error(`[MARKETING SCHEDULER ERROR] Failed campaign execution "${campaign.name}":`, err.message);
      }
    }
  } catch (err) {
    console.error('[MARKETING SCHEDULER ERROR] Cron loop error:', err.message);
  } finally {
    isSchedulerRunning = false;
  }
};

/**
 * Start background timer for marketing campaign scheduler (runs every 60 seconds)
 */
const startMarketingScheduler = () => {
  console.log('[MARKETING SCHEDULER] Marketing automation scheduler initialized.');
  // Initial check on boot
  setTimeout(checkAndExecuteScheduledCampaigns, 5000);
  // Interval every 60s
  setInterval(checkAndExecuteScheduledCampaigns, 60000);
};

module.exports = {
  checkAndExecuteScheduledCampaigns,
  startMarketingScheduler,
};
