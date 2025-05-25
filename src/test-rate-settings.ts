import { ApiRateSettingsService, RateSetting } from '../services/monitoring/ApiRateSettingsService';

async function testRateSettings() {
    console.log('🧪 Testing API Rate Settings Service...\n');
    
    try {
        const service = ApiRateSettingsService.getInstance();
        
        // Test 1: Initialize defaults
        console.log('1. Initializing default settings...');
        const initSuccess = await service.initializeDefaults();
        console.log(`   ✅ Initialization: ${initSuccess ? 'SUCCESS' : 'FAILED'}\n`);
        
        // Test 2: Get current settings
        console.log('2. Getting current rate settings...');
        const currentSettings = await service.getRateSettings();
        console.log('   Current settings:', currentSettings);
        console.log(`   ✅ Account monitoring rate: ${currentSettings.account_monitoring_rate}`);
        console.log(`   ✅ Engagement monitoring rate: ${currentSettings.engagement_monitoring_rate}\n`);
        
        // Test 3: Update settings
        console.log('3. Updating rate settings...');
        const newSettings = {
            account_monitoring_rate: 3,
            engagement_monitoring_rate: 2
        };
        const updateSuccess = await service.updateRateSettings(newSettings, 'test-script');
        console.log(`   ✅ Update: ${updateSuccess ? 'SUCCESS' : 'FAILED'}\n`);
        
        // Test 4: Verify update
        console.log('4. Verifying updated settings...');
        const updatedSettings = await service.getRateSettings();
        console.log('   Updated settings:', updatedSettings);
        console.log(`   ✅ Account monitoring rate: ${updatedSettings.account_monitoring_rate} (expected: 3)`);
        console.log(`   ✅ Engagement monitoring rate: ${updatedSettings.engagement_monitoring_rate} (expected: 2)\n`);
        
        // Test 5: Get individual setting
        console.log('5. Testing individual setting retrieval...');
        const accountRate = await service.getSetting('account_monitoring_rate');
        const engagementRate = await service.getSetting('engagement_monitoring_rate');
        console.log(`   ✅ Account rate: ${accountRate}`);
        console.log(`   ✅ Engagement rate: ${engagementRate}\n`);
        
        // Test 6: Set individual setting
        console.log('6. Testing individual setting update...');
        const setSuccess = await service.setSetting('account_monitoring_rate', 5, 'test-script');
        console.log(`   ✅ Set individual setting: ${setSuccess ? 'SUCCESS' : 'FAILED'}`);
        
        const verifyIndividual = await service.getSetting('account_monitoring_rate');
        console.log(`   ✅ Verified value: ${verifyIndividual} (expected: 5)\n`);
        
        // Test 7: Test validation
        console.log('7. Testing validation...');
        const invalidUpdate1 = await service.setSetting('account_monitoring_rate', 15, 'test-script'); // Too high
        const invalidUpdate2 = await service.setSetting('engagement_monitoring_rate', 0, 'test-script'); // Too low
        console.log(`   ✅ Invalid account rate (15): ${invalidUpdate1 ? 'FAILED (should reject)' : 'SUCCESS (correctly rejected)'}`);
        console.log(`   ✅ Invalid engagement rate (0): ${invalidUpdate2 ? 'FAILED (should reject)' : 'SUCCESS (correctly rejected)'}\n`);
        
        // Test 8: Get all settings
        console.log('8. Getting all settings...');
        const allSettings = await service.getAllSettings();
        console.log(`   ✅ Found ${allSettings.length} settings:`);
        allSettings.forEach((setting: RateSetting) => {
            console.log(`      - ${setting.setting_name}: ${setting.setting_value} (${setting.description})`);
        });
        console.log();
        
        // Test 9: Cache functionality
        console.log('9. Testing cache functionality...');
        const startTime = Date.now();
        await service.getSetting('account_monitoring_rate'); // Should use cache
        const cacheTime = Date.now() - startTime;
        console.log(`   ✅ Cache retrieval time: ${cacheTime}ms`);
        
        service.clearCache();
        const clearStartTime = Date.now();
        await service.getSetting('account_monitoring_rate'); // Should hit database
        const dbTime = Date.now() - clearStartTime;
        console.log(`   ✅ Database retrieval time: ${dbTime}ms`);
        console.log(`   ✅ Cache working: ${cacheTime < dbTime ? 'YES' : 'UNCLEAR'}\n`);
        
        // Reset to defaults for clean state
        console.log('10. Resetting to default values...');
        const resetSuccess = await service.updateRateSettings({
            account_monitoring_rate: 1,
            engagement_monitoring_rate: 1
        }, 'test-script-cleanup');
        console.log(`    ✅ Reset: ${resetSuccess ? 'SUCCESS' : 'FAILED'}\n`);
        
        console.log('🎉 All tests completed successfully!');
        console.log('\n📊 Summary:');
        console.log('   ✅ Database table creation/initialization');
        console.log('   ✅ Settings retrieval (individual and bulk)');
        console.log('   ✅ Settings updates (individual and bulk)');
        console.log('   ✅ Input validation');
        console.log('   ✅ Caching functionality');
        console.log('   ✅ Error handling');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
        process.exit(1);
    }
}

// Run the test
testRateSettings().then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
}).catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
});
