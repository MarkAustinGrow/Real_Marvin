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

export interface BlogPostSchedulerConfig {
    enabled: boolean;
    scheduleDays: number[]; // Days of the week (0-6, where 0 is Sunday)
    scheduleHour: number;
    scheduleMinute: number;
    useXArticles: boolean;
    dryRun: boolean;
    updateStatusInDryRun: boolean;
    notifications: {
        enabled: boolean;
    };
}

export interface AccountMonitorConfig {
    enabled: boolean;
    batchSize: number;
    intervalMinutes: number;
    includeReplies: boolean;
    includeRetweets: boolean;
    tweetsPerAccount: number;
}
