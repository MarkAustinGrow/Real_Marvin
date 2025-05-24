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

export function startWebServer() {
  const app = express();
  const PORT = process.env.WEB_PORT || 3000;
  
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
  
  // API endpoints
  app.post('/api/generate-blog-post', async (req: Request, res: Response) => {
    try {
      const theme = req.body.theme || 'technology';
      const useMemory = req.body.useMemory !== false; // Default to true
      const dryRun = req.body.dryRun === true;
      
      const contentGenerator = ContentGenerator.getInstance();
      await contentGenerator.initialize();
      
      // Generate the blog post
      const blogPost = await contentGenerator.generateBlogPost(theme, useMemory);
      
      // Debug log to see what's coming from the generator
      console.log('Blog post to save:', {
        title: blogPost.title,
        excerptLength: blogPost.excerpt ? blogPost.excerpt.length : 0,
        excerpt: blogPost.excerpt,
        contentLength: blogPost.content.length
      });
      
      // If not a dry run, save to database
      if (!dryRun) {
        const supabaseService = SupabaseService.getInstance();
        const { data, error } = await supabaseService.client
          .from('blog_posts')
          .insert({
            title: blogPost.title,
            markdown: blogPost.content,
            excerpt: blogPost.excerpt,
            status: req.body.status || 'draft', // Default to draft
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
        
        // Enhance the blog post with missing fields
        console.log('Enhancing blog post with missing fields...');
        const enhancer = new BlogPostEnhancer();
        await enhancer.enhanceBlogPost(data.id);
        
        // Return success with blog post and ID
        return res.json({
          success: true,
          message: 'Blog post generated, saved, and enhanced successfully',
          blogPost,
          id: data.id,
          status: req.body.status || 'draft'
        });
      }
      
      // Return success for dry run
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
  
  app.post('/api/test-blog-post', async (req: Request, res: Response) => {
    try {
      console.log('Testing blog post...');
      
      // Get dry run option from request
      const dryRun = req.body.dryRun === true;
      console.log(`Dry run mode: ${dryRun}`);
      
      // Access the private method using type assertion
      const scheduler = blogPostScheduler as any;
      
      // Store original dry run setting
      const originalDryRun = scheduler.config?.blogPostScheduler?.dryRun;
      
      // Set dry run mode if requested
      if (scheduler.config && scheduler.config.blogPostScheduler) {
        scheduler.config.blogPostScheduler.dryRun = dryRun;
        scheduler.config.blogPostScheduler.updateStatusInDryRun = dryRun;
      }
      
      // Create a variable to capture processed posts
      let processedPosts: any[] = [];
      
      // Override the processBlogPost method temporarily to capture results
      const originalProcessMethod = scheduler.processBlogPost;
      scheduler.processBlogPost = async function(post: any) {
        processedPosts.push({
          id: post.id,
          title: post.title,
          status: 'processing'
        });
        
        try {
          await originalProcessMethod.call(this, post);
          // Update status to success
          const postIndex = processedPosts.findIndex(p => p.id === post.id);
          if (postIndex >= 0) {
            processedPosts[postIndex].status = 'success';
          }
        } catch (error: any) {
          // Update status to error
          const postIndex = processedPosts.findIndex(p => p.id === post.id);
          if (postIndex >= 0) {
            processedPosts[postIndex].status = 'error';
            processedPosts[postIndex].error = error.message;
          }
          throw error;
        }
      };
      
      // Run the blog post check
      try {
        await scheduler.checkAndPostBlogPosts();
      } finally {
        // Restore original methods and settings
        scheduler.processBlogPost = originalProcessMethod;
        
        // Restore original dry run setting
        if (scheduler.config && scheduler.config.blogPostScheduler) {
          scheduler.config.blogPostScheduler.dryRun = originalDryRun;
          scheduler.config.blogPostScheduler.updateStatusInDryRun = originalDryRun;
        }
      }
      
      // Return results
      res.json({
        success: true,
        dryRun: dryRun,
        message: processedPosts.length > 0 
          ? `Processed ${processedPosts.length} blog post(s)` 
          : 'No blog posts found with ready_to_tweet status',
        posts: processedPosts
      });
    } catch (error: unknown) {
      console.error('Error in test-blog-post endpoint:', error);
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
      
      // If preview only, don't post
      if (req.body.previewOnly) {
        return res.json({
          success: true,
          preview: true,
          content: formattedContent
        });
      }
      
      // Post the tweet
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
  
  // Blog post enhancement endpoint
  app.post('/api/enhance-blog-posts', async (req: Request, res: Response) => {
    try {
      const postId = req.body.postId; // Optional post ID to enhance a specific post
      const enhancer = new BlogPostEnhancer();
      
      if (postId) {
        // Enhance a specific blog post
        console.log(`Enhancing blog post with ID: ${postId}`);
        const success = await enhancer.enhanceBlogPost(postId);
        
        return res.json({
          success,
          message: success 
            ? `Successfully enhanced blog post with ID: ${postId}` 
            : `Failed to enhance blog post with ID: ${postId}`
        });
      } else {
        // Enhance all blog posts that need enhancement
        console.log('Enhancing all blog posts that need enhancement');
        await enhancer.processAllPosts();
        
        return res.json({
          success: true,
          message: 'Blog post enhancement process completed'
        });
      }
    } catch (error: unknown) {
      console.error('Error in enhance-blog-posts endpoint:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
  
  // Engagement rules endpoints
  app.get('/api/engagement/rules', (req: Request, res: Response) => {
    try {
      const engagementService = EngagementService.getInstance();
      res.json({ rules: engagementService.getRules() });
    } catch (error: unknown) {
      console.error('Error getting engagement rules:', error);
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
  
  // Enhanced accounts endpoint with quality metrics
  app.get('/api/account-monitor/accounts-enhanced', async (req: Request, res: Response) => {
    try {
      const accountMonitorService = AccountMonitorService.getInstance();
      const apiLogger = ApiCallLogger.getInstance();
      
      // Get all accounts
      const accounts = await accountMonitorService.getAllAccounts();
      
      // Get API usage stats
      const apiUsage = await accountMonitorService.checkApiUsage();
      
      // Calculate quality metrics for each account
      const enhancedAccounts = await Promise.all(accounts.map(async (account) => {
        const tweets = await accountMonitorService.getCachedTweets(account.id);
        
        // Calculate quality metrics
        const avgEngagement = tweets.length > 0 
          ? tweets.reduce((sum, tweet) => sum + tweet.engagement_score, 0) / tweets.length 
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
  
  // API usage stats endpoint
  app.get('/api/account-monitor/api-usage', async (req: Request, res: Response) => {
    try {
      const accountMonitorService = AccountMonitorService.getInstance();
      const apiLogger = ApiCallLogger.getInstance();
      
      // Get current usage
      const currentUsage = await accountMonitorService.checkApiUsage();
      
      // Get today's detailed stats
      const todayStats = await apiLogger.getTodayUsageStats();
      
      // Get recent usage history (last 7 days)
      const recentStats = await apiLogger.getRecentUsageStats(7);
      
      res.json({
        success: true,
        currentUsage,
        todayStats,
        recentStats
      });
    } catch (error: unknown) {
      console.error('Error getting API usage:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
  
  app.post('/api/account-monitor/add', express.json(), async (req: Request, res: Response) => {
    try {
      const { handle, priority, activityLevel } = req.body;
      
      if (!handle) {
        return res.status(400).json({
          success: false,
          message: 'Handle is required'
        });
      }
      
      const accountMonitorService = AccountMonitorService.getInstance();
      const accountId = await accountMonitorService.addAccount(
        handle,
        priority || 3,
        activityLevel || 'medium'
      );
      
      if (accountId) {
        res.json({
          success: true,
          message: `Account @${handle} added successfully`,
          accountId
        });
      } else {
        res.status(400).json({
          success: false,
          message: `Failed to add account @${handle}`
        });
      }
    } catch (error: unknown) {
      console.error('Error adding account:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
  
  app.post('/api/account-monitor/remove', express.json(), async (req: Request, res: Response) => {
    try {
      const { accountId } = req.body;
      
      if (!accountId) {
        return res.status(400).json({
          success: false,
          message: 'Account ID is required'
        });
      }
      
      const accountMonitorService = AccountMonitorService.getInstance();
      const success = await accountMonitorService.removeAccount(accountId);
      
      if (success) {
        res.json({
          success: true,
          message: `Account removed successfully`
        });
      } else {
        res.status(400).json({
          success: false,
          message: `Failed to remove account`
        });
      }
    } catch (error: unknown) {
      console.error('Error removing account:', error);
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
  
  app.get('/api/account-monitor/tweets/:accountId', async (req: Request, res: Response) => {
    try {
      const accountId = parseInt(req.params.accountId);
      
      if (isNaN(accountId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid account ID'
        });
      }
      
      const accountMonitorService = AccountMonitorService.getInstance();
      const tweets = await accountMonitorService.getCachedTweets(accountId);
      
      res.json({
        success: true,
        tweets
      });
    } catch (error: unknown) {
      console.error('Error getting tweets:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
  
  app.post('/api/account-monitor/fetch-tweets', express.json(), async (req: Request, res: Response) => {
    try {
      const { accountId, count } = req.body;
      
      if (!accountId) {
        return res.status(400).json({
          success: false,
          message: 'Account ID is required'
        });
      }
      
      const accountMonitorService = AccountMonitorService.getInstance();
      
      // Get the account
      const accounts = await accountMonitorService.getAllAccounts();
      const account = accounts.find(a => a.id === accountId);
      
      if (!account) {
        return res.status(404).json({
          success: false,
          message: `Account with ID ${accountId} not found`
        });
      }
      
      // Fetch and cache tweets
      const success = await accountMonitorService.fetchAndCacheTweets(
        account,
        count || 10,
        true,
        true
      );
      
      if (success) {
        // Get the cached tweets
        const tweets = await accountMonitorService.getCachedTweets(accountId);
        
        res.json({
          success: true,
          message: `Fetched tweets for account @${account.handle}`,
          tweets
        });
      } else {
        res.status(400).json({
          success: false,
          message: `Failed to fetch tweets for account @${account.handle}`
        });
      }
    } catch (error: unknown) {
      console.error('Error fetching tweets:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
  
  app.post('/api/account-monitor/process', express.json(), async (req: Request, res: Response) => {
    try {
      const { batchSize } = req.body;
      
      const accountMonitorService = AccountMonitorService.getInstance();
      const count = await accountMonitorService.processAccounts(batchSize || 10);
      
      res.json({
        success: true,
        message: `Processed ${count} accounts successfully`
      });
    } catch (error: unknown) {
      console.error('Error processing accounts:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
  
  app.post('/api/engagement/rules', express.json(), (req: Request, res: Response) => {
    try {
      const engagementService = EngagementService.getInstance();
      engagementService.updateRules(req.body.rules);
      res.json({ success: true, message: 'Rules updated successfully' });
    } catch (error: unknown) {
      console.error('Error updating engagement rules:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
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
