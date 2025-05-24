import { SupabaseService } from '../services/supabase/SupabaseService';

/**
 * Script to optimize the 169 existing accounts by setting appropriate activity levels
 * This will help distribute the monitoring load and reduce API usage
 */

interface AccountOptimization {
  handle: string;
  priority: number;
  activity_level: 'high' | 'medium' | 'low';
  reason: string;
}

async function optimizeAccountTiers() {
  console.log('🎯 Starting account tier optimization...');
  
  const supabase = SupabaseService.getInstance();
  
  try {
    // Get all accounts
    const { data: accounts, error } = await supabase.client
      .from('x_accounts')
      .select('*')
      .order('handle');
    
    if (error) {
      console.error('Error fetching accounts:', error);
      return;
    }
    
    if (!accounts || accounts.length === 0) {
      console.log('No accounts found to optimize.');
      return;
    }
    
    console.log(`Found ${accounts.length} accounts to optimize.`);
    
    // Define high-priority accounts (major influencers, AI leaders, etc.)
    const highPriorityAccounts = [
      'elonmusk', 'garyvee', 'balajis', 'VitalikButerin', 'pmarca', 
      'APompliano', 'beeple', 'punk6529', 'ClaireSilver12', 'refikanadol',
      'midjourney', 'openai', 'anthropic', 'cz_binance', 'SnoopDogg'
    ];
    
    // Define medium-priority accounts (active creators, developers, etc.)
    const mediumPriorityAccounts = [
      'jackbutcher', 'fewocious', 'XCOPYART', 'maddogjones', 'trevorjonesart',
      'sougwen', 'zachlieberman', 'MatthewBerman', 'bentossell', 'LiorOnAI',
      'altryne', 'quasimondo', 'MattVidPro', 'YashasEdu', 'farokh',
      'Zeneca', 'CozomoMedici', 'pranksyNFT', 'LucaNetz', 'ali_charts'
    ];
    
    const optimizations: AccountOptimization[] = [];
    
    // Categorize accounts
    for (const account of accounts) {
      const handle = account.handle.toLowerCase();
      let priority = 3; // Default medium priority
      let activity_level: 'high' | 'medium' | 'low' = 'medium';
      let reason = 'Default medium tier';
      
      if (highPriorityAccounts.some(h => h.toLowerCase() === handle)) {
        priority = 1;
        activity_level = 'high';
        reason = 'High-influence account - daily monitoring';
      } else if (mediumPriorityAccounts.some(h => h.toLowerCase() === handle)) {
        priority = 2;
        activity_level = 'medium';
        reason = 'Active creator/developer - 3-day monitoring';
      } else {
        priority = 3;
        activity_level = 'low';
        reason = 'Standard account - weekly monitoring';
      }
      
      optimizations.push({
        handle: account.handle,
        priority,
        activity_level,
        reason
      });
    }
    
    // Show optimization plan
    console.log('\n📊 Optimization Plan:');
    const highCount = optimizations.filter(o => o.activity_level === 'high').length;
    const mediumCount = optimizations.filter(o => o.activity_level === 'medium').length;
    const lowCount = optimizations.filter(o => o.activity_level === 'low').length;
    
    console.log(`High Priority (daily): ${highCount} accounts`);
    console.log(`Medium Priority (3-day): ${mediumCount} accounts`);
    console.log(`Low Priority (weekly): ${lowCount} accounts`);
    
    // Calculate expected daily API usage
    const dailyApiCalls = (highCount * 2) + Math.ceil((mediumCount * 2) / 3) + Math.ceil((lowCount * 2) / 7);
    console.log(`\n📈 Expected daily API usage: ~${dailyApiCalls} calls (vs 250 limit)`);
    console.log(`Engagement monitoring: ~48 calls/day`);
    console.log(`Total estimated: ~${dailyApiCalls + 48} calls/day`);
    
    if (dailyApiCalls + 48 > 200) {
      console.log('⚠️  Warning: Estimated usage is high. Consider reducing account count or frequency.');
    } else {
      console.log('✅ Estimated usage is within safe limits.');
    }
    
    // Apply optimizations
    console.log('\n🔄 Applying optimizations...');
    
    let successCount = 0;
    for (const opt of optimizations) {
      try {
        const { error: updateError } = await supabase.client
          .from('x_accounts')
          .update({
            priority: opt.priority,
            activity_level: opt.activity_level
          })
          .eq('handle', opt.handle);
        
        if (updateError) {
          console.error(`Error updating ${opt.handle}:`, updateError);
        } else {
          successCount++;
          if (opt.activity_level === 'high') {
            console.log(`✨ ${opt.handle}: ${opt.reason}`);
          }
        }
      } catch (error) {
        console.error(`Exception updating ${opt.handle}:`, error);
      }
    }
    
    console.log(`\n✅ Successfully optimized ${successCount}/${optimizations.length} accounts.`);
    
    // Show tier breakdown
    console.log('\n📋 Final Tier Breakdown:');
    console.log('High Priority (Daily monitoring):');
    optimizations.filter(o => o.activity_level === 'high').forEach(o => {
      console.log(`  - @${o.handle}`);
    });
    
    console.log('\nMedium Priority (3-day monitoring):');
    optimizations.filter(o => o.activity_level === 'medium').slice(0, 10).forEach(o => {
      console.log(`  - @${o.handle}`);
    });
    if (mediumCount > 10) {
      console.log(`  ... and ${mediumCount - 10} more`);
    }
    
    console.log(`\nLow Priority (Weekly monitoring): ${lowCount} accounts`);
    
    console.log('\n🎉 Account tier optimization completed!');
    console.log('💡 The system will now monitor accounts based on their activity levels:');
    console.log('   - High: Daily monitoring');
    console.log('   - Medium: Every 3 days');
    console.log('   - Low: Weekly');
    
  } catch (error) {
    console.error('❌ Error during optimization:', error);
  }
}

// Run the optimization if this script is executed directly
if (require.main === module) {
  optimizeAccountTiers().then(() => {
    console.log('\n🏁 Optimization completed. You can now restart the account monitoring system.');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Optimization failed:', error);
    process.exit(1);
  });
}

export { optimizeAccountTiers };
