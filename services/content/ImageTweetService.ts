import { SupabaseService } from '../supabase/SupabaseService';
import { AnthropicService } from '../anthropic/AnthropicService';
import { TwitterService } from '../twitter/TwitterService';
import { PostContent } from '../../types';
import MemoryService from '../memory/MemoryService';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class ImageTweetService {
    private static instance: ImageTweetService;
    private supabaseService: SupabaseService;
    private anthropicService: AnthropicService;
    private twitterService: TwitterService;
    private memoryService: typeof MemoryService;
    private saveToMemory: boolean;

    private constructor() {
        this.supabaseService = SupabaseService.getInstance();
        this.anthropicService = AnthropicService.getInstance();
        this.twitterService = TwitterService.getInstance();
        this.memoryService = MemoryService;
        this.saveToMemory = process.env.SAVE_OUTPUT_TO_MEMORY === 'true';
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

            // 3. Get relevant memories for this prompt
            const relevantMemories = await this.getRelevantMemories(prompt.text);
            
            // 4. Generate tweet text based on the prompt, image, and memories
            const tweetText = await this.generateTweetTextForImage(prompt.text, relevantMemories);

            // 4. Create tweet content
            const tweetContent: PostContent = {
                text: tweetText,
                hashtags: [], // Removed hashtags as per team preference
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
                
                // Store the tweet as a memory if enabled
                if (this.saveToMemory) {
                    await this.storeImageTweetAsMemory(tweetContent, image.image_url, prompt.text);
                    console.log('Image tweet stored in memory system');
                }
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
     * Retrieves relevant memories based on prompt text
     * @param promptText The prompt text to search for relevant memories
     * @returns Array of relevant memory strings
     */
    private async getRelevantMemories(promptText: string): Promise<string[]> {
        try {
            // Search for memories related to the prompt
            const memories = await this.memoryService.searchMemories(promptText);
            
            // Format memories for inclusion in prompts
            return memories.map((memory: any) => memory.content).slice(0, 3);
        } catch (error) {
            console.error('Error retrieving memories:', error);
            return [];
        }
    }

    /**
     * Stores an image tweet as a memory
     * @param content The tweet content
     * @param imageUrl The URL of the image
     * @param promptText The original prompt text
     */
    private async storeImageTweetAsMemory(
        content: PostContent, 
        imageUrl: string, 
        promptText: string
    ): Promise<void> {
        try {
            await this.memoryService.addMemory({
                type: 'tweet',  // Changed from 'image_tweet' to 'tweet' which is a valid memory type
                content: content.text,
                source: imageUrl,
                tags: [...(content.hashtags || []), 'image', 'art'],
                metadata: {
                    platform: content.platform,
                    prompt: promptText,
                    image_url: imageUrl,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Error storing image tweet as memory:', error);
        }
    }

    /**
     * Generates tweet text for an image based on the prompt and memories
     * @param promptText The prompt text to base the tweet on
     * @param memories Optional array of relevant memories
     * @returns Generated tweet text
     */
    private async generateTweetTextForImage(
        promptText: string, 
        memories: string[] = []
    ): Promise<string> {
        // Use Anthropic Claude to generate a tweet based on the prompt and memories
        try {
            // If we have memories, we need to include them in the prompt
            if (memories.length > 0) {
                const memoryContext = `
                Consider these memories as you craft your response:
                ${memories.map(m => `- "${m}"`).join('\n')}
                `;
                promptText = `${promptText}\n\n${memoryContext}`;
            }
            
            return await this.anthropicService.generateTweet(promptText);
        } catch (error) {
            console.error('Error generating tweet text for image:', error);
            return `Check out my latest digital creation.`;
        }
    }
}
