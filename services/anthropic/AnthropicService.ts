import axios from 'axios';
import { config } from '../../config';
import { CharacterData } from '../supabase/SupabaseService';

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

    /**
     * Generates a blog post using Claude based on character data, theme, and memories
     * @param characterData Marvin's character data
     * @param theme The blog post theme
     * @param memories Optional array of relevant memories to include in the prompt
     * @returns Generated blog post with title, content, and excerpt
     */
    public async generateBlogPost(
        characterData: CharacterData,
        theme: string,
        memories: string[] = []
    ): Promise<{
        title: string;
        content: string;
        excerpt: string;
    }> {
        try {
            const systemPrompt = this.buildBlogSystemPrompt(characterData);
            const userPrompt = this.buildBlogUserPrompt(theme, memories);
            
            const response = await axios.post(
                `${this.baseUrl}/messages`,
                {
                    model: this.model,
                    system: systemPrompt,
                    messages: [
                        { role: 'user', content: userPrompt }
                    ],
                    max_tokens: 4000, // Allow for longer content
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
            console.log('Generated blog post from Anthropic Claude');
            
            // Parse the response to extract title, content, and excerpt
            const parsed = this.parseBlogResponse(generatedText);
            
            return parsed;
        } catch (error) {
            console.error('Error generating blog post with Anthropic:', error);
            throw new Error('Failed to generate blog post content');
        }
    }

    private buildBlogSystemPrompt(characterData: CharacterData): string {
        const { content } = characterData;
        
        return `You are ${characterData.display_name}, ${content.bio.join(' ')}
        
Your writing style is: ${content.style.post.join(', ')}
Your topics of interest are: ${content.topics.join(', ')}
Your key traits are: ${content.adjectives.join(', ')}

You are writing a blog post that showcases your unique perspective and voice.`;
    }

    private buildBlogUserPrompt(theme: string, memories: string[] = []): string {
        let prompt = `Write a thoughtful blog post based on the theme: "${theme}"`;
        
        // Add memories if available
        if (memories.length > 0) {
            prompt += `\n\nHere are some of your recent memories that might be relevant:`;
            memories.forEach(memory => {
                prompt += `\n- "${memory}"`;
            });
            prompt += `\n\nUse these memories as inspiration if relevant.`;
        }

        prompt += `\n\nYour blog post should include:
- A metaphor-rich introduction
- A reflective main body
- A poetic or hopeful conclusion

Your blog post should:
1. Reflect your personality and style
2. Demonstrate your dry humor and tech-focused perspective
3. Feel authentic to your character
4. Be written in markdown format

Return your response in the following format:
TITLE: [Your blog post title]
CONTENT: [Your markdown-formatted blog post content]
EXCERPT: [A 1-2 sentence excerpt that captures the essence of the post]`;

        return prompt;
    }

    private parseBlogResponse(response: string): { title: string; content: string; excerpt: string; } {
        let title = '';
        let content = '';
        let excerpt = '';
        
        // Extract title
        const titleMatch = response.match(/TITLE:\s*(.*?)(?:\n|$)/);
        if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
        }
        
        // Extract content
        const contentMatch = response.match(/CONTENT:\s*([\s\S]*?)(?=EXCERPT:|$)/);
        if (contentMatch && contentMatch[1]) {
            content = contentMatch[1].trim();
        }
        
        // Extract excerpt
        const excerptMatch = response.match(/EXCERPT:\s*([\s\S]*?)(?=$)/);
        if (excerptMatch && excerptMatch[1]) {
            excerpt = excerptMatch[1].trim();
        }
        
        return { title, content, excerpt };
    }
}
