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
    'OPENAI_API_KEY'
];

requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}); 