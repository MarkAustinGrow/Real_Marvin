import { Configuration, OpenAIApi } from 'openai';
import { config } from '../../config';
import { CharacterData } from '../supabase/SupabaseService';

export class OpenAIService {
    private openai: OpenAIApi;
    private static instance: OpenAIService;

    private constructor() {
        const configuration = new Configuration({
            apiKey: config.openai.apiKey,
        });
        this.openai = new OpenAIApi(configuration);
    }

    public static getInstance(): OpenAIService {
        if (!OpenAIService.instance) {
            OpenAIService.instance = new OpenAIService();
        }
        return OpenAIService.instance;
    }

    /**
     * Generates a tweet using OpenAI based on character data and category
     * @param characterData Marvin's character data
     * @param category The tweet category
     * @returns Generated tweet text
     */
    public async generateTweetContent(characterData: CharacterData, category: string): Promise<string> {
        try {
            const prompt = this.buildPrompt(characterData, category);
            
            // Try using createChatCompletion instead of createCompletion for GPT models
            const response = await this.openai.createChatCompletion({
                model: "gpt-3.5-turbo", // Fallback to GPT-3.5 Turbo which is more widely available
                messages: [
                    { role: "system", content: prompt }
                ],
                max_tokens: 100,
                temperature: 0.7,
                top_p: 1,
                frequency_penalty: 0.5,
                presence_penalty: 0.5,
            });

            return response.data.choices[0].message?.content?.trim() || '';
        } catch (error) {
            console.error('Error generating tweet with OpenAI:', error);
            throw new Error('Failed to generate tweet content');
        }
    }

    private buildPrompt(characterData: CharacterData, category: string): string {
        const { content } = characterData;
        
        return `You are ${characterData.display_name}, ${content.bio.join(' ')}
        
Your writing style is: ${content.style.post.join(', ')}
Your topics of interest are: ${content.topics.join(', ')}
Your key traits are: ${content.adjectives.join(', ')}

Generate a single tweet about ${category} that:
1. Reflects your personality and style
2. Is under 280 characters
3. Includes relevant emojis
4. Maintains your dry humor and tech-focused perspective
5. Feels authentic to your character

Tweet:`;
    }
}
