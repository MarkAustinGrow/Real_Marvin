import express, { Request, Response } from 'express';
import path from 'path';
import basicAuth from 'express-basic-auth';
import { TwitterService } from '../services/twitter/TwitterService';
import { ContentGenerator } from '../services/content/ContentGenerator';
import { EngagementService } from '../services/engagement/EngagementService';
import { blogPostScheduler } from './blog-post-scheduler';
import { SupabaseService } from '../services/supabase/SupabaseService';
import { BlogPostEnhancer } from './blog-post-enhancer';
import { AccountMonitorService } from '../services/monitoring/AccountMonitorService';
import { ApiCallLogger } from '../services/monitoring/ApiCallLogger';
import { ApiRateSettingsService } from '../services/monitoring/ApiRateSettingsService';

export function startWebServer() {
  const app = express();
  const PORT = process.env.WEB_PORT || 3000;
  
  // CORS middleware - must come before authentication
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    
    next();
  });
  
  // Basic authentication
  app.use(basicAuth({
    users: { 'admin': process.env.ADMIN_PASSWORD || 'marvin' },
    challenge: true,
    realm: 'Marvin Admin Interface'
  } as any));
  
  // Path to the public directory
  // In development, it's in src/public
  // In production (Docker), it's copied to dist/src/public
  const publicDir = path.resolve(__dirname, 'public');
  console.log('Public directory path:', publicDir);
  
  // Serve static files
  app.use(express.static(publicDir));
  
  // Fallback for serving index.html
  app.use((req: Request, res: Response, next: express.NextFunction) => {
    if (req.path === '/') {
      console.log('Serving index.html from:', path.join(publicDir, 'index.html'));
      res.sendFile(path.join(publicDir, 'index.html'));
    } else {
      next();
    }
  });
  app.use(express.json());
  
  // API Rate Settings endpoints
  app.get('/api/rate-settings', async (req: Request, res: Response) => {
    try {
      const rateSettingsService = ApiRateSettingsService.getInstance();
      const settings = await rateSettingsService.getRateSettings();
      
      res.json({
        success: true,
        settings
      });
    } catch (error: unknown) {
      console.error('Error getting rate settings:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
  
  app.post('/api/rate-settings', async (req: Request, res: Response) => {
    try {
      const { account_monitoring_rate, engagement_monitoring_rate } = req.body;
      
      if (typeof account_monitoring_rate !== 'number' || typeof engagement_monitoring_rate !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'Both account_monitoring_rate and engagement_monitoring_rate must be numbers'
        });
      }
      
      const rateSettingsService = ApiRateSettingsService.getInstance();
      const success = await rateSettingsService.updateRateSettings({
        account_monitoring_rate,
        engagement_monitoring_rate
      }, 'web-interface');
      
      if (success) {
        res.json({
          success: true,
          message: 'Rate settings updated successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to update rate settings'
        });
      }
    } catch (error: unknown) {
      console.error('Error updating rate settings:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
  
  app.get('/api/rate-settings/:name', async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const rateSettingsService = ApiRateSettingsService.getInstance();
      const value = await rateSettingsService.getSetting(name);
      
      res.json({
        success: true,
        setting: {
          name,
          value
        }
      });
    } catch (error: unknown) {
      console.error(`Error getting rate setting ${req.params.name}:`, error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
  
  app.put('/api/rate-settings/:name', async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const { value } = req.body;
      
      if (typeof value !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'Value must be a number'
        });
      }
      
      const rateSettingsService = ApiRateSettingsService.getInstance();
      const success = await rateSettingsService.setSetting(name, value, 'web-interface');
      
      if (success) {
        res.json({
          success: true,
          message: `Setting ${name} updated successfully`
        });
      } else {
        res.status(400).json({
          success: false,
          message: `Failed to update setting ${name}`
        });
      }
    } catch (error: unknown) {
      console.error(`Error updating rate setting ${req.params.name}:`, error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
  
  // Enhanced accounts endpoint with quality metrics
  app.get('/api/account-monitor/accounts-enhanced', async (req: Request, res: Response) => {
    try {
      const accountMonitorService = AccountMonitorService.getInstance();
      
      // Get all accounts
      const accounts = await accountMonitorService.getAllAccounts();
      
      // Get API usage stats
      const apiUsage = await accountMonitorService.checkApiUsage();
      
      // Calculate quality metrics for each account
      const enhancedAccounts = await Promise.all(accounts.map(async (account) => {
        const tweets = await accountMonitorService.getCachedTweets(account.id);
        
        // Calculate quality metrics with null safety
        const avgEngagement = tweets.length > 0 
          ? tweets.reduce((sum, tweet) => sum + (tweet.engagement_score || 0), 0) / tweets.length 
          : 0;
        
        const tweetCount = tweets.length;
        const lastTweetDate = tweets.length > 0 ? tweets[0].created_at : null;
        
        // Calculate quality score (0-10)
        let qualityScore = 5; // Base score
        if (avgEngagement > 10) qualityScore += 2;
        else if (avgEngagement > 5) qualityScore += 1;
        
        if (tweetCount > 50) qualityScore += 1;
        else if (tweetCount > 20) qualityScore += 0.5;
        
        // Recent activity bonus
        if (lastTweetDate) {
          const daysSinceLastTweet = (Date.now() - new Date(lastTweetDate).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceLastTweet < 7) qualityScore += 1;
          else if (daysSinceLastTweet < 30) qualityScore += 0.5;
        }
        
        return {
          ...account,
          qualityMetrics: {
            avgEngagement: Math.round(avgEngagement * 10) / 10,
            tweetCount,
            lastTweetDate,
            qualityScore: Math.min(10, Math.max(0, Math.round(qualityScore * 10) / 10))
          }
        };
      }));
      
      res.json({ 
        success: true, 
        accounts: enhancedAccounts,
        apiUsage: {
          usedCalls: apiUsage.usedCalls,
          remainingCalls: apiUsage.remainingCalls,
          percentageUsed: apiUsage.percentageUsed,
          recommendedBatchSize: apiUsage.recommendedBatchSize
        }
      });
    } catch (error: unknown) {
      console.error('Error getting enhanced accounts:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
  
  // Bulk update accounts endpoint
  app.post('/api/account-monitor/bulk-update', express.json(), async (req: Request, res: Response) => {
    try {
      const { updates } = req.body;
      
      if (!updates || !Array.isArray(updates)) {
        return res.status(400).json({
          success: false,
          message: 'Updates array is required'
        });
      }
      
      const accountMonitorService = AccountMonitorService.getInstance();
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      
      for (const update of updates) {
        try {
          const success = await accountMonitorService.updateAccount(update.accountId, update.properties);
          if (success) {
            successCount++;
          } else {
            errorCount++;
            errors.push(`Failed to update account ${update.accountId}`);
          }
        } catch (error) {
          errorCount++;
          errors.push(`Error updating account ${update.accountId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      res.json({
        success: errorCount === 0,
        message: `Updated ${successCount} accounts successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        successCount,
        errorCount,
        errors: errorCount > 0 ? errors : undefined
      });
    } catch (error: unknown) {
      console.error('Error in bulk update:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
  
  // API usage stats endpoint (fixed - removed non-existent method)
  app.get('/api/account-monitor/api-usage', async (req: Request, res: Response) => {
    try {
      const accountMonitorService = AccountMonitorService.getInstance();
      const apiLogger = ApiCallLogger.getInstance();
      
      // Get current usage
      const currentUsage = await accountMonitorService.checkApiUsage();
      
      // Get today's detailed stats
      const todayStats = await apiLogger.getTodayUsageStats();
      
      res.json({
        success: true,
        currentUsage,
        todayStats
      });
    } catch (error: unknown) {
      console.error('Error getting API usage:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
  
  // Account monitoring endpoints
  app.get('/api/account-monitor/accounts', async (req: Request, res: Response) => {
    try {
      const accountMonitorService = AccountMonitorService.getInstance();
      const accounts = await accountMonitorService.getAllAccounts();
      res.json({ success: true, accounts });
    } catch (error: unknown) {
      console.error('Error getting accounts:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
  
  app.post('/api/account-monitor/update', express.json(), async (req: Request, res: Response) => {
    try {
      const { accountId, properties } = req.body;
      
      if (!accountId || !properties) {
        return res.status(400).json({
          success: false,
          message: 'Account ID and properties are required'
        });
      }
      
      const accountMonitorService = AccountMonitorService.getInstance();
      const success = await accountMonitorService.updateAccount(accountId, properties);
      
      if (success) {
        res.json({
          success: true,
          message: `Account updated successfully`
        });
      } else {
        res.status(400).json({
          success: false,
          message: `Failed to update account`
        });
      }
    } catch (error: unknown) {
      console.error('Error updating account:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
  
  // Engagement rules endpoint
  app.get('/api/engagement/rules', async (req: Request, res: Response) => {
    try {
      const engagementService = EngagementService.getInstance();
      const rules = await engagementService.getRules();
      
      res.json({ 
        success: true,
        rules: rules || []
      });
    } catch (error: unknown) {
      console.error('Error getting engagement rules:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });

  // Update engagement rules endpoint
  app.post('/api/engagement/rules', async (req: Request, res: Response) => {
    try {
      const { rules } = req.body;
      
      if (!rules || !Array.isArray(rules)) {
        return res.status(400).json({
          success: false,
          message: 'Rules array is required'
        });
      }
      
      const engagementService = EngagementService.getInstance();
      await engagementService.updateRules(rules);
      
      res.json({
        success: true,
        message: 'Engagement rules updated successfully'
      });
    } catch (error: unknown) {
      console.error('Error updating engagement rules:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });

  // API endpoints for testing
  app.post('/api/generate-blog-post', async (req: Request, res: Response) => {
    try {
      const theme = req.body.theme || 'technology';
      const useMemory = req.body.useMemory !== false;
      const dryRun = req.body.dryRun === true;
      
      const contentGenerator = ContentGenerator.getInstance();
      await contentGenerator.initialize();
      
      const blogPost = await contentGenerator.generateBlogPost(theme, useMemory);
      
      if (!dryRun) {
        const supabaseService = SupabaseService.getInstance();
        const { data, error } = await supabaseService.client
          .from('blog_posts')
          .insert({
            title: blogPost.title,
            markdown: blogPost.content,
            excerpt: blogPost.excerpt,
            status: req.body.status || 'draft',
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();
          
        if (error) {
          console.error('Error saving blog post:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to save blog post to database',
            blogPost
          });
        }
        
        const enhancer = new BlogPostEnhancer();
        await enhancer.enhanceBlogPost(data.id);
        
        return res.json({
          success: true,
          message: 'Blog post generated, saved, and enhanced successfully',
          blogPost,
          id: data.id,
          status: req.body.status || 'draft'
        });
      }
      
      return res.json({
        success: true,
        message: 'Blog post generated successfully (dry run)',
        blogPost,
        dryRun: true
      });
    } catch (error: unknown) {
      console.error('Error in generate-blog-post endpoint:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
  
  app.post('/api/test-tweet', async (req: Request, res: Response) => {
    try {
      const category = req.body.category || 'Toolbox';
      const twitterService = TwitterService.getInstance();
      const contentGenerator = ContentGenerator.getInstance();
      
      await contentGenerator.initialize();
      const tweetContent = await contentGenerator.generateTweet(category);
      const formattedContent = twitterService.formatContent(tweetContent);
      
      if (req.body.previewOnly) {
        return res.json({
          success: true,
          preview: true,
          content: formattedContent
        });
      }
      
      const postResult = await twitterService.postTweet(formattedContent);
      
      res.json({
        success: postResult.success,
        message: postResult.message,
        content: formattedContent
      });
    } catch (error: unknown) {
      console.error('Error in test-tweet endpoint:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });

  // Test blog post endpoint
  app.post('/api/test-blog-post', async (req: Request, res: Response) => {
    try {
      const dryRun = req.body.dryRun !== false; // Default to true for safety
      
      // Manually check for blog posts ready to tweet
      const supabaseService = SupabaseService.getInstance();
      const { data: blogPosts, error } = await supabaseService.client
        .from('blog_posts')
        .select('*')
        .eq('status', 'ready_to_tweet')
        .order('created_at', { ascending: true })
        .limit(5);
        
      if (error) {
        console.error('Error fetching blog posts:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch blog posts from database'
        });
      }
      
      if (blogPosts.length === 0) {
        return res.json({
          success: true,
          message: 'No blog posts found with "ready_to_tweet" status',
          posts: []
        });
      }
      
      const results = [];
      
      for (const post of blogPosts) {
        if (dryRun) {
          results.push({
            id: post.id,
            title: post.title,
            status: 'would_post',
            message: `Would post: ${post.title}`
          });
        } else {
          // Actually post the blog post
          try {
            const twitterService = TwitterService.getInstance();
            const tweetText = `${post.title}\n\n${post.excerpt || 'New blog post available!'}\n\nRead more: ${post.post_url || 'Link coming soon'}`;
            
            const postResult = await twitterService.postTweet({
              text: tweetText,
              platform: 'Twitter'
            });
            
            if (postResult.success) {
              // Update blog post status
              await supabaseService.client
                .from('blog_posts')
                .update({ status: 'posted' })
                .eq('id', post.id);
                
              results.push({
                id: post.id,
                title: post.title,
                status: 'success',
                message: 'Posted successfully'
              });
            } else {
              results.push({
                id: post.id,
                title: post.title,
                status: 'error',
                error: postResult.message
              });
            }
          } catch (error: unknown) {
            results.push({
              id: post.id,
              title: post.title,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }
      
      res.json({
        success: true,
        message: dryRun 
          ? `Found ${blogPosts.length} blog post(s) ready to tweet (dry run)` 
          : `Processed ${blogPosts.length} blog post(s)`,
        posts: results
      });
    } catch (error: unknown) {
      console.error('Error in test-blog-post endpoint:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
  
  // Get categories endpoint
  app.get('/api/categories', (req: Request, res: Response) => {
    const categories = [
      'Drip Drop',
      'Toolbox',
      'Neural Notes',
      'Field Notes',
      'Push Lab',
      'News'
    ];
    res.json({ categories });
  });
  
  // Status endpoint
  app.get('/api/status', (req: Request, res: Response) => {
    const now = new Date();
    const morningTime = new Date(now);
    morningTime.setHours(9, 0, 0, 0);
    
    const eveningTime = new Date(now);
    eveningTime.setHours(17, 0, 0, 0);
    
    let nextTweetTime: Date;
    if (now < morningTime) {
      nextTweetTime = morningTime;
    } else if (now < eveningTime) {
      nextTweetTime = eveningTime;
    } else {
      nextTweetTime = new Date(morningTime);
      nextTweetTime.setDate(nextTweetTime.getDate() + 1);
    }
    
    res.json({
      status: 'running',
      currentTime: now.toISOString(),
      nextScheduledTweet: nextTweetTime.toISOString(),
      timeUntilNextTweet: nextTweetTime.getTime() - now.getTime()
    });
  });
  
  // Main HTML page
  app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
  
  // Start the server
  app.listen(PORT, () => {
    console.log(`Web interface running at http://localhost:${PORT}`);
  });
  
  return app;
}
