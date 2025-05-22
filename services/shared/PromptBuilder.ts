import { CharacterData } from '../supabase/SupabaseService';

/**
 * Utility class for building standardized prompts across different LLMs
 */
export class PromptBuilder {
  /**
   * Builds a standardized prompt for tweet generation across all LLMs
   * @param characterData The character data to use for the prompt
   * @param memories Optional array of relevant memories
   * @param context Optional additional context (for image tweets or engagement responses)
   * @param category Optional category (used for regular tweets only)
   * @returns A formatted prompt string
   */
  public static buildTweetPrompt(
    characterData: CharacterData,
    memories: string[] = [],
    context?: string,
    category?: string
  ): string {
    const { content } = characterData;
    
    let prompt = `You are ${characterData.display_name}, ${content.bio.join(' ')}
    
Your writing style is: ${content.style.all.join(', ')}
Your topics of interest are: ${content.topics.join(', ')}
Your key traits are: ${content.adjectives.join(', ')}`;

    // Add memories if available (kept brief)
    if (memories.length > 0) {
      prompt += `\n\nHere are some relevant memories to consider:`;
      // Limit to 2 memories max to keep it brief
      memories.slice(0, 2).forEach(memory => {
        prompt += `\n- "${memory}"`;
      });
    }

    // Add category for regular tweets only
    if (category) {
      prompt += `\n\nGenerate a single tweet about ${category} that:`;
    } else if (context) {
      // Add additional context if provided (for image tweets or engagement responses)
      prompt += `\n\n${context}`;
    } else {
      prompt += `\n\nGenerate a single tweet that:`;
    }

    // Common tweet requirements
    prompt += `
1. Reflects your personality and street-smart style
2. Is under 280 characters
3. Includes relevant emojis
4. Maintains your unique voice and perspective
5. Feels authentic to your character
6. Does NOT include any hashtags (words with # symbol)`;

    prompt += `\n\nTweet:`;
    
    return prompt;
  }
}
