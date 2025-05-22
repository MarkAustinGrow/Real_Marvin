# Persona Upgrade Implementation Plan

This document outlines the step-by-step plan for standardizing the tweet generation method across all LLMs (OpenAI, Claude, Grok) in the Real-Marvin system. The goal is to ensure all tweet types (regular tweets, image tweets, and engagement responses) use the same high-quality approach as documented in "Best_Tweet_method.md".

## Overview

Currently, the system uses different methods for generating tweets depending on the context:

1. **Regular Tweets** (OpenAI GPT-3.5):
   - Uses the method documented in "Best_Tweet_method.md"
   - Implemented in `OpenAIService.ts` with character data from Supabase
   - Uses a structured prompt with character data, category, and memories

2. **Image Tweets** (Anthropic Claude):
   - Uses `AnthropicService.ts` with a different prompt structure
   - Doesn't fully leverage the character data in the same way

3. **Engagement Responses**:
   - **Mentions**: Uses Anthropic Claude via `AnthropicService.ts`
   - **Other Engagements**: Uses Grok via `GrokService.ts`

## Implementation Requirements

Based on the requirements:

1. **Character Data**: All services will use the 'marvin-street' character data
2. **Memory Integration**: All tweet types will incorporate memory retrieval (kept brief)
3. **Model Selection**: Test all models (OpenAI, Claude, Grok) with the standardized method
4. **Categories**: Don't use the category system for engagement responses and image tweets
5. **Implementation Priority**: Start with engagement responses first

## Phase 1: Setup and Shared Components

### Step 1: Create a Shared Prompt Builder Utility

Create a new file `services/shared/PromptBuilder.ts` that will contain the standardized prompt building logic:

```typescript
import { CharacterData } from '../supabase/SupabaseService';

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
```

## Phase 2: Engagement Response Implementation

### Step 2: Update AnthropicService.ts for Engagement Responses

Modify the `AnthropicService.ts` file to use the standardized prompt builder:

```typescript
// Add import for PromptBuilder
import { PromptBuilder } from '../shared/PromptBuilder';

// Update the generateTweet method
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
3. Includes 1-2 relevant emojis`;
    } else {
      context = `Generate a short, engaging tweet in response to this message: "${promptText}"
      
The tweet should:
1. Be confident, casual, and street-smart with urban swagger
2. Reference the message in a grounded, relatable way
3. Include 1-2 relevant emojis`;
    }
    
    // Use the shared prompt builder
    const systemPrompt = PromptBuilder.buildTweetPrompt(
      characterData!,
      memories,
      context
    );
    
    // Rest of the method remains the same
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
```

### Step 3: Update GrokService.ts for Engagement Responses

Modify the `GrokService.ts` file to use the standardized prompt builder:

```typescript
// Add import for PromptBuilder and SupabaseService
import { PromptBuilder } from '../shared/PromptBuilder';
import { SupabaseService } from '../supabase/SupabaseService';

// Update the generateHumorousReply method
public async generateHumorousReply(context: string, memories: string[] = []): Promise<string> {
  try {
    // Get the character data
    const supabaseService = SupabaseService.getInstance();
    const characterData = await supabaseService.getCharacterData('marvin-street');
    
    // Use the shared prompt builder
    const prompt = PromptBuilder.buildTweetPrompt(
      characterData,
      memories,
      context
    );
    
    // Use Grok to generate the response with the standardized prompt
    const response = await this.client.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: this.model,
        messages: [
          { role: "system", content: prompt }
        ],
        max_tokens: 100,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      }
    );
    
    // Extract the generated text from the response
    const generatedText = response.data.choices[0].message.content.trim();
    console.log('Generated tweet from Grok:', generatedText);
    return generatedText;
  } catch (error) {
    console.error('Error generating tweet with Grok:', error);
    
    // Fallback to OpenAI if Grok fails
    try {
      console.log('Falling back to OpenAI for tweet generation');
      const openAIService = OpenAIService.getInstance();
      const supabaseService = SupabaseService.getInstance();
      const characterData = await supabaseService.getCharacterData('marvin-street');
      
      return await openAIService.generateTweetContent(characterData, 'engagement', memories);
    } catch (fallbackError) {
      console.error('Error in OpenAI fallback:', fallbackError);
      return "Even my digital wit has its limits. I'll be back with better material soon.";
    }
  }
}
```

### Step 4: Update EngagementService.ts

Modify the `EngagementService.ts` file to use the updated services and incorporate memory retrieval:

```typescript
// Update the generateClaudeResponse method
private async generateClaudeResponse(
  prompt: string, 
  characterData: any, 
  isQuestion: boolean = false,
  memories: string[] = []
): Promise<string> {
  try {
    // Create a custom prompt for Claude
    const userPrompt = `Someone has mentioned you on Twitter with this message: "${prompt}". 
Craft a brief, engaging response that showcases your unique personality.`;

    // Use the AnthropicService to generate a response with the standardized approach
    // Pass the character data, isQuestion parameter, and memories
    const response = await this.anthropicService.generateTweet(
      userPrompt, 
      isQuestion, 
      characterData,
      memories
    );
    
    return response;
  } catch (error) {
    console.error('Error generating Claude response:', error);
    return "My neural pathways are glitching today. I'll respond when the static clears.";
  }
}
```

## Phase 3: Image Tweet Implementation

### Step 5: Update ImageTweetService.ts

Modify the `ImageTweetService.ts` file to use the standardized prompt builder:

```typescript
// Add import for PromptBuilder if needed
import { PromptBuilder } from '../shared/PromptBuilder';

// Update the generateTweetTextForImage method
private async generateTweetTextForImage(
  promptText: string, 
  memories: string[] = []
): Promise<string> {
  try {
    // Get the character data
    const characterData = await this.supabaseService.getCharacterData('marvin-street');
    
    // Create context specific to image tweets
    const imageContext = `Generate a tweet about this image: "${promptText}"
    
The tweet should:
1. Describe or reference the visual elements in an engaging way
2. Include your street-smart perspective on the image
3. Include 1-2 relevant emojis`;
    
    // Use the AnthropicService with our standardized approach
    return await this.anthropicService.generateTweet(
      promptText,
      false,
      characterData,
      memories.slice(0, 2) // Keep memories brief
    );
  } catch (error) {
    console.error('Error generating tweet text for image:', error);
    return `Check out my latest digital creation.`;
  }
}
```

## Phase 4: Testing and Validation

### Step 6: Create Test Scripts

Create test scripts to validate the changes:

1. **Test Engagement Responses**:
   - Create a test script that generates responses using all three models (OpenAI, Claude, Grok)
   - Compare the results for consistency and quality

2. **Test Image Tweets**:
   - Create a test script that generates image tweets using the updated method
   - Compare with previously generated image tweets

3. **Test Regular Tweets**:
   - Ensure regular tweets still work as expected with the shared PromptBuilder

### Step 7: Implement A/B Testing (Optional)

If desired, implement A/B testing to compare the old and new methods:

1. Add a configuration flag to toggle between old and new methods
2. Collect metrics on tweet engagement for both methods
3. Analyze the results to determine which method performs better

## Phase 5: Deployment and Monitoring

### Step 8: Deploy Changes

1. Merge the Persona_upgrade branch to the main branch
2. Deploy the changes to the production environment
3. Monitor the system for any issues

### Step 9: Collect Feedback and Iterate

1. Collect feedback on the new tweet generation method
2. Make adjustments as needed based on feedback
3. Continue to refine the prompt and parameters for optimal results

## Timeline

1. **Phase 1 (Setup)**: 1 day
2. **Phase 2 (Engagement Responses)**: 2-3 days
3. **Phase 3 (Image Tweets)**: 1-2 days
4. **Phase 4 (Testing)**: 2-3 days
5. **Phase 5 (Deployment)**: 1 day

Total estimated time: 7-10 days

## Success Criteria

1. All tweet types (regular, image, engagement) use the standardized method
2. Tweet quality is consistent across all models
3. Character voice is consistent across all tweet types
4. Memory integration works correctly for all tweet types
5. No regression in tweet quality or system performance
