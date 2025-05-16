import dotenv from 'dotenv';
import { TwitterConfig, BlogPostSchedulerConfig } from '../types';

dotenv.config();

export const config = {
    twitter: {
        apiKey: process.env.TWITTER_API_KEY || '',
        apiSecret: process.env.TWITTER_API_SECRET || '',
        accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
        accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || '',
        bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
    } as TwitterConfig,
    supabase: {
        url: process.env.SUPABASE_URL || '',
        key: process.env.SUPABASE_KEY || '',
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
    },
    anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY || '',
    },
    grok: {
        apiKey: process.env.GROK_API_KEY || '',
        apiEndpoint: process.env.GROK_API_ENDPOINT || 'https://api.grok.x/v1/chat/completions',
    },
    blogPostScheduler: {
        enabled: process.env.BLOG_POST_SCHEDULER_ENABLED === 'true',
        scheduleDays: [1, 4], // Monday and Thursday
        scheduleHour: parseInt(process.env.BLOG_POST_SCHEDULER_HOUR || '10', 10),
        scheduleMinute: parseInt(process.env.BLOG_POST_SCHEDULER_MINUTE || '0', 10),
        useXArticles: false, // Set to true when X Articles API becomes available
        dryRun: process.env.BLOG_POST_SCHEDULER_DRY_RUN === 'true',
        updateStatusInDryRun: false,
        notifications: {
            enabled: false
        }
    } as BlogPostSchedulerConfig
};

// Validate required environment variables
const requiredEnvVars = [
    'TWITTER_API_KEY',
    'TWITTER_API_SECRET',
    'TWITTER_ACCESS_TOKEN',
    'TWITTER_ACCESS_TOKEN_SECRET',
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY'
    // Note: GROK_API_KEY is optional and will fall back to OpenAI if not provided
];

requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
});
