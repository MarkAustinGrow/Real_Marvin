import { AccountMonitorService } from '../services/monitoring/AccountMonitorService';
import { ApiCallLogger } from '../services/monitoring/ApiCallLogger';
import { config } from '../config';

/**
 * Optimized scheduler for the account monitoring process
 * Implements smart frequency scheduling and rate limiting
 */
class OptimizedAccountMonitorScheduler {
  private accountMonitorService: AccountMonitorService;
  private apiLogger: ApiCallLogger;
  private isRunning: boolean = false;
  private scheduledTimeout: NodeJS.Timeout | null = null;
  
  constructor() {
    this.accountMonitorService = AccountMonitorService.getInstance();
    this.apiLogger = ApiCallLogger.getInstance();
  }
  
  /**
   * Calculate the next run interval based on current API usage
   * @returns Interval in minutes
   */
  private async calculateNextInterval(): Promise<number> {
    try {
      const apiUsage = await this.accountMonitorService.checkApiUsage();
      const baseInterval = config.accountMonitor?.intervalMinutes || 60;
      
      // Adjust interval based on API usage
      if (apiUsage.percentageUsed > 80) {
        // If we're using >80% of API quota, slow down significantly
        return baseInterval * 4; // 4 hours
      } else if (apiUsage.percentageUsed > 60) {
        // If we're using >60% of API quota, slow down moderately
        return baseInterval * 2; // 2 hours
      } else if (apiUsage.percentageUsed > 40) {
        // If we're using >40% of API quota, use normal interval
        return baseInterval; // 1 hour
      } else {
        // If we're using <40% of API quota, we can be more aggressive
        return Math.max(30, baseInterval / 2); // 30 minutes minimum
      }
    } catch (error) {
      console.error('Error calculating next interval:', error);
      return config.accountMonitor?.intervalMinutes || 60; // Fallback to default
    }
  }
  
  /**
   * Determine if we should run during current time (avoid peak hours)
   * @returns Whether we should run now
   */
  private shouldRunNow(): boolean {
    const now = new Date();
    const hour = now.getHours();
    
    // Avoid peak Twitter usage hours (9 AM - 11 AM and 7 PM - 9 PM UTC)
    // These are rough estimates of when Twitter API might be more congested
    const isPeakHour = (hour >= 9 && hour <= 11) || (hour >= 19 && hour <= 21);
    
    if (isPeakHour) {
      console.log(`Skipping run during peak hour (${hour}:00 UTC). Will try again later.`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Main scheduler function with smart rate limiting
   */
  public async run(): Promise<void> {
    if (this.isRunning) {
      console.log('Account monitor scheduler is already running. Skipping this cycle.');
      return;
    }
    
    this.isRunning = true;
    
    try {
      console.log('🔄 Starting optimized account monitor scheduler...');
      
      // Check if we should run during this time
      if (!this.shouldRunNow()) {
        // Schedule retry in 30 minutes
        this.scheduleNext(30);
        return;
      }
      
      // Check API usage before proceeding
      const apiUsage = await this.accountMonitorService.checkApiUsage();
      
      console.log(`📊 Current API usage: ${apiUsage.usedCalls}/${250} (${apiUsage.percentageUsed.toFixed(1)}%)`);
      
      if (!apiUsage.canProceed) {
        console.log('⚠️ Skipping account processing due to API usage limits.');
        // Schedule next run with longer interval
        const nextInterval = await this.calculateNextInterval();
        this.scheduleNext(nextInterval);
        return;
      }
      
      // Process accounts with smart batch sizing
      console.log(`🚀 Processing accounts with recommended batch size: ${apiUsage.recommendedBatchSize}`);
      
      const count = await this.accountMonitorService.processAccounts();
      
      console.log(`✅ Processed ${count} accounts successfully.`);
      
      // Get updated API usage
      const finalUsage = await this.accountMonitorService.checkApiUsage();
      console.log(`📈 Final API usage: ${finalUsage.usedCalls}/${250} (${finalUsage.percentageUsed.toFixed(1)}%)`);
      
      // Calculate next run interval based on current usage
      const nextInterval = await this.calculateNextInterval();
      this.scheduleNext(nextInterval);
      
    } catch (error) {
      console.error('❌ Error in optimized account monitor scheduler:', error);
      
      // If there was an error, try again in 15 minutes
      console.log('🔄 Scheduling retry in 15 minutes...');
      this.scheduleNext(15);
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Schedule the next run
   * @param intervalMinutes Interval in minutes
   */
  private scheduleNext(intervalMinutes: number): void {
    if (this.scheduledTimeout) {
      clearTimeout(this.scheduledTimeout);
    }
    
    const nextRunTime = new Date(Date.now() + intervalMinutes * 60 * 1000);
    console.log(`⏰ Next account monitoring run scheduled for ${nextRunTime.toLocaleString()} (in ${intervalMinutes} minutes)`);
    
    this.scheduledTimeout = setTimeout(() => {
      this.run();
    }, intervalMinutes * 60 * 1000);
  }
  
  /**
   * Start the scheduler
   */
  public start(): void {
    console.log('🎯 Starting optimized account monitor scheduler...');
    
    // Run immediately, then schedule subsequent runs
    this.run();
  }
  
  /**
   * Stop the scheduler
   */
  public stop(): void {
    console.log('🛑 Stopping optimized account monitor scheduler...');
    
    if (this.scheduledTimeout) {
      clearTimeout(this.scheduledTimeout);
      this.scheduledTimeout = null;
    }
    
    this.isRunning = false;
  }
}

// Create scheduler instance
const scheduler = new OptimizedAccountMonitorScheduler();

/**
 * Legacy function for backward compatibility
 */
async function accountMonitorScheduler() {
  scheduler.start();
}

// Run the scheduler if this script is executed directly
if (require.main === module) {
  scheduler.start();
}

export { accountMonitorScheduler, OptimizedAccountMonitorScheduler };
