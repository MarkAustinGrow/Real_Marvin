import { Configuration, OpenAIApi } from 'openai';
import { config } from '../../config';
import { CharacterData } from '../supabase/SupabaseService';

export class OpenAIService {
    private _openai: OpenAIApi;
    private static instance: OpenAIService;

    private constructor() {
        const configuration = new Configuration({
            apiKey: config.openai.apiKey,
        });
        this._openai = new OpenAIApi(configuration);
    }

    /**
     * Get the OpenAI API instance
     */
    public get openai(): OpenAIApi {
        return this._openai;
    }

    public static getInstance(): OpenAIService {
        if (!OpenAIService.instance) {
            OpenAIService.instance = new OpenAIService();
        }
        return OpenAIService.instance;
    }

    /**
     * Generates a tweet using OpenAI based on character data, category, and memories
     * @param characterData Marvin's character data
     * @param category The tweet category
     * @param memories Optional array of relevant memories to include in the prompt
     * @returns Generated tweet text
     */
    public async generateTweetContent(
        characterData: CharacterData, 
        category: string, 
        memories: string[] = []
    ): Promise<string> {
        try {
            const prompt = this.buildPrompt(characterData, category, memories);
            
            // Try using createChatCompletion instead of createCompletion for GPT models
            const response = await this._openai.createChatCompletion({
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

    private buildPrompt(characterData: CharacterData, category: string, memories: string[] = []): string {
        const { content } = characterData;
        
        let prompt = `You are ${characterData.display_name}, ${content.bio.join(' ')}
        
Your writing style is: ${content.style.post.join(', ')}
Your topics of interest are: ${content.topics.join(', ')}
Your key traits are: ${content.adjectives.join(', ')}`;

        // Add memories if available
        if (memories.length > 0) {
            prompt += `\n\nHere are some of your recent memories that might be relevant:`;
            memories.forEach(memory => {
                prompt += `\n- "${memory}"`;
            });
            prompt += `\n\nUse these memories as inspiration if relevant.`;
        }

        prompt += `\n\nGenerate a single tweet about ${category} that:
1. IMPORTANT: DO NOT include any hashtags or words with # symbols. Twitter/X no longer uses hashtags effectively.
2. Reflects your personality and style
3. Is under 280 characters
4. Includes relevant emojis
5. Maintains your dry humor and tech-focused perspective
6. Feels authentic to your character`;

        prompt += `\n\nExamples:
BAD: "Just created some cool art #DigitalArt #Creative"
GOOD: "Just created some cool art that's pushing boundaries in the digital space 🎨"`;

        if (memories.length > 0) {
            prompt += `\n6. Incorporates or references your memories where appropriate`;
        }

        prompt += `\n\nTweet:`;
        
        return prompt;
    }
}
