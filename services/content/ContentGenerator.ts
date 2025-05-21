import { SupabaseService, CharacterData } from '../supabase/SupabaseService';
import { OpenAIService } from '../openai/OpenAIService';
import { AnthropicService } from '../anthropic/AnthropicService';
import { PostContent } from '../../types';
import MemoryService from '../memory/MemoryService';
import { config } from '../../config';

export class ContentGenerator {
    private static instance: ContentGenerator;
    private characterData: CharacterData | null = null;
    private openAIService: OpenAIService;
    private memoryService: typeof MemoryService;
    private saveToMemory: boolean;

    private constructor() {
        this.openAIService = OpenAIService.getInstance();
        this.memoryService = MemoryService;
        this.saveToMemory = process.env.SAVE_OUTPUT_TO_MEMORY === 'true';
    }

    public static getInstance(): ContentGenerator {
        if (!ContentGenerator.instance) {
            ContentGenerator.instance = new ContentGenerator();
        }
        return ContentGenerator.instance;
    }

    /**
     * Initializes the content generator with character data
     */
    public async initialize(): Promise<void> {
        const supabaseService = SupabaseService.getInstance();
        this.characterData = await supabaseService.getCharacterData('marvin');
    }

    /**
     * Generates a tweet based on Marvin's character
     * @param category Optional category for the tweet
     * @returns Generated tweet content
     */
    public async generateTweet(category?: string): Promise<PostContent> {
        if (!this.characterData) {
            await this.initialize();
        }

        const character = this.characterData!;
        const usedCategory = category || 'general';
        
        // Retrieve relevant memories for this category
        const relevantMemories = await this.getRelevantMemories(usedCategory);
        
        // Generate tweet text using OpenAI with memories
        const text = await this.openAIService.generateTweetContent(
            character, 
            usedCategory,
            relevantMemories
        );
        
        // No longer generating hashtags as per team preference
        const content = {
            text,
            hashtags: [], // Empty array instead of generating hashtags
            platform: 'twitter',
            category: usedCategory
        };

        // Store the generated tweet as a memory if enabled
        if (this.saveToMemory) {
            await this.storeContentAsMemory(content);
        }

        return content;
    }

    /**
     * Retrieves relevant memories based on category or topic
     * @param category The category or topic to search for
     * @returns Array of relevant memory strings
     */
    private async getRelevantMemories(category: string): Promise<string[]> {
        try {
            // Search for memories related to the category
            const memories = await this.memoryService.searchMemories(category);
            
            // Format memories for inclusion in prompts
            return memories.map((memory: any) => memory.content).slice(0, 3);
        } catch (error) {
            console.error('Error retrieving memories:', error);
            return [];
        }
    }

    /**
     * Stores generated content as a memory
     * @param content The content to store
     */
    /**
     * Generates a blog post based on Marvin's character and optional theme
     * @param theme Optional theme for the blog post
     * @param useMemory Whether to include memories in the generation
     * @returns Generated blog post with title, content, and excerpt
     */
    public async generateBlogPost(theme: string = 'technology', useMemory: boolean = true): Promise<{
        title: string;
        content: string;
        excerpt: string;
    }> {
        if (!this.characterData) {
            await this.initialize();
        }

        const character = this.characterData!;
        
        // Retrieve relevant memories if enabled
        const memories: string[] = [];
        if (useMemory) {
            const relevantMemories = await this.getRelevantMemories(theme);
            memories.push(...relevantMemories);
        }
        
        // Generate blog post using Anthropic Claude
        const anthropicService = AnthropicService.getInstance();
        const response = await anthropicService.generateBlogPost(
            character,
            theme,
            memories
        );
        
        // Store the generated blog post as a memory if enabled
        if (this.saveToMemory) {
            await this.storeBlogAsMemory(response.title, response.excerpt, theme);
        }
        
        return response;
    }

    /**
     * Stores generated blog post as a memory
     * @param title The blog post title
     * @param excerpt The blog post excerpt
     * @param theme The blog post theme
     */
    private async storeBlogAsMemory(title: string, excerpt: string, theme: string): Promise<void> {
        try {
            await this.memoryService.addMemory({
                type: "output",
                content: excerpt,
                tags: ["blog", `theme:${theme}`],
                metadata: {
                    source: "blog_post",
                    title: title,
                    format: "markdown",
                    alignment_score: 0.95
                }
            });
        } catch (error) {
            console.error('Error storing blog post as memory:', error);
        }
    }

    private async storeContentAsMemory(content: PostContent): Promise<void> {
        try {
            await this.memoryService.addMemory({
                type: 'tweet',
                content: content.text,
                tags: [...(content.hashtags || []), content.category || 'general'],
                metadata: {
                    platform: content.platform,
                    category: content.category,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Error storing content as memory:', error);
        }
    }

    private generateHashtags(character: CharacterData, category?: string): string[] {
        const hashtags = new Set<string>();

        // Add category hashtag if provided
        if (category) {
            hashtags.add(category.replace(/\s+/g, ''));
        }

        // Add topic hashtags (up to 2 random topics)
        const topics = [...character.content.topics];
        for (let i = 0; i < 2 && topics.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * topics.length);
            const topic = topics.splice(randomIndex, 1)[0];
            hashtags.add(topic.replace(/\s+/g, ''));
        }

        // Add some standard hashtags
        hashtags.add('AI');
        hashtags.add('Tech');
        hashtags.add('Innovation');

        return Array.from(hashtags);
    }
}
