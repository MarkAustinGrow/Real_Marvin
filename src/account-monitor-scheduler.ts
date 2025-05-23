import { AccountMonitorService } from '../services/monitoring/AccountMonitorService';
import { config } from '../config';

/**
 * Scheduler for the account monitoring process
 * This script runs the account monitoring process on a regular basis
 */
async function accountMonitorScheduler() {
  try {
    console.log('Starting account monitor scheduler...');
    
    // Get the account monitor service
    const accountMonitorService = AccountMonitorService.getInstance();
    
    // Process accounts in batches
    const batchSize = config.accountMonitor?.batchSize || 10;
    
    console.log(`Processing accounts with batch size ${batchSize}...`);
    
    // Process accounts
    const count = await accountMonitorService.processAccounts(batchSize);
    
    console.log(`Processed ${count} accounts successfully.`);
    
    // Schedule the next run
    const interval = config.accountMonitor?.intervalMinutes || 60; // Default to 60 minutes
    
    console.log(`Scheduling next run in ${interval} minutes...`);
    
    setTimeout(() => {
      accountMonitorScheduler();
    }, interval * 60 * 1000);
  } catch (error) {
    console.error('Error in accountMonitorScheduler:', error);
    
    // If there was an error, try again in 5 minutes
    console.log('Scheduling retry in 5 minutes...');
    
    setTimeout(() => {
      accountMonitorScheduler();
    }, 5 * 60 * 1000);
  }
}

// Run the scheduler if this script is executed directly
if (require.main === module) {
  accountMonitorScheduler();
}

export { accountMonitorScheduler };
