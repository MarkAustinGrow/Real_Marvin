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
1. IMPORTANT: DO NOT include any hashtags or words with # symbols. Twitter/X no longer uses hashtags effectively.
2. Reflects your personality and street-smart style
3. Is under 280 characters
4. Includes relevant emojis
5. Maintains your unique voice and perspective
6. Feels authentic to your character`;

    // Add examples to clarify
    prompt += `\n\nExamples:
BAD: "Just created some cool art #DigitalArt #Creative"
GOOD: "Just created some cool art that's pushing boundaries in the digital space 🎨"`;

    prompt += `\n\nTweet:`;
    
    return prompt;
  }
}
