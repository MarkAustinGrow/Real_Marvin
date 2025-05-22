# Hashtag Removal Improvements

This document outlines the improvements made to prevent hashtags from appearing in generated tweets.

## Problem

Despite explicit instructions in the prompts, OpenAI and other LLMs were still including hashtags in generated tweets. This is likely because:

1. LLMs have a strong association between Twitter/X and hashtags in their training data
2. Simple instructions to not include hashtags were not strong enough to override this association
3. The instruction was placed too far down in the list of requirements

## Two-Layer Solution

We've implemented a two-layer approach to ensure tweets don't contain hashtags:

### Layer 1: Improved Prompt Engineering

We've strengthened the instructions in both the OpenAIService and PromptBuilder classes:

1. **Made the instruction more prominent**:
   - Moved it to the first position in the list of requirements
   - Added "IMPORTANT:" prefix to emphasize its significance

2. **Provided a rationale**:
   - Added explanation: "Twitter/X no longer uses hashtags effectively"
   - This gives the LLM a reason to follow the instruction

3. **Added clear examples**:
   ```
   BAD: "Just created some cool art #DigitalArt #Creative"
   GOOD: "Just created some cool art that's pushing boundaries in the digital space 🎨"
   ```
   - Examples help the LLM understand exactly what we want and don't want

### Layer 2: Post-Processing in TwitterService

Even if the LLM still includes hashtags, we have a robust regex-based hashtag removal system in the TwitterService:

```typescript
/**
 * Removes hashtags from text
 * @param text Text to remove hashtags from
 * @returns Text without hashtags
 */
private removeHashtags(text: string): string {
  // More comprehensive regex to catch hashtags in various formats
  // This will match:
  // - Standard hashtags (#word)
  // - Hashtags with numbers (#word123)
  // - Hashtags with underscores (#word_word)
  // - Hashtags with hyphens (#word-word)
  return text.replace(/#[\w\-_]+\b/g, '')
    .replace(/\s+/g, ' ') // Remove extra spaces
    .trim();
}
```

This function is called in the `formatContent` method, which is used for all tweets before posting:

```typescript
public formatContent(content: PostContent): PostContent {
  // ...
  // Remove any hashtags that might have been included in the text
  formattedText = this.removeHashtags(formattedText);
  // ...
  return {
    ...content,
    text: formattedText,
    hashtags: [] // Ensure hashtags array is empty
  };
}
```

## Testing

To test these improvements:

1. Run the persona upgrade test script:
   ```bash
   docker exec -it real-marvin sh -c "cd /app && npx ts-node src/test-persona-upgrade.ts"
   ```

2. Check if the generated tweets from OpenAI still contain hashtags

3. Use the web interface to generate and post a test tweet, then verify that the posted tweet doesn't contain hashtags, even if they were in the generated content

## Future Improvements

If hashtags still appear in the generated content (before post-processing), we could:

1. Further strengthen the prompt with more explicit instructions
2. Implement a fine-tuning approach for OpenAI models
3. Add a pre-processing step that removes example hashtags from the prompt itself
