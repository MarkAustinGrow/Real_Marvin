import { ApiCallLogger } from '../services/monitoring/ApiCallLogger';
import { TwitterService } from '../services/twitter/TwitterService';
import { TwitterMonitorService } from '../services/monitoring/TwitterMonitorService';

/**
 * Test script to verify API call logging is working
 * This will make a few API calls and show the logging in action
 */
async function testApiLogging() {
    console.log('🔍 Testing API Call Logging System...\n');
    
    const apiLogger = ApiCallLogger.getInstance();
    const twitterService = TwitterService.getInstance();
    const twitterMonitorService = TwitterMonitorService.getInstance();
    
    try {
        // Test 1: Get current API usage stats
        console.log('📊 Getting current API usage stats...');
        const stats = await apiLogger.getTodayUsageStats();
        console.log('Current API usage today:', stats);
        console.log('');
        
        // Test 2: Test TwitterService API call (getOwnUsername)
        console.log('🐦 Testing TwitterService API call (getOwnUsername)...');
        const username = await twitterService.getOwnUsername();
        console.log(`Username: ${username}`);
        console.log('');
        
        // Test 3: Test engagement monitoring (this will make API calls)
        console.log('💬 Testing engagement monitoring...');
        await twitterService.monitorEngagements();
        console.log('');
        
        // Test 4: Get updated API usage stats
        console.log('📊 Getting updated API usage stats...');
        const updatedStats = await apiLogger.getTodayUsageStats();
        console.log('Updated API usage today:', updatedStats);
        console.log('');
        
        // Test 5: Show breakdown by service and endpoint
        console.log('📈 API Usage Breakdown:');
        console.log('By Service:', updatedStats.calls_by_service);
        console.log('By Endpoint:', updatedStats.calls_by_endpoint);
        console.log(`Total Calls: ${updatedStats.total_calls}`);
        console.log(`Error Count: ${updatedStats.error_count}`);
        if (updatedStats.last_user_limit_remaining !== undefined) {
            console.log(`Last User Limit Remaining: ${updatedStats.last_user_limit_remaining}/250`);
        }
        console.log('');
        
        console.log('✅ API logging test completed successfully!');
        console.log('');
        console.log('💡 You can now monitor API usage in real-time by checking the api_call_details table in Supabase');
        console.log('💡 Look for log messages like: [API LOG] SUCCESS | TwitterService | users/me | 150ms | User Limit: 249/250');
        
    } catch (error) {
        console.error('❌ Error during API logging test:', error);
    }
}

// Run the test
testApiLogging().then(() => {
    console.log('\n🏁 Test completed. Check the logs above for API call details.');
    process.exit(0);
}).catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
});
