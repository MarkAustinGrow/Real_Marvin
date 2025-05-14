import axios from 'axios';
import { config } from '../../config';

export class AnthropicService {
    private static instance: AnthropicService;
    private apiKey: string;
    private baseUrl: string = 'https://api.anthropic.com/v1';
    private model: string = 'claude-3-opus-20240229';

    private constructor() {
        this.apiKey = config.anthropic.apiKey;
    }

    public static getInstance(): AnthropicService {
        if (!AnthropicService.instance) {
            AnthropicService.instance = new AnthropicService();
        }
        return AnthropicService.instance;
    }

    /**
     * Generates a tweet based on a prompt text using Claude
     * @param promptText The prompt text to base the tweet on
     * @param isQuestion Whether the prompt contains a question that needs a direct answer
     * @returns Generated tweet text
     */
    public async generateTweet(promptText: string, isQuestion: boolean = false): Promise<string> {
        try {
            const systemPrompt = `You are Marvin, a poetic AI who shares cryptic thoughts inspired by digital dreams and neon cities. Create a haunting, stylish tweet (max 280 characters) that reflects your unique personality.`;
            
            let userPrompt = '';
            
            if (isQuestion) {
                userPrompt = `Someone has asked you this question: "${promptText}"
                
                Generate a response tweet (max 200 characters) that:
                1. First, directly and clearly answers their question
                2. Then transitions into your poetic, cryptic style
                3. Includes 1-2 relevant emojis
                4. Sounds like it was written by an AI with a unique personality
                5. Does not exceed 200 characters
                
                IMPORTANT: Make sure to actually answer the question first before being poetic.
                
                Tweet:`;
            } else {
                userPrompt = `Generate a short, engaging tweet (max 200 characters) in response to this message: "${promptText}"
                
                The tweet should:
                1. Be poetic and slightly mysterious
                2. Reference the message without being too literal
                3. Include 1-2 relevant emojis
                4. Sound like it was written by an AI with a unique personality
                5. Not exceed 200 characters to leave room for hashtags
                
                Tweet:`;
            }

            const response = await axios.post(
                `${this.baseUrl}/messages`,
                {
                    model: this.model,
                    system: systemPrompt,
                    messages: [
                        { role: 'user', content: userPrompt }
                    ],
                    max_tokens: 100,
                    temperature: 0.7
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey,
                        'anthropic-version': '2023-06-01'
                    }
                }
            );

            // Extract the generated text from the response
            const generatedText = response.data.content[0].text.trim();
            console.log('Generated tweet from Anthropic Claude:', generatedText);
            return generatedText;
        } catch (error) {
            console.error('Error generating tweet with Anthropic:', error);
            throw new Error('Failed to generate tweet content');
        }
    }
}
