import { SupabaseService } from '../supabase/SupabaseService';
import { TwitterMonitorService } from './TwitterMonitorService';
import { ApiCallLogger } from './ApiCallLogger';
import { XAccount, TweetCache, AccountToReview, ApiUsageStats, RateLimitInfo } from '../../types/x-scraping';
import { config } from '../../config';

/**
 * Service for monitoring X accounts and caching their tweets
 */
export class AccountMonitorService {
  private static instance: AccountMonitorService;
  private supabaseService: SupabaseService;
  private twitterMonitorService: TwitterMonitorService;
  private apiLogger: ApiCallLogger;
  
  // Rate limiting properties
  private dailyApiCallsUsed: number = 0;
  private dailyApiCallLimit: number = 250;
  private lastApiUsageCheck: Date | null = null;
  
  private constructor() {
    this.supabaseService = SupabaseService.getInstance();
    this.twitterMonitorService = TwitterMonitorService.getInstance();
    this.apiLogger = ApiCallLogger.getInstance();
  }
  
  /**
   * Get the singleton instance of the AccountMonitorService
   */
  public static getInstance(): AccountMonitorService {
    if (!AccountMonitorService.instance) {
      AccountMonitorService.instance = new AccountMonitorService();
    }
    return AccountMonitorService.instance;
  }
  
  /**
   * Get all accounts to monitor
   * @returns Array of accounts that are due for checking
   */
  public async getAccountsToMonitor(): Promise<XAccount[]> {
    try {
      const now = new Date().toISOString();
      
      // First, get all accounts in the review list with status 'pending'
      const { data: accountsToReview, error: reviewError } = await this.supabaseService.client
        .from('accounts_to_review')
        .select('handle')
        .eq('status', 'pending');
      
      if (reviewError) {
        console.error('Error fetching accounts to review:', reviewError);
        return [];
      }
      
      // Create a set of handles to exclude
      const excludeHandles = new Set((accountsToReview || []).map(a => a.handle));
      
      // Get accounts that are due for checking (next_check_date is null or in the past)
      // Order by next_check_date first (oldest first), then by priority
      // Exclude accounts that are in the review list with status 'pending'
      const { data, error } = await this.supabaseService.client
        .from('x_accounts')
        .select('*')
        .or(`next_check_date.is.null,next_check_date.lt.${now}`) // Only get accounts that are due for checking
        .order('next_check_date', { ascending: true }) // Process accounts that are most overdue first
        .order('priority', { ascending: true });       // Then consider priority as a secondary factor
      
      if (error) {
        console.error('Error fetching accounts:', error);
        return [];
      }
      
      // Filter out accounts that are in the review list with status 'pending'
      const filteredAccounts = data ? data.filter(account => !excludeHandles.has(account.handle)) : [];
      
      console.log(`Filtered out ${data ? data.length - filteredAccounts.length : 0} accounts that are in the review list with status 'pending'`);
      
      return filteredAccounts;
    } catch (error) {
      console.error('Error in getAccountsToMonitor:', error);
      return [];
    }
  }
  
  /**
   * Get all accounts regardless of next_check_date
   * @returns Array of all accounts
   */
  public async getAllAccounts(): Promise<XAccount[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('x_accounts')
        .select('*')
        .order('handle', { ascending: true });
      
      if (error) {
        console.error('Error fetching all accounts:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getAllAccounts:', error);
      return [];
    }
  }
  
  /**
   * Update the last_checked timestamp and set next_check_date based on activity level
   * @param accountId The account ID to update
   * @returns Whether the update was successful
   */
  public async updateLastChecked(accountId: number): Promise<boolean> {
    try {
      // First, get the account to determine its activity level
      const { data: account, error: getError } = await this.supabaseService.client
        .from('x_accounts')
        .select('activity_level')
        .eq('id', accountId)
        .single();
      
      if (getError) {
        console.error(`Error getting activity level for account ${accountId}:`, getError);
        return false;
      }
      
      // Calculate next check date based on activity level
      const now = new Date();
      let nextCheckDate = new Date(now);
      
      switch (account.activity_level) {
        case 'high':
          // Check high activity accounts daily
          nextCheckDate.setDate(now.getDate() + 1);
          break;
        case 'medium':
          // Check medium activity accounts every 3 days
          nextCheckDate.setDate(now.getDate() + 3);
          break;
        case 'low':
          // Check low activity accounts weekly
          nextCheckDate.setDate(now.getDate() + 7);
          break;
        default:
          // Default to medium (3 days)
          nextCheckDate.setDate(now.getDate() + 3);
      }
      
      // Update the account
      const { error } = await this.supabaseService.client
        .from('x_accounts')
        .update({ 
          last_checked: now.toISOString(),
          next_check_date: nextCheckDate.toISOString()
        })
        .eq('id', accountId);
      
      if (error) {
        console.error(`Error updating last_checked for account ${accountId}:`, error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in updateLastChecked:', error);
      return false;
    }
  }
  
  /**
   * Get cached tweets for an account
   * @param accountId The account ID to get tweets for
   * @returns Array of cached tweets
   */
  public async getCachedTweets(accountId: number): Promise<TweetCache[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('tweets_cache')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error(`Error fetching cached tweets for account ${accountId}:`, error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getCachedTweets:', error);
      return [];
    }
  }
  
  /**
   * Delete all cached tweets for an account
   * @param accountId The account ID to delete tweets for
   * @returns Whether the deletion was successful
   */
  public async deleteCachedTweets(accountId: number): Promise<boolean> {
    try {
      const { error } = await this.supabaseService.client
        .from('tweets_cache')
        .delete()
        .eq('account_id', accountId);
      
      if (error) {
        console.error(`Error deleting cached tweets for account ${accountId}:`, error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in deleteCachedTweets:', error);
      return false;
    }
  }
  
  /**
   * Add an account to the review list
   * @param handle The X handle to add to the review list
   * @param errorMessage The error message
   * @param errorCode The error code
   * @returns Whether the addition was successful
   */
  public async addAccountToReview(handle: string, errorMessage: string, errorCode: string): Promise<boolean> {
    try {
      const { error } = await this.supabaseService.client
        .from('accounts_to_review')
        .insert({
          handle,
          error_message: errorMessage,
          error_code: errorCode,
          created_at: new Date().toISOString(),
          status: 'pending'
        });
      
      if (error) {
        console.error(`Error adding account ${handle} to review list:`, error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in addAccountToReview:', error);
      return false;
    }
  }
  
  /**
   * Update API usage stats
   * @param callsMade Number of API calls made
   * @param dailyLimit Daily API call limit
   * @param resetTime Time when the rate limit resets
   * @returns Whether the update was successful
   */
  public async updateApiUsageStats(callsMade: number, dailyLimit: number, resetTime?: Date): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Check if we already have a record for today
      const { data, error: selectError } = await this.supabaseService.client
        .from('api_usage_stats')
        .select('*')
        .eq('date', today)
        .single();
      
      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error(`Error checking API usage stats for ${today}:`, selectError);
        return false;
      }
      
      if (data) {
        // Update existing record
        const { error: updateError } = await this.supabaseService.client
          .from('api_usage_stats')
          .update({
            calls_made: callsMade,
            daily_limit: dailyLimit,
            reset_time: resetTime ? resetTime.toISOString() : null
          })
          .eq('id', data.id);
        
        if (updateError) {
          console.error(`Error updating API usage stats for ${today}:`, updateError);
          return false;
        }
      } else {
        // Insert new record
        const { error: insertError } = await this.supabaseService.client
          .from('api_usage_stats')
          .insert({
            date: today,
            calls_made: callsMade,
            daily_limit: dailyLimit,
            reset_time: resetTime ? resetTime.toISOString() : null,
            created_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error(`Error inserting API usage stats for ${today}:`, insertError);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error in updateApiUsageStats:', error);
      return false;
    }
  }
  
  /**
   * Fetch and cache tweets for an account
   * @param account The account to fetch tweets for
   * @param count Number of tweets to fetch
   * @param includeReplies Whether to include replies
   * @param includeRetweets Whether to include retweets
   * @returns Whether the fetch was successful
   */
  public async fetchAndCacheTweets(
    account: XAccount,
    count: number = 10,
    includeReplies: boolean = true,
    includeRetweets: boolean = true
  ): Promise<boolean> {
    try {
      console.log(`Fetching tweets for @${account.handle}...`);
      
      // Get the most recent tweet we have for this account
      const { data: mostRecentTweet, error: tweetError } = await this.supabaseService.client
        .from('tweets_cache')
        .select('created_at')
        .eq('account_id', account.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      // Only use sinceDate if we found a most recent tweet
      const sinceDate = mostRecentTweet ? mostRecentTweet.created_at : null;
      
      // Fetch tweets from Twitter
      const tweets = await this.twitterMonitorService.fetchRecentTweets(
        account.handle,
        count,
        includeReplies,
        includeRetweets,
        sinceDate
      );
      
      // Check if we got any tweets
      if (tweets.length === 0) {
        console.log(`No new tweets found for @${account.handle}.`);
        
        // Update the last_checked timestamp even if we didn't find any tweets
        await this.updateLastChecked(account.id);
        
        return true;
      }
      
      console.log(`Found ${tweets.length} tweets for @${account.handle}.`);
      
      // Set the account_id for each tweet
      const tweetsWithAccountId = tweets.map(tweet => ({
        ...tweet,
        account_id: account.id
      }));
      
      // Insert tweets into the database
      const { error: insertError } = await this.supabaseService.client
        .from('tweets_cache')
        .insert(tweetsWithAccountId);
      
      if (insertError) {
        console.error(`Error inserting tweets for @${account.handle}:`, insertError);
        return false;
      }
      
      console.log(`Inserted ${tweetsWithAccountId.length} tweets for @${account.handle}.`);
      
      // Update the last_checked timestamp
      await this.updateLastChecked(account.id);
      
      // Update the last_tweet_date if we have tweets
      if (tweets.length > 0 && tweets[0].created_at) {
        const { error: updateError } = await this.supabaseService.client
          .from('x_accounts')
          .update({ last_tweet_date: tweets[0].created_at })
          .eq('id', account.id);
        
        if (updateError) {
          console.error(`Error updating last_tweet_date for @${account.handle}:`, updateError);
        }
      }
      
      // If we have rate limit info, update the API usage stats
      if ((tweets as any).rateLimit) {
        const rateLimitInfo: RateLimitInfo = (tweets as any).rateLimit;
        
        // Update API usage stats
        await this.updateApiUsageStats(
          rateLimitInfo.limit - rateLimitInfo.remaining,
          rateLimitInfo.limit,
          rateLimitInfo.reset ? new Date(rateLimitInfo.reset * 1000) : undefined
        );
      }
      
      return true;
    } catch (error: any) {
      console.error(`Error fetching and caching tweets for @${account.handle}:`, error);
      
      // Handle rate limit errors
      if (error.code === 429) {
        console.error(`Rate limit exceeded for @${account.handle}. Will try again later.`);
        
        // Update API usage stats if we have rate limit info
        if (error.rateLimit) {
          const rateLimitInfo: RateLimitInfo = error.rateLimit;
          
          await this.updateApiUsageStats(
            rateLimitInfo.limit,
            rateLimitInfo.limit,
            rateLimitInfo.reset ? new Date(rateLimitInfo.reset * 1000) : undefined
          );
        }
        
        return false;
      }
      
      // Handle validation errors
      if (error.code === 'VALIDATION_ERROR') {
        console.error(`Validation error for @${account.handle}: ${error.message}`);
        
        // Add account to review list
        await this.addAccountToReview(
          account.handle,
          error.message || 'Validation error',
          'VALIDATION_ERROR'
        );
        
        return false;
      }
      
      // Handle other errors
      await this.addAccountToReview(
        account.handle,
        error.message || 'Unknown error',
        error.code || 'UNKNOWN'
      );
      
      return false;
    }
  }
  
  /**
   * Check current API usage and determine if we can make more calls
   * @returns Object with usage info and whether we can proceed
   */
  public async checkApiUsage(): Promise<{
    canProceed: boolean;
    remainingCalls: number;
    usedCalls: number;
    percentageUsed: number;
    recommendedBatchSize: number;
  }> {
    try {
      // Get today's API usage stats from the API logger
      const stats = await this.apiLogger.getTodayUsageStats();
      
      const usedCalls = stats.total_calls;
      const remainingCalls = this.dailyApiCallLimit - usedCalls;
      const percentageUsed = (usedCalls / this.dailyApiCallLimit) * 100;
      
      // Calculate recommended batch size based on remaining calls
      // Each account uses ~2 API calls (user lookup + tweet fetch)
      const maxAccountsFromRemaining = Math.floor(remainingCalls / 2);
      
      // Conservative approach: don't use more than 80% of remaining calls in one batch
      const recommendedBatchSize = Math.min(
        Math.floor(maxAccountsFromRemaining * 0.8),
        config.accountMonitor?.batchSize || 10
      );
      
      // Don't proceed if we're at 90% usage or have less than 20 calls remaining
      const canProceed = percentageUsed < 90 && remainingCalls > 20;
      
      console.log(`API Usage Check: ${usedCalls}/${this.dailyApiCallLimit} calls used (${percentageUsed.toFixed(1)}%)`);
      console.log(`Remaining calls: ${remainingCalls}, Recommended batch size: ${recommendedBatchSize}`);
      
      return {
        canProceed,
        remainingCalls,
        usedCalls,
        percentageUsed,
        recommendedBatchSize: Math.max(1, recommendedBatchSize) // Ensure at least 1
      };
    } catch (error) {
      console.error('Error checking API usage:', error);
      // Conservative fallback
      return {
        canProceed: false,
        remainingCalls: 0,
        usedCalls: this.dailyApiCallLimit,
        percentageUsed: 100,
        recommendedBatchSize: 1
      };
    }
  }

  /**
   * Process all accounts that are due for checking with smart rate limiting
   * @param batchSize Number of accounts to process in one batch (optional, will be calculated if not provided)
   * @returns Number of accounts processed
   */
  public async processAccounts(batchSize?: number): Promise<number> {
    try {
      console.log('Processing accounts with smart rate limiting...');
      
      // Check API usage before proceeding
      const apiUsage = await this.checkApiUsage();
      
      if (!apiUsage.canProceed) {
        console.log(`Skipping account processing due to API usage limits. Used: ${apiUsage.usedCalls}/${this.dailyApiCallLimit} (${apiUsage.percentageUsed.toFixed(1)}%)`);
        return 0;
      }
      
      // Use recommended batch size if not provided
      const effectiveBatchSize = batchSize || apiUsage.recommendedBatchSize;
      
      console.log(`Using batch size: ${effectiveBatchSize} (API usage: ${apiUsage.percentageUsed.toFixed(1)}%)`);
      
      // Get accounts to monitor
      const accounts = await this.getAccountsToMonitor();
      
      if (accounts.length === 0) {
        console.log('No accounts to process.');
        return 0;
      }
      
      console.log(`Found ${accounts.length} accounts to process.`);
      
      // Process accounts in batches
      const accountsToProcess = accounts.slice(0, effectiveBatchSize);
      
      console.log(`Processing ${accountsToProcess.length} accounts in this batch.`);
      
      // Process each account
      let successCount = 0;
      
      for (const account of accountsToProcess) {
        console.log(`Processing account @${account.handle}...`);
        
        // Check API usage before each account (if we're getting close to limits)
        if (apiUsage.percentageUsed > 70) {
          const currentUsage = await this.checkApiUsage();
          if (!currentUsage.canProceed) {
            console.log(`Stopping account processing due to API usage limits reached during batch.`);
            break;
          }
        }
        
        // Fetch and cache tweets for this account
        const success = await this.fetchAndCacheTweets(account);
        
        if (success) {
          successCount++;
        }
        
        // Add a delay between accounts to avoid rate limits
        // Longer delay if we're using more API quota
        const delayMs = apiUsage.percentageUsed > 70 ? 5000 : 2000;
        
        if (accountsToProcess.indexOf(account) < accountsToProcess.length - 1) {
          console.log(`Waiting ${delayMs / 1000} seconds before processing next account...`);
          await this.twitterMonitorService.delay(delayMs);
        }
      }
      
      console.log(`Processed ${successCount} accounts successfully.`);
      
      // Log final API usage
      const finalUsage = await this.checkApiUsage();
      console.log(`Final API usage: ${finalUsage.usedCalls}/${this.dailyApiCallLimit} (${finalUsage.percentageUsed.toFixed(1)}%)`);
      
      return successCount;
    } catch (error) {
      console.error('Error in processAccounts:', error);
      return 0;
    }
  }
  
  /**
   * Add a new account to monitor
   * @param handle The X handle to add
   * @param priority The priority (1-5, 1 being highest)
   * @param activityLevel The activity level (high, medium, low)
   * @returns The new account ID or null if failed
   */
  public async addAccount(
    handle: string,
    priority: number = 3,
    activityLevel: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<number | null> {
    try {
      console.log(`Adding account @${handle}...`);
      
      // Check if account already exists
      const { data: existingAccount, error: existingError } = await this.supabaseService.client
        .from('x_accounts')
        .select('id')
        .eq('handle', handle)
        .single();
      
      if (existingAccount) {
        console.log(`Account @${handle} already exists with ID ${existingAccount.id}.`);
        return existingAccount.id;
      }
      
      // Validate the handle by trying to get the user ID
      const userId = await this.twitterMonitorService.getUserId(handle);
      
      if (!userId) {
        console.error(`Could not validate handle @${handle}.`);
        return null;
      }
      
      // Insert the new account
      const { data, error } = await this.supabaseService.client
        .from('x_accounts')
        .insert({
          handle,
          platform: 'x',
          priority,
          activity_level: activityLevel,
          tweets_per_week: 0,
          next_check_date: new Date().toISOString() // Check immediately
        })
        .select('id')
        .single();
      
      if (error) {
        console.error(`Error adding account @${handle}:`, error);
        return null;
      }
      
      console.log(`Added account @${handle} with ID ${data.id}.`);
      
      return data.id;
    } catch (error: any) {
      console.error(`Error adding account @${handle}:`, error);
      
      // Handle validation errors
      if (error.code === 'VALIDATION_ERROR') {
        console.error(`Validation error for @${handle}: ${error.message}`);
        
        // Add account to review list
        await this.addAccountToReview(
          handle,
          error.message || 'Validation error',
          'VALIDATION_ERROR'
        );
      }
      
      return null;
    }
  }
  
  /**
   * Remove an account from monitoring
   * @param accountId The account ID to remove
   * @returns Whether the removal was successful
   */
  public async removeAccount(accountId: number): Promise<boolean> {
    try {
      console.log(`Removing account with ID ${accountId}...`);
      
      // Delete cached tweets first
      await this.deleteCachedTweets(accountId);
      
      // Delete the account
      const { error } = await this.supabaseService.client
        .from('x_accounts')
        .delete()
        .eq('id', accountId);
      
      if (error) {
        console.error(`Error removing account with ID ${accountId}:`, error);
        return false;
      }
      
      console.log(`Removed account with ID ${accountId}.`);
      
      return true;
    } catch (error) {
      console.error(`Error removing account with ID ${accountId}:`, error);
      return false;
    }
  }
  
  /**
   * Update an account's properties
   * @param accountId The account ID to update
   * @param properties The properties to update
   * @returns Whether the update was successful
   */
  public async updateAccount(
    accountId: number,
    properties: Partial<XAccount>
  ): Promise<boolean> {
    try {
      console.log(`Updating account with ID ${accountId}...`);
      
      // Update the account
      const { error } = await this.supabaseService.client
        .from('x_accounts')
        .update(properties)
        .eq('id', accountId);
      
      if (error) {
        console.error(`Error updating account with ID ${accountId}:`, error);
        return false;
      }
      
      console.log(`Updated account with ID ${accountId}.`);
      
      return true;
    } catch (error) {
      console.error(`Error updating account with ID ${accountId}:`, error);
      return false;
    }
  }
}
