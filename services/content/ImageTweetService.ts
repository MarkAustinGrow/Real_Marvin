import { SupabaseService } from '../supabase/SupabaseService';
import { AnthropicService } from '../anthropic/AnthropicService';
import { TwitterService } from '../twitter/TwitterService';
import { PostContent } from '../../types';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class ImageTweetService {
    private static instance: ImageTweetService;
    private supabaseService: SupabaseService;
    private anthropicService: AnthropicService;
    private twitterService: TwitterService;

    private constructor() {
        this.supabaseService = SupabaseService.getInstance();
        this.anthropicService = AnthropicService.getInstance();
        this.twitterService = TwitterService.getInstance();
    }

    public static getInstance(): ImageTweetService {
        if (!ImageTweetService.instance) {
            ImageTweetService.instance = new ImageTweetService();
        }
        return ImageTweetService.instance;
    }

    /**
     * Generates and posts a tweet with Marvin's artwork
     */
    public async generateAndPostImageTweet(): Promise<boolean> {
        try {
            // 1. Get a random image from the database
            const image = await this.getRandomImage();
            if (!image) {
                console.log('No images found in the database');
                return false;
            }

            // 2. Get the prompt associated with the image
            const prompt = await this.getPromptById(image.prompt_id);
            if (!prompt) {
                console.log(`No prompt found for image ID: ${image.id}`);
                return false;
            }

            // 3. Generate tweet text based on the prompt and image
            const tweetText = await this.generateTweetTextForImage(prompt.text);

            // 4. Create tweet content
            const tweetContent: PostContent = {
                text: tweetText,
                hashtags: ['AI', 'Art', 'AIArt', 'Marvin'],
                platform: 'twitter',
                category: 'Art'
            };

            // 5. Format the content for Twitter
            const formattedContent = this.twitterService.formatContent(tweetContent);

            console.log('\n--- Generated Image Tweet Content ---');
            console.log(formattedContent.text);
            console.log(`Image URL: ${image.image_url}`);
            console.log('-------------------------------\n');

            // 6. Download the image from URL and upload to Twitter
            console.log('Downloading image from URL...');
            const tempImagePath = await this.downloadImage(image.image_url);
            console.log(`Image downloaded to temporary path: ${tempImagePath}`);
            
            // 7. Upload the image to Twitter
            const mediaId = await this.twitterService.uploadMedia(tempImagePath);
            
            // 8. Clean up the temporary file
            try {
                fs.unlinkSync(tempImagePath);
                console.log('Temporary image file cleaned up');
            } catch (cleanupError) {
                console.error('Error cleaning up temporary file:', cleanupError);
                // Continue with the process even if cleanup fails
            }

            // 7. Post the tweet with the image
            const postResult = await this.twitterService.postTweet(formattedContent, [mediaId]);

            if (postResult.success) {
                console.log(`✅ ${postResult.message}`);
                // Mark the image as posted to prevent reposting
                await this.markImageAsPosted(image.id);
                console.log(`Image ${image.id} marked as posted to prevent future duplication`);
            } else {
                console.log(`\n❌ ERROR: Image tweet could not be posted to Twitter`);
                console.log(`Error details: ${postResult.message}`);
            }

            return postResult.success;
        } catch (error) {
            console.error('Error generating or posting image tweet:', error);
            return false;
        }
    }

    /**
     * Downloads an image from a URL to a temporary file
     * @param url URL of the image to download
     * @returns Path to the temporary file
     */
    private async downloadImage(url: string): Promise<string> {
        try {
            // Create a temporary file path
            const tempPath = path.join(os.tmpdir(), `marvin_temp_${Date.now()}.png`);
            const writer = fs.createWriteStream(tempPath);
            
            // Download the image
            const response = await axios({
                url,
                method: 'GET',
                responseType: 'stream'
            });
            
            // Pipe the image data to the file
            response.data.pipe(writer);
            
            // Return a promise that resolves when the file is written
            return new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(tempPath));
                writer.on('error', (err) => {
                    fs.unlink(tempPath, () => {}); // Delete the file if there's an error
                    reject(err);
                });
            });
        } catch (error) {
            console.error('Error downloading image:', error);
            throw new Error('Failed to download image');
        }
    }

    /**
     * Gets a random image from the database
     */
    private async getRandomImage() {
        try {
            // Query for images that have an image_url (since we need this to upload to Twitter)
            // and haven't been posted yet (x_posted = false)
            const { data, error } = await this.supabaseService.client
                .from('images')
                .select('*')
                .not('image_url', 'is', null)
                .eq('x_posted', false)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                console.error('Error fetching images:', error);
                return null;
            }

            if (!data || data.length === 0) {
                return null;
            }

            // Select a random image from the most recent 10
            return data[Math.floor(Math.random() * data.length)];
        } catch (error) {
            console.error('Error in getRandomImage:', error);
            return null;
        }
    }

    /**
     * Gets a prompt by ID
     */
    private async getPromptById(promptId: string) {
        try {
            const { data, error } = await this.supabaseService.client
                .from('prompts')
                .select('*')
                .eq('id', promptId)
                .single();

            if (error) {
                console.error('Error fetching prompt:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error in getPromptById:', error);
            return null;
        }
    }

    /**
     * Marks an image as posted in the database
     * @param imageId The ID of the image to mark as posted
     * @returns Whether the operation was successful
     */
    private async markImageAsPosted(imageId: string): Promise<boolean> {
        try {
            const { error } = await this.supabaseService.client
                .from('images')
                .update({ x_posted: true })
                .eq('id', imageId);
                
            if (error) {
                console.error('Error marking image as posted:', error);
                return false;
            }
            
            console.log(`Image ${imageId} marked as posted`);
            return true;
        } catch (error) {
            console.error('Error in markImageAsPosted:', error);
            return false;
        }
    }

    /**
     * Generates tweet text for an image based on the prompt
     */
    private async generateTweetTextForImage(promptText: string): Promise<string> {
        // Use Anthropic Claude to generate a tweet based on the prompt
        try {
            return await this.anthropicService.generateTweet(promptText);
        } catch (error) {
            console.error('Error generating tweet text for image:', error);
            return `Check out my latest digital creation. #AI #Art`;
        }
    }
}
