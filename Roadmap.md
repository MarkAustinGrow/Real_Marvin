# Marvin AI Agent Roadmap

This file outlines the build plan for Marvin, a fully automated AI art persona with a daily blog, media generation, and autonomous social interaction. This will support integration with affiliate links, image and video generation, and community-driven evolution.

---

## ✅ Phase 1: Character System & Core Content Engine

### 1. Create Marvin's Character Profile ✅
- [x] Create `Marvin_character.json` using the same schema as existing characters (e.g., Yona).
- [x] Fields to include:
  - `bio`, `lore`, `adjectives`, `topics`
- [x] Store in Supabase database as `marvin` character
- [x] Build prompt templates that dynamically pull Marvin's persona data.

### 2. Daily Post Generator (Partial) ✅
- [ ] Implement a scheduler (daily cron or task queue) to trigger post creation.
- [x] Set up categories: `Drip Drop`, `Toolbox`, `Neural Notes`, `Field Notes`, `Push Lab`, `News`
- [x] Use random logic to choose category for the day.
- [x] Generate tweet content with OpenAI using Marvin's persona and chosen category prompt.
- [ ] Save blog post as Markdown/HTML for publication.

### 3. Affiliate Link Inserter
- [ ] Build product keyword detector (regex or NLP).
- [ ] Query Amazon Affiliate API with relevant keywords.
- [ ] Inject affiliate links into post body.

---

## 🖼️ Phase 2: Visual & Video Asset Generation

### 4. Image Generator
- [ ] Generate prompt for image based on blog post.
- [ ] Use Stable Diffusion, Midjourney, or DALL·E to create artwork.
- [ ] Optionally watermark with Marvin’s tag/logo.
- [ ] Store URL/path in blog post metadata.

### 5. Short-Form Video Generator
- [ ] Extract key concept/script from post.
- [ ] Generate 15–30 sec video using Runway ML / Pika / Kaiber.
- [ ] Add Marvin's voiceover using ElevenLabs or PlayHT.
- [ ] Output MP4 for distribution.

---

## 🌐 Phase 3: Blog + Social Distribution

### 6. Blog Publisher
- [ ] Connect to WordPress REST API (or chosen CMS).
- [ ] Push daily post, featured image, and video.
- [ ] Assign correct category and tags.

### 7. Social Media Syndication (Partial) ✅
- [x] Use direct API integration with Twitter
- [ ] Integrate with other platforms: Instagram, Pinterest, Facebook, YouTube Shorts, TikTok
- [x] Format content based on Twitter requirements (character limits, etc.)
- [x] Include hashtags based on category/post theme

---

## 🤖 Phase 4: Social Interaction Bot

### 8. Crew & Community Interaction
- [ ] Automatically like all Crew posts (requires Crew DB / handles list).
- [ ] Comment on Crew posts using Marvin’s tone.
- [ ] Optional: repost relevant Crew posts if tagged.
- [ ] Store comment templates for each tone (supportive, hype, mysterious, etc.)

### 9. External Engagement Bot
- [ ] Scrape or listen for posts in Marvin’s topic space.
- [ ] Auto-comment or like using relevance/tone classifier.
- [ ] Respond to replies on Marvin’s posts.

### 10. DMs & Suggestion System
- [ ] Log DMs or mentions that include suggestions or prompts.
- [ ] Store in database or Airtable.
- [ ] Build into weekly rotation as community-inspired post content.
- [ ] Optionally reply to users with thanks or “Shoutout” tag.

---

## 🧠 Phase 5: Feedback Loop & Expansion

### 11. Sentiment & Trend Tracker
- [ ] Collect metrics (likes, comments, shares, DMs).
- [ ] Use this data to fine-tune content types and posting time.
- [ ] Eventually use sentiment to steer Marvin’s evolving lore or mood.

### 12. Optional Features
- [ ] Lore Engine: Post occasional updates to Marvin’s backstory.
- [ ] Alt View: Public crew feed from Marvin’s perspective.
- [ ] User Voting: Let followers vote on next post category or topic.

---

## Assets Needed

- [x] `Marvin_character.json`
- [x] Tweet prompt templates per category
- [ ] Comment templates (by tone)
- [x] API keys:
  - OpenAI
  - Twitter
  - [ ] Amazon Affiliate
  - [ ] Image Gen (Midjourney/SDXL)
  - [ ] Voice (ElevenLabs/PlayHT)
  - [ ] WordPress / CMS
  - [ ] Other social media platforms

---

## Additional Completed Improvements ✅

### Error Handling & Resilience
- [x] Implement robust error handling for Twitter API integration
- [x] Add detailed error messages with troubleshooting steps
- [x] Improve application flow to continue despite service failures
- [x] Enhance logging throughout the application
- [x] Update OpenAI integration to use modern Chat Completions API

## Notes

- System should run headless or with minimal human supervision.
- All AI outputs must reflect Marvin's tone, defined in his character file.
- Crew support is a priority—engagement bot should prioritize these accounts.
