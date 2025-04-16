import { SupabaseService, CharacterData } from '../supabase/SupabaseService';
import { OpenAIService } from '../openai/OpenAIService';
import { PostContent } from '../../types';

export class ContentGenerator {
    private static instance: ContentGenerator;
    private characterData: CharacterData | null = null;
    private openAIService: OpenAIService;

    private constructor() {
        this.openAIService = OpenAIService.getInstance();
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
        
        // Generate tweet text using OpenAI
        const text = await this.openAIService.generateTweetContent(character, category || 'general');
        
        // Generate relevant hashtags
        const hashtags = this.generateHashtags(character, category);

        return {
            text,
            hashtags,
            platform: 'twitter',
            category
        };
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