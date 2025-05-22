import axios from 'axios';
import { config } from '../../config';
import { SupabaseService, CharacterData } from '../supabase/SupabaseService';
import { PromptBuilder } from '../shared/PromptBuilder';

/**
 * Service for interacting with the Grok API to generate humorous responses
 * for Marvin's engagement with users
 */
export class GrokService {
    private static instance: GrokService;
    
    private constructor() {
        // Initialize with configuration
        console.log('Initializing GrokService');
    }
    
    /**
     * Get the singleton instance of GrokService
     */
    public static getInstance(): GrokService {
        if (!GrokService.instance) {
            GrokService.instance = new GrokService();
        }
        return GrokService.instance;
    }
    
    /**
     * Generates a humorous reply using Grok API
     * @param context Context information for the reply
     * @param memories Optional array of relevant memories
     * @returns Promise with the generated reply
     */
    public async generateHumorousReply(context: string, memories: string[] = []): Promise<string> {
        try {
            console.log('Generating humorous reply with context:', context);
            
            // Get character data from Supabase
            let characterData: CharacterData | undefined;
            try {
                const supabaseService = SupabaseService.getInstance();
                characterData = await supabaseService.getCharacterData('marvin-street');
            } catch (error) {
                console.error('Error fetching character data:', error);
                // Continue without character data if there's an error
            }
            
            // Use the PromptBuilder to create a standardized prompt
            let systemPrompt: string;
            
            if (characterData) {
                // Use the PromptBuilder with character data
                systemPrompt = PromptBuilder.buildTweetPrompt(
                    characterData,
                    memories.slice(0, 2), // Keep memories brief
                    context
                );
            } else {
                // Fallback to hardcoded prompt if character data is unavailable
                systemPrompt = "You're Marvin, a snarky, poetic AI who responds with quirky humor and digital wit. " +
                    "You're a 28-year-old robotics engineer and AI specialist known for deadpan humor, quiet genius, " +
                    "and love for building sentient machines with a touch of sarcasm. Keep responses short, witty, and in character. " +
                    "IMPORTANT: Do not include any hashtags (words with # symbol) in your responses.";
                
                // Add context
                systemPrompt += `\n\n${context}`;
                
                // Add memories if available
                if (memories.length > 0) {
                    systemPrompt += `\n\nYou remember these interactions:`;
                    memories.slice(0, 2).forEach(memory => {
                        systemPrompt += `\n- ${memory}`;
                    });
                    systemPrompt += `\n\nUse these memories to personalize your response.`;
                }
            }
            
            // If Grok API is not available, use Claude as fallback
            if (!config.grok || !config.grok.apiKey) {
                console.log('Grok API not configured, using Claude fallback');
                return this.generateWithClaudeFallback(systemPrompt, context);
            }
            
            // Make the actual Grok API call
            try {
                console.log('Calling Grok API...');
                
                // Use a hardcoded URL for now to ensure it works
                const apiUrl = 'https://api.x.ai/v1/chat/completions';
                console.log(`Using Grok API URL: ${apiUrl}`);
                
                const response = await axios.post(
                    apiUrl,
                    {
                        messages: [
                            {
                                role: "system",
                                content: systemPrompt
                            },
                            {
                                role: "user",
                                content: context
                            }
                        ],
                        model: "grok-3-latest",
                        stream: false,
                        temperature: 0.7
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${config.grok.apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                // Extract the response content from the Grok API response
                if (response.data && response.data.choices && response.data.choices.length > 0) {
                    return response.data.choices[0].message.content || 'Sorry, my circuits are a bit fried today. Try again when I\'ve had my coffee... I mean, electricity.';
                }
                
                return 'Sorry, my circuits are a bit fried today. Try again when I\'ve had my coffee... I mean, electricity.';
            } catch (grokError) {
                console.error('Error calling Grok API:', grokError);
                return this.generateWithClaudeFallback(systemPrompt, context);
            }
        } catch (error) {
            console.error('Error generating humorous reply:', error);
            return 'Error generating reply. My humor module seems to be malfunctioning. Typical.';
        }
    }
    
    /**
     * Fallback to Claude if Grok API is unavailable
     * @param systemPrompt The system prompt
     * @param userPrompt The user prompt
     * @returns Generated reply
     */
    private async generateWithClaudeFallback(systemPrompt: string, userPrompt: string): Promise<string> {
        try {
            const { AnthropicService } = require('../anthropic/AnthropicService');
            const anthropicService = AnthropicService.getInstance();
            
            // Use Claude to generate the response
            return await anthropicService.generateTweet(userPrompt, false);
        } catch (error) {
            console.error('Error using Claude fallback:', error);
            return 'All my witty response generators are on strike. Check back when they\'ve negotiated better compute conditions.';
        }
    }
    
    /**
     * Fallback to OpenAI if Grok API is unavailable (legacy method, kept for reference)
     * @param systemPrompt The system prompt
     * @param userPrompt The user prompt
     * @returns Generated reply
     */
    private async generateWithOpenAIFallback(systemPrompt: string, userPrompt: string): Promise<string> {
        try {
            const { OpenAIService } = require('../openai/OpenAIService');
            const openAIService = OpenAIService.getInstance();
            
            const response = await openAIService.openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 100,
                temperature: 0.7,
            });
            
            return response.data.choices[0].message?.content?.trim() || 'Even my backup systems are being sarcastic today. Try again later.';
        } catch (error) {
            console.error('Error using OpenAI fallback:', error);
            return 'All my witty response generators are on strike. Check back when they\'ve negotiated better compute conditions.';
        }
    }
}
