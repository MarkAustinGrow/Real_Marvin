import { AccountMonitorService } from '../services/monitoring/AccountMonitorService';

/**
 * Test script for the account monitoring functionality
 */
async function testAccountMonitor() {
  try {
    console.log('Testing account monitoring functionality...');
    
    // Get the account monitor service
    const accountMonitorService = AccountMonitorService.getInstance();
    
    // Command line arguments
    const args = process.argv.slice(2);
    const command = args[0]?.toLowerCase();
    
    if (!command) {
      console.log('Please specify a command:');
      console.log('  process - Process accounts due for checking');
      console.log('  list - List all accounts');
      console.log('  add <handle> [priority] [activity_level] - Add a new account');
      console.log('  remove <id> - Remove an account');
      console.log('  update <id> <field> <value> - Update an account field');
      console.log('  fetch <id> [count] - Fetch tweets for an account');
      return;
    }
    
    switch (command) {
      case 'process': {
        // Process accounts
        const batchSize = parseInt(args[1]) || 10;
        console.log(`Processing accounts with batch size ${batchSize}...`);
        
        const count = await accountMonitorService.processAccounts(batchSize);
        console.log(`Processed ${count} accounts successfully.`);
        break;
      }
      
      case 'list': {
        // List all accounts
        console.log('Listing all accounts...');
        
        const accounts = await accountMonitorService.getAllAccounts();
        
        if (accounts.length === 0) {
          console.log('No accounts found.');
          return;
        }
        
        console.log(`Found ${accounts.length} accounts:`);
        
        // Display accounts in a table
        console.table(accounts.map(account => ({
          id: account.id,
          handle: account.handle,
          priority: account.priority,
          activity_level: account.activity_level,
          last_checked: account.last_checked,
          next_check_date: account.next_check_date,
          last_tweet_date: account.last_tweet_date,
          tweets_per_week: account.tweets_per_week
        })));
        break;
      }
      
      case 'add': {
        // Add a new account
        const handle = args[1];
        const priority = parseInt(args[2]) || 3;
        const activityLevel = args[3] as 'high' | 'medium' | 'low' || 'medium';
        
        if (!handle) {
          console.log('Please specify a handle to add.');
          return;
        }
        
        console.log(`Adding account @${handle} with priority ${priority} and activity level ${activityLevel}...`);
        
        const accountId = await accountMonitorService.addAccount(handle, priority, activityLevel);
        
        if (accountId) {
          console.log(`Added account @${handle} with ID ${accountId}.`);
        } else {
          console.log(`Failed to add account @${handle}.`);
        }
        break;
      }
      
      case 'remove': {
        // Remove an account
        const accountId = parseInt(args[1]);
        
        if (!accountId) {
          console.log('Please specify an account ID to remove.');
          return;
        }
        
        console.log(`Removing account with ID ${accountId}...`);
        
        const success = await accountMonitorService.removeAccount(accountId);
        
        if (success) {
          console.log(`Removed account with ID ${accountId}.`);
        } else {
          console.log(`Failed to remove account with ID ${accountId}.`);
        }
        break;
      }
      
      case 'update': {
        // Update an account field
        const accountId = parseInt(args[1]);
        const field = args[2];
        const value = args[3];
        
        if (!accountId || !field || value === undefined) {
          console.log('Please specify an account ID, field, and value to update.');
          return;
        }
        
        console.log(`Updating account with ID ${accountId}, setting ${field} to ${value}...`);
        
        // Convert value to the appropriate type
        let typedValue: any = value;
        
        if (field === 'priority') {
          typedValue = parseInt(value);
        } else if (field === 'tweets_per_week') {
          typedValue = parseFloat(value);
        } else if (value === 'null') {
          typedValue = null;
        }
        
        const properties: any = {};
        properties[field] = typedValue;
        
        const success = await accountMonitorService.updateAccount(accountId, properties);
        
        if (success) {
          console.log(`Updated account with ID ${accountId}.`);
        } else {
          console.log(`Failed to update account with ID ${accountId}.`);
        }
        break;
      }
      
      case 'fetch': {
        // Fetch tweets for an account
        const accountId = parseInt(args[1]);
        const count = parseInt(args[2]) || 10;
        
        if (!accountId) {
          console.log('Please specify an account ID to fetch tweets for.');
          return;
        }
        
        console.log(`Fetching ${count} tweets for account with ID ${accountId}...`);
        
        // Get the account
        const accounts = await accountMonitorService.getAllAccounts();
        const account = accounts.find(a => a.id === accountId);
        
        if (!account) {
          console.log(`Account with ID ${accountId} not found.`);
          return;
        }
        
        // Fetch and cache tweets
        const success = await accountMonitorService.fetchAndCacheTweets(account, count);
        
        if (success) {
          console.log(`Fetched tweets for account @${account.handle} (ID: ${accountId}).`);
          
          // Get the cached tweets
          const tweets = await accountMonitorService.getCachedTweets(accountId);
          
          console.log(`Found ${tweets.length} cached tweets:`);
          
          // Display tweets in a table
          console.table(tweets.map(tweet => ({
            id: tweet.id,
            tweet_id: tweet.tweet_id,
            created_at: tweet.created_at,
            text: tweet.tweet_text?.substring(0, 50) + (tweet.tweet_text && tweet.tweet_text.length > 50 ? '...' : ''),
            engagement_score: tweet.engagement_score
          })));
        } else {
          console.log(`Failed to fetch tweets for account @${account.handle} (ID: ${accountId}).`);
        }
        break;
      }
      
      default:
        console.log(`Unknown command: ${command}`);
        break;
    }
  } catch (error) {
    console.error('Error in testAccountMonitor:', error);
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  testAccountMonitor();
}
