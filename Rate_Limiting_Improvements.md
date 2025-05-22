# Rate Limiting and Hashtag Removal Improvements

This document outlines the improvements made to handle Twitter API rate limits and remove hashtags from tweets.

## Rate Limiting Improvements

Twitter imposes a daily limit of 250 requests per day for certain API endpoints. To handle this limitation, we've implemented the following improvements:

### 1. Token Bucket Algorithm

We've added a token bucket algorithm to the `TwitterService` class that tracks API usage and ensures we stay within limits:

```typescript
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private maxTokens: number;
  private refillRate: number; // tokens per millisecond
  
  constructor(maxTokens: number, refillRatePerDay: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
    this.refillRate = refillRatePerDay / (24 * 60 * 60 * 1000);
  }
  
  async consume(tokens: number = 1): Promise<boolean> {
    this.refill();
    
    if (this.tokens < tokens) {
      console.log(`Rate limit would be exceeded. Available tokens: ${this.tokens}, requested: ${tokens}`);
      return false;
    }
    
    this.tokens -= tokens;
    return true;
  }
  
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }
}
```

### 2. Rate Limit Detection and Handling

We've added properties to track rate limit status and reset time:

```typescript
public isRateLimited: boolean = false;
public rateLimitResetTime: Date | null = null;
```

And a method to handle rate limit errors:

```typescript
private async handleRateLimit(error: any): Promise<void> {
  if (error.code === 429) {
    // Extract reset time from headers
    const resetTime = error.rateLimit?.reset;
    if (resetTime) {
      const resetDate = new Date(resetTime * 1000);
      const waitTime = resetDate.getTime() - Date.now();
      
      console.log(`Rate limit exceeded. Will reset at ${resetDate.toLocaleString()}`);
      console.log(`Waiting for ${Math.ceil(waitTime / 1000 / 60)} minutes before retrying`);
      
      // Store this information for other components to use
      this.rateLimitResetTime = resetDate;
      this.isRateLimited = true;
      
      // Schedule a job to reset the rate limit flag
      setTimeout(() => {
        this.isRateLimited = false;
        console.log('Rate limit reset. Resuming normal operations.');
      }, waitTime + 1000); // Add 1 second buffer
    }
  }
}
```

### 3. Reduced Polling Frequency

We've increased the engagement monitoring interval from 10 minutes to 30 minutes to reduce API calls:

```typescript
// Schedule engagement monitoring every 30 minutes (increased from 10 to reduce rate limit issues)
this.scheduleEngagementMonitoring(30);
```

### 4. Rate Limit Awareness in Schedulers

We've updated the `EngagementScheduler` to check if we're rate limited before making API calls:

```typescript
// Check if we're rate limited
if (this.twitterService.isRateLimited) {
  const resetTime = this.twitterService.rateLimitResetTime;
  console.log(`Skipping engagement monitoring due to rate limit. Will reset at ${resetTime?.toLocaleString() || 'unknown time'}`);
  return;
}
```

## Hashtag Removal Improvements

To ensure tweets don't contain hashtags, we've made the following improvements:

### 1. Enhanced Hashtag Detection

We've improved the regex pattern in the `removeHashtags` method to catch more hashtag formats:

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

### 2. Consistent Hashtag Removal

We've updated the `formatContent` method to always remove hashtags and ensure the hashtags array is empty:

```typescript
public formatContent(content: PostContent): PostContent {
  // Ensure content meets Twitter's character limit
  const maxLength = 280;
  let formattedText = content.text;

  if (formattedText.length > maxLength) {
    formattedText = formattedText.substring(0, maxLength - 3) + '...';
  }

  // Remove any hashtags that might have been included in the text
  formattedText = this.removeHashtags(formattedText);

  return {
    ...content,
    text: formattedText,
    hashtags: [] // Ensure hashtags array is empty
  };
}
```

### 3. Updated Daily Wrap-up

We've updated the `generateAndPostDailyWrapup` method to use the `formatContent` method:

```typescript
// Create the tweet content (without hashtags)
const tweetContent: PostContent = {
  text: wrapupText,
  platform: 'Twitter'
};

// Format the content (this will remove any hashtags)
const formattedContent = this.twitterService.formatContent(tweetContent);

// Post the tweet
const result = await this.twitterService.postTweet(formattedContent);
```

## Testing

To test these improvements:

1. Monitor the logs for rate limit messages
2. Check that tweets are posted without hashtags
3. Verify that the system properly backs off when rate limits are hit

## Future Improvements

Potential future improvements include:

1. Implementing a more sophisticated backoff strategy for rate limits
2. Adding a database table to track API usage across restarts
3. Implementing a queue system for tweets to ensure they're posted when rate limits reset
