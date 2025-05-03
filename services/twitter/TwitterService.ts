import { TwitterApi } from 'twitter-api-v2';
import { config } from '../../config';
import { PostContent } from '../../types';

export class TwitterService {
    private client: TwitterApi;
    private static instance: TwitterService;

    private constructor() {
        this.client = new TwitterApi({
            appKey: config.twitter.apiKey,
            appSecret: config.twitter.apiSecret,
            accessToken: config.twitter.accessToken,
            accessSecret: config.twitter.accessTokenSecret,
        });
    }

    public static getInstance(): TwitterService {
        if (!TwitterService.instance) {
            TwitterService.instance = new TwitterService();
        }
        return TwitterService.instance;
    }

    /**
     * Posts content to Twitter with optional media
     * @param content The content to post
     * @param mediaIds Optional array of media IDs to attach
     * @returns Object containing success status and any error information
     */
    public async postTweet(content: PostContent, mediaIds?: string[]): Promise<{ success: boolean; error?: any; message?: string }> {
        try {
            const tweetOptions: any = {
                text: content.text,
            };

            if (mediaIds && mediaIds.length > 0) {
                tweetOptions.media = { media_ids: mediaIds };
            }

            const result = await this.client.v2.tweet(tweetOptions);
            return { 
                success: true, 
                message: `Tweet posted successfully with ID: ${result.data.id}` 
            };
        } catch (error: any) {
            console.error('Error posting tweet:', error);
            
            // Handle different types of errors
            if (error.code === 401) {
                return { 
                    success: false, 
                    error, 
                    message: 'Authentication failed. Please check your Twitter API credentials.' 
                };
            } else if (error.code === 403) {
                return { 
                    success: false, 
                    error, 
                    message: 'Permission denied. Your Twitter app may not have write permissions or the account may be restricted.' 
                };
            } else if (error.code === 429) {
                return { 
                    success: false, 
                    error, 
                    message: 'Rate limit exceeded. Please try again later.' 
                };
            } else {
                return { 
                    success: false, 
                    error, 
                    message: `Failed to post tweet: ${error.message || 'Unknown error'}` 
                };
            }
        }
    }


    /**
     * Uploads media to Twitter
     * @param mediaPath Path to the media file
     * @returns Media ID string
     */
    public async uploadMedia(mediaPath: string): Promise<string> {
        try {
            console.log(`Uploading media from path: ${mediaPath}`);
            const mediaId = await this.client.v1.uploadMedia(mediaPath);
            console.log(`Media uploaded successfully with ID: ${mediaId}`);
            return mediaId;
        } catch (error) {
            console.error('Error uploading media:', error);
            throw new Error('Failed to upload media');
        }
    }

    /**
     * Formats content according to Twitter's requirements
     * @param content Raw content to format
     * @returns Formatted content ready for Twitter
     */
    public formatContent(content: PostContent): PostContent {
        // Ensure content meets Twitter's character limit
        const maxLength = 280;
        let formattedText = content.text;

        if (formattedText.length > maxLength) {
            formattedText = formattedText.substring(0, maxLength - 3) + '...';
        }

        // Add hashtags if they're not already present
        if (content.hashtags && content.hashtags.length > 0) {
            const hashtagString = content.hashtags
                .map(tag => `#${tag.replace('#', '')}`)
                .join(' ');
            
            if (!formattedText.includes(hashtagString)) {
                formattedText += `\n\n${hashtagString}`;
            }
        }

        return {
            ...content,
            text: formattedText
        };
    }
}
