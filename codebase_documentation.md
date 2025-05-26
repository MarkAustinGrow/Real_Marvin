# Marvin AI Agent - Codebase Documentation

## Project Overview
Marvin AI Agent is an autonomous AI character that generates and manages content, interacts with social media, and maintains its own blog. The system is designed to be fully automated while maintaining a consistent persona and engaging with the community.

## Tech Stack
- **Backend**: Node.js with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Content Generation**: OpenAI API, Anthropic Claude API
- **Image Generation**: Stable Diffusion/Midjourney/DALL·E
- **Voice Generation**: ElevenLabs/PlayHT
- **Content Management**: WordPress REST API
- **Social Media Integration**: Various platform APIs

## Project Structure
```
Real-Marvin/
├── src/
│   ├── index.ts                # Application entry point
│   ├── test-image-tweet.ts     # Test script for image tweets
│   ├── test-engagement.ts      # Test script for engagement system
│   ├── test-persona-upgrade.ts # Test script for persona upgrade
│   ├── test-claude-tweets.ts   # Test script for Claude tweet generation
│   ├── engagement-scheduler.ts # Scheduler for engagement monitoring
│   └── web-server.ts           # Web interface server
├── services/
│   ├── supabase/
│   │   └── SupabaseService.ts  # Database interaction layer
│   ├── content/
│   │   ├── ContentGenerator.ts # Content generation service
│   │   └── ImageTweetService.ts # Image tweet service
│   ├── anthropic/
│   │   └── AnthropicService.ts # Anthropic Claude integration
│   ├── twitter/
│   │   └── TwitterService.ts   # Twitter API integration
│   ├── engagement/
│   │   └── EngagementService.ts # User engagement management
│   ├── shared/
│   │   └── PromptBuilder.ts    # Shared prompt building utility
│   └── grok/
│       └── GrokService.ts      # Grok API integration for responses
├── config/
│   └── index.ts                # Configuration management
├── sql/
│   └── create_engagement_metrics_table.sql # SQL for engagement table
├── test-rate-limits.sh         # Rate limiting test script (Linux/Mac)
├── test-rate-limits.bat        # Rate limiting test script (Windows)
└── types/
    └── index.ts                # TypeScript type definitions
```

## Setup Instructions

### 1. Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Supabase account
- OpenAI API key
- Various social media API keys

### 2. Environment Setup
Create a `.env` file in the root directory with the following variables:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
GROK_API_KEY=your_grok_api_key
GROK_API_ENDPOINT=https://api.x.ai/v1/chat/completions
ADMIN_PASSWORD=your_web_interface_password
```

### 3. Database Schema
The Supabase database requires the following tables:

#### character_files
```sql
create table character_files (
    id uuid primary key default uuid_generate_v4(),
    agent_name text not null,
    display_name text not null,
    content jsonb not null,
    version integer not null default 1,
    is_active boolean not null default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add indexes
create index idx_character_files_agent_name on character_files(agent_name);
create index idx_character_files_is_active on character_files(is_active);
```

#### engagement_metrics
```sql
create table engagement_metrics (
    id uuid primary key default uuid_generate_v4(),
    date date not null,
    likes integer default 0,
    comments integer default 0,
    views integer default 0,
    platform varchar(50) not null,
    user_id text,
    username text,
    engagement_type text,
    tweet_id text,
    tweet_content text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add indexes
create index idx_engagement_metrics_date on engagement_metrics(date);
create index idx_engagement_metrics_platform on engagement_metrics(platform);
```

#### images
The images table stores artwork data used for image tweets:
```sql
create table images (
    id uuid primary key default uuid_generate_v4(),
    prompt_id uuid references prompts(id),
    image_url text,
    x_posted boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add indexes
create index idx_images_prompt_id on images(prompt_id);
create index idx_images_x_posted on images(x_posted);
```

The `x_posted` flag tracks whether an image has been posted to X (Twitter) to prevent duplicate posts.

The `content` field should contain a JSON object with the following structure:
```json
{
    "bio": ["array", "of", "bio", "elements"],
    "lore": ["array", "of", "lore", "elements"],
    "style": {
        "all": ["general", "style", "elements"],
        "chat": ["chat", "specific", "style"],
        "post": ["post", "specific", "style"]
    },
    "topics": ["array", "of", "topics"],
    "adjectives": ["array", "of", "descriptive", "words"]
}
```

### 4. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/Real-Marvin.git
cd Real-Marvin

# Install dependencies
npm install

# Start the application
npm start
```

## Core Components

### 1. SupabaseService
The `SupabaseService` class manages all database interactions using the Supabase client. It follows the Singleton pattern to maintain a single database connection throughout the application lifecycle.

Key methods:
- `getInstance()`: Returns the singleton instance
- `getCharacterData(agentName: string)`: Retrieves character data from the database

### 2. ContentGenerator
The `ContentGenerator` class handles the generation of various content types using the character's persona data.

Features:
- Daily blog post generation
- Social media content creation
- Response generation for interactions

### 3. AnthropicService
The `AnthropicService` class integrates with the Anthropic Claude API to generate poetic and creative content.

Key methods:
- `getInstance()`: Returns the singleton instance
- `generateTweet(promptText: string, isQuestion: boolean = false)`: Generates a tweet based on a prompt text, with special handling for questions

Recent improvements:
- Enhanced prompt engineering to detect and directly answer questions
- Added specialized prompts for questions vs. non-questions
- Implemented a two-part response structure for questions: direct answer followed by poetic elaboration

### 4. ImageTweetService
The `ImageTweetService` class handles the generation and posting of tweets that include Marvin's artwork.

Key methods:
- `getInstance()`: Returns the singleton instance
- `generateAndPostImageTweet()`: Generates and posts a tweet with artwork
- `downloadImage(url: string)`: Downloads an image from a URL to a temporary file
- `getRandomImage()`: Gets a random image from the database that hasn't been posted yet (x_posted = false)
- `markImageAsPosted(imageId: string)`: Marks an image as posted to prevent future duplication
- `getPromptById(promptId: string)`: Gets a prompt by ID
- `generateTweetTextForImage(promptText: string)`: Generates tweet text for an image

The service includes a duplicate prevention system that tracks which images have been posted to X (Twitter) using the x_posted flag in the database. After successfully posting an image, it marks the image as posted to ensure it won't be selected for future tweets.

### 5. TwitterService
The `TwitterService` class handles interactions with the Twitter API with comprehensive rate limiting and optimization features.

Key methods:
- `getInstance()`: Returns the singleton instance
- `postTweet(content: PostContent, mediaIds?: string[], replyToTweetId?: string)`: Posts content to Twitter with optional reply functionality
- `uploadMedia(mediaPath: string)`: Uploads media to Twitter
- `formatContent(content: PostContent)`: Formats content for Twitter (no longer adds hashtags)
- `getOwnUsername()`: Gets the authenticated user's username with 24-hour caching to prevent self-mention loops
- `monitorEngagements()`: Monitors and processes user engagements with optimized API usage
- `fetchRecentEngagements(tweetId?: string, sinceId?: string)`: Fetches mentions with optimized API calls
- `isEmergencyQuotaMode()`: Checks if API quota is critically low (< 30 calls remaining)
- `getApiUsageStats()`: Returns current API usage statistics

Recent improvements:
- **Rate Limiting Optimization**: Implemented comprehensive rate limiting with 70% reduction in API usage
- **Smart Scheduling**: Dynamic engagement monitoring based on time of day (peak/off-peak/overnight)
- **Emergency Quota Protection**: Token bucket system prevents quota exhaustion
- **Username Caching**: 24-hour cache eliminates redundant API calls
- **API Call Optimization**: Skipped expensive engagement analysis calls to conserve quota
- Enhanced username extraction for mentions using Twitter API's user data
- Removed hashtag addition from tweets to keep them cleaner
- Improved error handling for API responses
- Added proper threaded reply functionality with replyToTweetId parameter
- Enhanced conversation tracking with conversation_id and parent_tweet_id
- Added self-mention loop prevention using getOwnUsername
- Improved engagement data processing to include conversation context

### 6. EngagementService
The `EngagementService` class manages user interactions and automated responses.

Key methods:
- `getInstance()`: Returns the singleton instance
- `logEngagement(engagement: EngagementMetric)`: Logs an engagement event to the database
- `detectRecurringFans(threshold: number, timeframeDays: number)`: Identifies recurring fans based on engagement frequency
- `generateDailyWrapup()`: Generates a summary of the day's engagements
- `getRules()`: Gets the current engagement rules
- `updateRules(newRules: EngagementRule[])`: Updates the engagement rules
- `generateClaudeResponse(prompt: string, characterData: any, isQuestion: boolean)`: Generates a response using Claude Sonnet primed with character data
- `isQuestion(text: string)`: Detects if a text contains a question
- `isTweetProcessed(tweetId: string)`: Checks if a tweet has already been processed
- `recordTweetProcessing(conversationDetails: any)`: Records a processed tweet in the conversations table
- `updateLastCheckedAt(tweetId: string)`: Updates the last_checked_at timestamp for a conversation

Recent improvements:
- Added a new mention rule that always responds to mentions
- Implemented Claude Sonnet for generating responses to mentions
- Added character data priming from Supabase to inform Claude's responses
- Removed hardcoded usernames to prevent spamming real users
- Added question detection to provide direct answers before poetic responses
- Implemented conversation tracking to prevent duplicate responses
- Added self-mention loop prevention to avoid infinite reply chains
- Enhanced response context with conversation history

### 7. GrokService
The `GrokService` class integrates with the Grok API to generate humorous responses.

Key methods:
- `getInstance()`: Returns the singleton instance
- `generateHumorousReply(context: string)`: Generates a witty response based on context

## Rate Limiting and API Optimization

The system implements comprehensive rate limiting improvements to optimize Twitter API usage and prevent quota exhaustion.

### Overview
The rate limiting system reduces Twitter API usage by **70%** (from ~200 to ~60 calls/day) while maintaining full functionality.

### Key Features

#### 1. Smart Time-Based Engagement Monitoring
Dynamic scheduling based on user activity patterns:
- **Peak hours** (11am-5pm): 1-hour intervals = 6 calls/day
- **Off-peak** (6am-11am, 5pm-10pm): 2-hour intervals = 5 calls/day  
- **Overnight** (10pm-6am): 4-hour intervals = 2 calls/day
- **Total**: ~13 calls/day (73% reduction from previous 48 calls/day)

#### 2. Emergency Quota Protection
- **Token bucket system**: Tracks remaining API calls in real-time
- **Emergency mode**: Activates when < 30 calls remaining
- **Smart skipping**: Graceful degradation of non-critical features
- **Proactive management**: Prevents quota violations before they occur

#### 3. API Call Optimization
- **Username caching**: 24-hour cache eliminates redundant API calls
- **Expensive call elimination**: Removed `tweetLikedBy()` and `tweetRetweetedBy()` calls
- **Focus on mentions**: Prioritizes highest-value interactions
- **Result limiting**: Limited search results to 10 items max

#### 4. Enhanced Rate Limit Handling
- **Better detection**: Improved 429 error handling
- **Automatic backoff**: Exponential delays with reset time tracking
- **Proactive checks**: Quota validation before making calls

### Implementation Details

#### Token Bucket Algorithm
```typescript
class TokenBucket {
    async consume(tokens: number = 1): Promise<boolean> {
        this.refill();
        
        if (this.tokens < tokens) {
            console.log(`Rate limit would be exceeded. Available: ${this.tokens}`);
            return false;
        }
        
        this.tokens -= tokens;
        return true;
    }
}
```

#### Smart Scheduling
The engagement scheduler automatically adjusts monitoring frequency based on time of day:
- Detects current hour and applies appropriate interval
- Logs scheduling decisions for monitoring
- Provides substantial API usage reduction during low-activity periods

### Testing and Monitoring

#### Test Scripts
```bash
# Test rate limiting improvements
./test-rate-limits.sh    # Linux/Mac
test-rate-limits.bat     # Windows
```

#### Expected Log Messages
- `"Starting engagement scheduler with smart time-based monitoring"`
- `"Next engagement check in X minutes (peak hours/off-peak/overnight)"`
- `"Emergency quota mode activated. Only X API calls remaining."`
- `"Skipping expensive engagement calls to conserve API quota"`

#### API Usage Statistics
The system provides real-time API usage tracking:
```typescript
public getApiUsageStats(): { remaining: number; total: number; percentage: number }
```

### Results
- **70% reduction** in daily API usage
- **Zero rate limit violations** 
- **190 calls headroom** for future growth
- **Maintained functionality** while optimizing usage

For detailed implementation information, see `Rate_Limiting_Improvements.md`.

## Development Guidelines

### 1. Code Style
- Use TypeScript for all new code
- Follow SOLID principles
- Implement proper error handling
- Add comprehensive logging
- Write unit tests for new features

### 2. Git Workflow
- Create feature branches from `main`
- Use descriptive commit messages
- Submit PRs for code review
- Keep commits atomic and focused

### 3. Error Handling
- Use try-catch blocks for async operations
- Implement proper error logging
- Create custom error types when needed
- Handle edge cases gracefully

### 4. Testing
- Write unit tests for all new features
- Use Jest for testing framework
- Mock external services in tests
- Maintain high test coverage

## Deployment

### 1. Production Setup
- Set up proper environment variables
- Configure logging services
- Set up monitoring and alerts
- Configure backup systems

### 2. Monitoring
- Monitor database performance
- Track API rate limits
- Monitor content generation quality
- Track social media engagement

## Roadmap and Future Improvements
See `Roadmap.md` for detailed development phases and upcoming features.

For image tweet functionality specifically, see `Image_Tweets.md` for implementation details.

## Scheduled Tasks
The application runs the following scheduled tasks with optimized API usage:

1. ~~Morning Tweet (9:00 AM): Regular text tweet~~ (Disabled)
2. Afternoon Tweet (1:00 PM): Image tweet with artwork
3. ~~Evening Tweet (5:00 PM): Regular text tweet~~ (Disabled)
4. **Smart Engagement Monitoring**: Dynamic intervals based on time of day (peak/off-peak/overnight)
5. ~~Daily Engagement Wrap-up (9:00 PM): Posts a summary of the day's engagements~~ (Disabled)

The image tweets use Anthropic Claude to generate poetic descriptions based on the artwork's original prompt.
The engagement responses use:
- Claude Sonnet for mentions, primed with Marvin's character data from Supabase
- Grok (with OpenAI fallback) for other types of engagements

## Recent Improvements

### Account Priority Manager Frontend Fix (May 25, 2025)
**RESOLVED**: Complete frontend fix for the Account Priority Manager web interface:

1. **Issue Resolution**:
   - Fixed incomplete JavaScript functions that were causing "Loading..." to display instead of real API data
   - Added all missing JavaScript functions: `showError()`, `updateAccountRate()`, `updateEngagementRate()`, `applyRateChanges()`, `resetToConservative()`, `updateProjectedUsage()`
   - Resolved unterminated template literal causing JavaScript errors

2. **Features Now Working**:
   - **API Usage Dashboard**: Displays real-time API usage data (e.g., "37/250 calls used (14.8%)")
   - **Rate Control Sliders**: Fully functional account and engagement monitoring rate controls
   - **Database Persistence**: Rate settings save to and load from database via `/api/rate-settings` endpoint
   - **Dynamic Calculations**: Projected usage updates automatically when sliders change
   - **Warning System**: Shows warnings when API usage rates are set too high
   - **Reset Functionality**: One-click reset to conservative settings

3. **Technical Implementation**:
   - Complete error handling with user-friendly notifications
   - Real-time slider updates with immediate visual feedback
   - Responsive design maintained across all functions
   - Integration with existing backend APIs

**Result**: The Account Priority Manager at `http://real.marvn.club:3000/account-priority-manager.html` now displays real data and has fully functional rate controls with database persistence.

### Rate Limiting and API Optimization
Comprehensive rate limiting improvements implemented to resolve Twitter API quota exhaustion:

1. **Smart Time-Based Monitoring**: Dynamic scheduling reduces engagement monitoring from 48 to 13 calls per day
2. **Emergency Quota Protection**: Token bucket system with emergency mode when < 30 calls remaining
3. **API Call Optimization**: Username caching, expensive call elimination, result limiting
4. **Enhanced Error Handling**: Better 429 detection, automatic backoff, proactive quota management

**Results**: 70% reduction in daily API usage while maintaining full functionality.

### Conversation Tracking
A new `conversations` table has been implemented to track processed tweets and prevent duplicate responses:

```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tweet_id TEXT NOT NULL UNIQUE,
    conversation_id TEXT,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    tweet_content TEXT,
    response_tweet_id TEXT,
    response_content TEXT,
    is_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_conversations_conversation_id ON conversations(conversation_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_last_checked_at ON conversations(last_checked_at);
```

The `last_checked_at` field allows the system to track when a conversation was last checked for new replies, enabling more efficient conversation monitoring.

### Threaded Replies
The system now supports proper threaded replies instead of creating new tweets that mention users:
- The TwitterService has been updated to support the `replyToTweetId` parameter
- Replies are now posted as direct replies to the original tweet
- Conversation context is included in the prompt to Claude for more relevant responses

### Question Detection and Direct Answers
The system now detects questions in user messages and provides direct answers:
- Added question detection using question marks and common question words/phrases
- Enhanced Claude prompting to first provide a direct answer, then transition to poetic style
- Improved user experience by ensuring questions are actually answered

### Self-Mention Loop Prevention
The system now prevents infinite self-mention loops:
- Added username detection to identify mentions from the bot itself
- Implemented filtering to ignore self-mentions
- Prevents the bot from responding to its own tweets that mention itself

### Twitter Reply Improvements
The system now has improved Twitter replies based on team feedback:

1. **Removed Emojis from Replies**:
   - All emojis have been removed from Twitter replies
   - Creates a cleaner, more professional appearance
   - Consistent with the emoji removal in blog posts

2. **Shortened Responses**:
   - Maximum character limit reduced from 200 to 100 characters
   - Creates more concise interactions
   - Improves readability on mobile devices

3. **Implementation Details**:
   - Updated AnthropicService.ts to remove instructions to include emojis
   - Updated PromptBuilder.ts to specify 100 character limit
   - Updated OpenAIService.ts to maintain consistent style across all models
   - Applied changes to all types of Twitter interactions (mentions, questions, engagements)

For more details, see `TWITTER_REPLY_IMPROVEMENTS.md`.

### Blog Post Emoji Removal
The system now ensures that blog posts don't contain any emojis:

1. **Multiple Layers of Protection**:
   - Explicit instructions in the prompt to Claude to not include emojis
   - Post-processing regex filtering to remove any emojis that might slip through
   - Instructions in both system and user prompts for redundancy

2. **Implementation Details**:
   - Added clear instructions in `buildBlogUserPrompt` method in AnthropicService.ts
   - Added explicit requirement in the user prompt: "NOT include any emojis or emoticons"
   - Added the same instruction to the system prompt to reinforce the requirement
   - Implemented a regex-based emoji removal in the `parseBlogResponse` method
   - The regex covers all Unicode emoji ranges to ensure comprehensive removal
   - Applied emoji cleaning to title, content, and excerpt fields

3. **Technical Approach**:
   - Uses Unicode character ranges to identify and remove emoji characters
   - Preserves all other text content while removing only emoji characters
   - Ensures consistent, professional blog post content

### Blog Post Enhancer
The system now includes a Blog Post Enhancer that fills in missing metadata fields for blog posts:

1. **Purpose**:
   - Ensures all blog posts have complete metadata for proper display in the web interface
   - Fixes issues with missing fields that caused errors when viewing blog posts
   - Improves the quality and consistency of blog post metadata

2. **Features**:
   - Automatically enhances new blog posts when they're created
   - Can be run on existing blog posts to fill in missing fields
   - Uses AI to analyze content and determine appropriate metadata
   - Provides fallbacks for all fields to ensure robustness

3. **Implementation Details**:
   - New `BlogPostEnhancer` class in `src/blog-post-enhancer.ts`
   - CLI script in `src/enhance-blog-posts.ts` for batch processing
   - Web server integration for automatic enhancement of new posts
   - Convenience batch files (`enhance-blog-posts.bat` and `enhance-blog-posts.sh`)

4. **Fields Enhanced**:
   - **category**: Determined by analyzing the blog post content
   - **tone**: Determined by analyzing the blog post content
   - **tags**: Generated based on the blog post content
   - **memory_refs**: References to relevant memories
   - **character_id**: Set to Marvin's character ID
   - **image_url**: Extracted from the blog post content if available

For more details, see `BLOG_POST_ENHANCER.md`.

### Persona Upgrade
The system now uses a standardized tweet generation method across all LLMs (OpenAI, Claude, Grok):

1. **Shared PromptBuilder Utility**:
   - New `services/shared/PromptBuilder.ts` utility for consistent prompt building
   - Standardizes character voice across all tweet types
   - Incorporates character data from Supabase
   - Includes memory integration for all tweet types
   - Handles different contexts (regular tweets, image tweets, engagement responses)

2. **Standardized Tweet Generation**:
   - All tweet types (regular, image, engagement) use the same high-quality approach
   - Consistent character voice across all models
   - Improved prompt engineering for better quality tweets
   - Memory integration for more contextually relevant content

3. **Testing Scripts**:
   - `test-persona-upgrade.ts`: Tests the standardized tweet generation
   - `test-claude-tweets.ts`: Tests Claude-specific tweet generation
   - Batch files for easy testing on different platforms

4. **Implementation Details**:
   - AnthropicService updated to use the standardized prompt builder
   - GrokService updated to use the standardized prompt builder with OpenAI fallback
   - ImageTweetService updated to use the standardized approach
   - EngagementService updated to incorporate memories in responses

This upgrade ensures that all content generated by Marvin maintains a consistent voice and quality regardless of which LLM is used for generation.

## Planned Improvements

### Enhanced Conversation Analytics
Future improvements to the conversation system could include:
- Advanced analytics on conversation patterns
- User preference tracking based on engagement
- Personalized response generation based on user history
- Conversation topic clustering and trend analysis

## X Account Monitoring and Tweet Scraping

The system includes a feature for monitoring X (formerly Twitter) accounts and caching their tweets for analysis.

### Overview
This feature allows Marvin to:
1. Monitor influential accounts in the industry
2. Analyze engagement patterns
3. Identify trending topics
4. Gather inspiration for content creation
5. Monitor competitors

### Components
1. **TwitterMonitorService**: Handles fetching tweets from X API
2. **AccountMonitorService**: Manages account monitoring and scheduling
3. **Account Monitor Scheduler**: Runs the monitoring process at scheduled intervals

### Database Schema
The feature uses several tables:

1. **x_accounts**: Stores accounts to monitor
   - Fields: id, handle, platform, priority, activity_level, last_checked, next_check_date, etc.

2. **tweets_cache**: Stores cached tweets
   - Fields: id, account_id, tweet_id, tweet_text, tweet_url, created_at, engagement_score, etc.

3. **accounts_to_review**: Tracks accounts with errors
   - Fields: id, handle, error_message, error_code, status, etc.

4. **api_usage_stats**: Tracks API usage
   - Fields: id, date, calls_made, daily_limit, reset_time, etc.

### Activity-Based Monitoring
Accounts are monitored based on their activity level:
- **High Activity**: Checked daily
- **Medium Activity**: Checked every 3 days
- **Low Activity**: Checked weekly

### Engagement Scoring
Tweets are scored using a weighted formula:
- Retweets: 1.5x weight
- Quotes: 1.2x weight
- Replies: 1.0x weight
- Likes: 0.8x weight

### Web Interface Integration
The Account Monitoring feature is integrated into the web interface:
- Accounts Tab: View and manage monitored accounts
- Tweets Tab: View cached tweets for selected accounts
- Process Tab: Manually trigger account processing

For more details, see `X-SCRAPING.md`.

## Web Interface

The application includes a web interface for managing and testing various features:

### Accessing the Web Interface
- URL: http://your-server-ip:3000
- Authentication: Basic auth (username: admin, password: configured in .env)

### Features
1. Status Dashboard: Shows when the next scheduled tweet will be posted
2. Test Tweet Generation: Generate and post test tweets on demand
3. Engagement Rules Management: Configure how Marvin responds to user interactions
4. Blog Post Generation: Create and manage blog posts
5. **Account Priority Manager**: Fully functional interface for managing monitored accounts with real-time API usage data and rate controls

### Responsive Design
The web interface features a responsive design that works well on both mobile and desktop:

1. **Mobile View**:
   - Vertical stacking of all panels for easy scrolling
   - Full-width components for optimal small-screen viewing
   - Touch-friendly buttons and controls

2. **Desktop View**:
   - Multi-column grid layout that efficiently uses horizontal space
   - Logical grouping of related panels in rows:
     - Top row: Status and Tweet Preview panels
     - Second row: Generate Test Tweet, Generate Blog Post, and Test Blog Post panels
     - Third row: Engagement Rules and Account Monitoring panels
   - Equal-height cards within each row for visual consistency
   - Proper spacing and margins between panel rows

3. **Implementation Details**:
   - Uses Bootstrap's responsive grid system with custom breakpoints
   - Custom CSS for card heights and flex layouts
   - Media queries for different screen sizes
   - Row-based organization with semantic grouping of functionality

For more details, see `WEB_INTERFACE.md`.

## Engagement System

The engagement system allows Marvin to interact with users who engage with his content on Twitter.

### Overview
The system:
1. Monitors user engagements (likes, reposts, replies, follows, mentions)
2. Identifies recurring fans and engagement patterns
3. Responds to engagements with Marvin's signature witty, sarcastic personality
4. Generates daily wrap-ups of engagement activity

### Components
1. **GrokService**: Generates humorous responses using the Grok API (with OpenAI fallback)
2. **EngagementService**: Tracks and processes user engagements, applying rules to determine when to respond
3. **TwitterService Extensions**: Monitors and fetches engagements from Twitter
4. **EngagementScheduler**: Manages timing of engagement monitoring and daily wrap-ups

### Engagement Rules
The system uses configurable rules to determine when to respond to engagements:

1. **Rule Types**:
   - Like Rule: Respond if a user has liked X tweets within Y days
   - Repost Rule: Respond if a verified user reposts Marvin's content
   - Follow Rule: Respond if an art-focused user follows Marvin
   - Reply Rule: Respond to first-time replies from users
   - Mention Rule: Always respond to mentions (highest priority)

2. **Rule Configuration**:
   - Each rule has a type, condition, action, and priority
   - Rules can be configured via the web interface
   - Higher priority rules take precedence when multiple rules match

### Testing
The system includes test scripts for verifying engagement functionality:

```bash
# Test with a specific tweet ID
npm run test-engagement <tweet_id>

# Or use the batch files
./test-engagement.bat <tweet_id>  # Windows
./test-engagement.sh <tweet_id>   # Linux/Mac
```

For more details, see `ENGAGEMENT_SYSTEM.md`.

## Troubleshooting

### Common Issues
1. Database Connection Issues
   - Verify Supabase credentials
   - Check network connectivity
   - Verify RLS policies

2. Content Generation Issues
   - Check API rate limits
   - Verify API keys
   - Check character data format

3. Performance Issues
   - Monitor database query performance
   - Check API response times
   - Monitor memory usage

4. Engagement System Issues
   - Verify Twitter API credentials and rate limits
   - Check Grok API connectivity
   - Verify engagement_metrics table structure
   - Review engagement rules configuration

5. **Rate Limiting Issues**
   - Monitor API usage with `./test-rate-limits.sh` or `test-rate-limits.bat`
   - Check for emergency quota mode activation in logs
   - Verify smart scheduling is working (variable intervals)
   - Look for "Skipping expensive engagement calls" messages
   - Ensure quota resets are being tracked properly

6. **Web Interface Issues**
   - ✅ **Account Priority Manager**: Previously showed "Loading..." instead of real data - **RESOLVED** (May 25, 2025)
   - Verify web server is running on correct port (default: 3000)
   - Check browser console for JavaScript errors
   - Ensure proper authentication (admin username/password)

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5.
