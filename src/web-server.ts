import express, { Request, Response } from 'express';
import path from 'path';
import basicAuth from 'express-basic-auth';
import { TwitterService } from '../services/twitter/TwitterService';
import { ContentGenerator } from '../services/content/ContentGenerator';
import { EngagementService } from '../services/engagement/EngagementService';

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
