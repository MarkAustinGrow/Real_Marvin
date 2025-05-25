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
  const publicDir = path.resolve(__dirname, 'public');
  console.log('Public directory path:', publicDir);
  
  // Serve static files
  app.use(express.static(publicDir));
  
  // Parse JSON bodies
  app.use(express.json());
  
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
  
  // Engagement rules endpoint
  app.get('/api/engagement/rules', async (req: Request, res: Response) => {
    try {
      const supabaseService = SupabaseService.getInstance();
      const { data, error } = await supabaseService.client
        .from('engagement_rules')
        .select('rules')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        console.error('Error fetching engagement rules:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch engagement rules'
        });
      }
      
      res.json({ 
        success: true,
        rules: data?.rules || []
      });
    } catch (error: unknown) {
      console.error('Error getting engagement rules:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
  
  // Bulk update accounts endpoint
  app.post('/api/account-monitor/bulk-update', async (req: Request, res: Response) => {
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
  
  app.post('/api/account-monitor/update', async (req: Request, res: Response) => {
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
  
  // Serve specific HTML files
  app.get('/account-priority-manager.html', (req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, 'account-priority-manager.html'));
  });
  
  // Main HTML page
  app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
  
  // Fallback for any other routes - serve index.html
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
  
  // Start the server
  app.listen(PORT, () => {
    console.log(`Complete web interface running at http://localhost:${PORT}`);
    console.log(`Account Priority Manager available at http://localhost:${PORT}/account-priority-manager.html`);
  });
  
  return app;
}
