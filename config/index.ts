import dotenv from 'dotenv';
import { TwitterConfig } from '../types';

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
    }
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
