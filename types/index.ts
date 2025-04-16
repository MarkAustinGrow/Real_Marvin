export interface PostContent {
    text: string;
    hashtags?: string[];
    mediaUrls?: string[];
    platform?: string;
    category?: string;
}

export interface TwitterConfig {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessTokenSecret: string;
    bearerToken?: string;
}

export interface SocialMediaPost {
    content: PostContent;
    mediaPaths?: string[];
    scheduledTime?: Date;
    platforms: string[];
} 