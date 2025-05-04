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
│   └── grok/
│       └── GrokService.ts      # Grok API integration for responses
├── config/
│   └── index.ts                # Configuration management
├── sql/
│   └── create_engagement_metrics_table.sql # SQL for engagement table
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
- `generateTweet(promptText: string)`: Generates a tweet based on a prompt text

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
The `TwitterService` class handles interactions with the Twitter API.

Key methods:
- `getInstance()`: Returns the singleton instance
- `postTweet(content: PostContent, mediaIds?: string[])`: Posts content to Twitter
- `uploadMedia(mediaPath: string)`: Uploads media to Twitter
- `formatContent(content: PostContent)`: Formats content for Twitter
- `monitorEngagements()`: Monitors and processes user engagements with tweets
- `fetchEngagements(tweetId: string)`: Fetches likes, reposts, and replies for a specific tweet

### 6. EngagementService
The `EngagementService` class manages user interactions and automated responses.

Key methods:
- `getInstance()`: Returns the singleton instance
- `logEngagement(engagement: EngagementMetric)`: Logs an engagement event to the database
- `detectRecurringFans(threshold: number, timeframeDays: number)`: Identifies recurring fans based on engagement frequency
- `generateDailyWrapup()`: Generates a summary of the day's engagements
- `getRules()`: Gets the current engagement rules
- `updateRules(newRules: EngagementRule[])`: Updates the engagement rules

### 7. GrokService
The `GrokService` class integrates with the Grok API to generate humorous responses.

Key methods:
- `getInstance()`: Returns the singleton instance
- `generateHumorousReply(context: string)`: Generates a witty response based on context

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
The application runs the following scheduled tasks:

1. Morning Tweet (9:00 AM): Regular text tweet
2. Afternoon Tweet (1:00 PM): Image tweet with artwork
3. Evening Tweet (5:00 PM): Regular text tweet
4. Engagement Monitoring (Every 30 minutes): Checks for new user interactions
5. Daily Engagement Wrap-up (9:00 PM): Posts a summary of the day's engagements

The image tweets use Anthropic Claude to generate poetic descriptions based on the artwork's original prompt.
The engagement responses use Grok (with OpenAI fallback) to generate witty replies to user interactions.

## Web Interface

The application includes a web interface for managing and testing various features:

### Accessing the Web Interface
- URL: http://your-server-ip:3000
- Authentication: Basic auth (username: admin, password: configured in .env)

### Features
1. Status Dashboard: Shows when the next scheduled tweet will be posted
2. Test Tweet Generation: Generate and post test tweets on demand
3. Engagement Rules Management: Configure how Marvin responds to user interactions

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

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
[Add appropriate license information]
