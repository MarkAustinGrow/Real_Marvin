import express, { Request, Response } from 'express';
import path from 'path';
import basicAuth from 'express-basic-auth';
import { TwitterService } from '../services/twitter/TwitterService';
import { ContentGenerator } from '../services/content/ContentGenerator';
import { EngagementService } from '../services/engagement/EngagementService';
import { blogPostScheduler } from './blog-post-scheduler';
import { SupabaseService } from '../services/supabase/SupabaseService';

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
        
        // Return success with blog post and ID
        return res.json({
          success: true,
          message: 'Blog post generated and saved successfully',
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
