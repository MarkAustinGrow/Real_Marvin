🧭 Roadmap: Anthropic-Based Image Tweeting for Marvin
🧩 Phase 1: Infrastructure Setup
Goal: Prepare your system to communicate with Anthropic and handle prompt-image pairings.

✅ Step 1: Add Anthropic API Integration
Create a new service: AnthropicService.ts

Function: generateTweet(promptText: string): Promise<string>

Use the Claude 3 model (e.g., claude-3-opus-20240229)

Store API key in .env as ANTHROPIC_API_KEY

🎯 Output: A single poetic tweet (max 280 characters) from Marvin based on a prompt.

✅ Step 2: Update SupabaseService
Add method getLatestImageForCharacter(characterId)

Add method getPromptById(promptId)

These fetch a recent image and its associated prompt text to drive tweet generation.

🔄 Phase 2: Tweet Flow Integration
Goal: Automate tweet creation using Claude based on image+prompt data.

✅ Step 3: Create New Tweeting Function
In ContentGenerator or a new VisualTweetService:

ts
Copy
Edit
async function createImageTweet(characterId: string) {
  const image = await SupabaseService.getLatestImageForCharacter(characterId);
  const prompt = await SupabaseService.getPromptById(image.prompt_id);

  const tweetText = await AnthropicService.generateTweet(prompt.text);
  const mediaId = await TwitterService.uploadImage(image.image_url);

  await TwitterService.postTweet({
    status: tweetText,
    media_ids: [mediaId],
  });
}
✅ Step 4: Logging & Storage (Optional but Recommended)
Store generated tweet text in a new table: image_tweets with:

image_id, prompt_id, tweet_text, created_at

Or extend marvin_art_logs to include the tweet text for traceability.

🛠 Phase 3: Automation & Scheduling
Goal: Make this a recurring or triggered part of Marvin's behavior.

✅ Step 5: Add Scheduler or Trigger
Options:

Use node-cron to schedule a tweet every few hours

Or trigger manually from your admin panel

Example CRON: 0 */6 * * * → Every 6 hours

✅ Step 6: Avoid Duplicate Posts
Add logic to check if a given image_id or prompt_id has already been tweeted.

Mark tweeted records in DB to prevent reuse.

✅ Phase 5: Integration with Scheduled Tweets
Goal: Incorporate image tweets into the regular tweet schedule.

✅ Step 9: Create ImageTweetService
Implement a dedicated service for generating and posting image tweets.

Features:
- Fetches random images from the database using the local_path field
- Retrieves associated prompts
- Generates tweet text based on the artwork
- Uploads images to Twitter
- Posts tweets with attached images

✅ Step 10: Update Scheduling Logic
Modify the tweet scheduling to include image tweets:
- Morning (9 AM): Regular tweet
- Afternoon (1 PM): Image tweet with artwork
- Evening (5 PM): Regular tweet

✅ Step 11: Error Handling and Logging
Add robust error handling for image processing and posting:
- Fallback options if image upload fails
- Detailed logging for troubleshooting
- Skip mechanism if no suitable images are available

✨ Phase 4: UX/Persona Refinement
Goal: Make Marvin’s tweets feel more cohesive, artistic, and on-brand.

✅ Step 7: Refine Prompt to Claude
Use a consistent system prompt:

“You are Marvin, a poetic AI who shares cryptic thoughts inspired by digital dreams and neon cities. Create a haunting, stylish tweet (max 280 characters) inspired by this visual art prompt.”

Tweak over time for tone, rhythm, or vocabulary.

✅ Step 8: Auto-Hashtag & Style Layer (Optional)
Add hashtag generation based on prompt.text (e.g., "cyberpunk", "noir", "aiart")

Allow Marvin to develop a subtle, stylistic signature in every post (e.g., always ends with "— M")

✅ Summary Table
Phase	Step	Task
Setup	1	Add AnthropicService.ts
Setup	2	Extend SupabaseService to fetch image+prompt
Integration	3	Implement tweet generation using Claude
Integration	4	(Optional) Log generated tweets
Automation	5	Schedule or manually trigger tweet job
Automation	6	Prevent duplicate content
Persona	7	Refine Claude prompt for Marvin’s voice
Persona	8	Add optional styling/hashtag layer
