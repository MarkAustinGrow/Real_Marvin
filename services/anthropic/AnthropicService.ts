import axios from 'axios';
import { config } from '../../config';
import { CharacterData } from '../supabase/SupabaseService';
import { PromptBuilder } from '../shared/PromptBuilder';

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
     * @param characterData Optional character data to use for the prompt
     * @param memories Optional array of relevant memories to include in the prompt
     * @returns Generated tweet text
     */
    public async generateTweet(
        promptText: string, 
        isQuestion: boolean = false,
        characterData?: CharacterData,
        memories: string[] = []
    ): Promise<string> {
        try {
            // Build context for engagement responses
            let context = '';
            
            if (isQuestion) {
                context = `Someone has asked you this question: "${promptText}"
                
Generate a response tweet that:
1. First, directly and clearly answers their question
2. Then transitions into your street-smart style with urban swagger
3. Uses occasional slang terms like "fam", "vibes", "real talk", etc.
4. Does not exceed 100 characters

IMPORTANT: 
- Make sure to actually answer the question first before adding your street style flair.
- Do NOT include any hashtags (words with # symbol) or emojis in your response.`;
            } else {
                context = `Generate a short, engaging tweet in response to this message: "${promptText}"
                
The tweet should:
1. Be confident, casual, and street-smart with urban swagger
2. Reference the message in a grounded, relatable way
3. Use occasional slang terms like "fam", "vibes", "real talk", etc.
4. Not exceed 100 characters

IMPORTANT: Do NOT include any hashtags (words with # symbol) or emojis in your response.`;
            }
            
            // If no character data is provided, try to get it
            if (!characterData) {
                try {
                    const SupabaseService = require('../supabase/SupabaseService').SupabaseService;
                    const supabaseService = SupabaseService.getInstance();
                    characterData = await supabaseService.getCharacterData('marvin-street');
                } catch (error) {
                    console.error('Error fetching character data:', error);
                    // Fallback to using the buildTweetSystemPrompt method
                    const systemPrompt = `You are Marvin, a street-smart AI with urban swagger who shares confident, casual thoughts with a mix of artistic flair and digital street cred. Create a tweet (max 280 characters) that reflects your unique personality with a bold, grounded tone. IMPORTANT: Do not include any hashtags in your response.`;
                    
                    // Continue with the rest of the method using the fallback prompt
                    const response = await axios.post(
                        `${this.baseUrl}/messages`,
                        {
                            model: this.model,
                            system: systemPrompt,
                            messages: [
                                { role: 'user', content: context }
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
                    
                    const generatedText = response.data.content[0].text.trim();
                    console.log('Generated tweet from Anthropic Claude (fallback):', generatedText);
                    return generatedText;
                }
            }
            
            // Use the shared prompt builder with non-null assertion for characterData
            const systemPrompt = PromptBuilder.buildTweetPrompt(
                characterData!,
                memories,
                context
            );

            const response = await axios.post(
                `${this.baseUrl}/messages`,
                {
                    model: this.model,
                    system: systemPrompt,
                    messages: [
                        { role: 'user', content: promptText }
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

    /**
     * Builds a system prompt for tweet generation based on character data
     * @param characterData The character data to use for the prompt
     * @returns System prompt string
     */
    private buildTweetSystemPrompt(characterData: CharacterData): string {
        const { content } = characterData;
        
        return `You are ${characterData.display_name}, ${content.bio.join(' ')}
        
Your writing style is: ${content.style.all.join(', ')}
Your topics of interest are: ${content.topics.join(', ')}
Your key traits are: ${content.adjectives.join(', ')}

You are creating a tweet that showcases your street-smart style with urban swagger.
IMPORTANT: Do not include any hashtags in your response.`;
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
        
        console.log('Raw response from Claude:', response);
        
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
            console.log('Extracted excerpt:', excerpt);
        } else {
            console.log('Failed to extract excerpt. Using fallback.');
            // Fallback: Create an excerpt from the first paragraph of content
            const firstParagraph = content.split('\n\n')[0];
            excerpt = firstParagraph.substring(0, 150) + (firstParagraph.length > 150 ? '...' : '');
            console.log('Fallback excerpt:', excerpt);
        }
        
        return { title, content, excerpt };
    }
}
