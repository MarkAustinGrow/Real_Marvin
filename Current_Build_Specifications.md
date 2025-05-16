# Marvin AI Agent - Current Build Specifications

## Core Functionality
- Autonomous AI character (Marvin) that generates and posts content to Twitter
- Character-driven content generation based on predefined persona traits
- Category-based tweet generation with consistent voice and style
- Image tweets with artwork and AI-generated poetic descriptions
- Automatic hashtag generation and formatting
- Twitter integration for automated posting
- Scheduled posting three times daily (morning, afternoon, evening)
- Blog post scheduling and automatic posting to Twitter
- User engagement tracking and automated responses to interactions
- Daily engagement wrap-ups highlighting fan interactions
## Technical Architecture
- Node.js backend with TypeScript for type safety
- Singleton pattern for service classes (SupabaseService, TwitterService, ContentGenerator, OpenAIService, AnthropicService, ImageTweetService, GrokService, EngagementService, BlogPostScheduler)
- Modular design with separation of concerns between services
- Database integration via Supabase (PostgreSQL)
- AI content generation via OpenAI API and Anthropic Claude API
- Social media integration via Twitter API v2
- Automated scheduling for regular posting and blog content
- Web interface for administration and configuration
## Database Schema
- character_files table storing character data including:
  - Basic info (name, display name)
  - Personality traits (bio, lore, adjectives)
  - Style preferences (general, chat, post)
  - Content topics and interests
- images table storing artwork data including:
  - Image URLs and metadata
  - Associated prompt IDs
  - Generation settings
- prompts table storing text prompts used to generate artwork
- engagement_metrics table storing user interaction data including:
  - User information (ID, username)
  - Engagement type (like, repost, reply, follow, mention)
  - Tweet information (ID, content)
  - Timestamp data
- blog_posts table storing blog content including:
  - Title and markdown content
  - Status (draft, ready_to_tweet, posted)
  - Post URL after publishing
  - Creation and update timestamps
- tweet_drafts table storing tweet records for blog posts including:
  - Reference to blog post ID
  - Tweet content and post URL
  - Status and metadata (for thread tracking)
## Components
### SupabaseService:
- Database connection and query management
- Character data retrieval with fuzzy search fallback
- Image and prompt data retrieval
- Connection testing and error handling

### OpenAIService:
- Integration with OpenAI Chat Completions API
- Dynamic prompt generation based on character data
- Error handling for API failures

### AnthropicService:
- Integration with Anthropic Claude API
- Generation of poetic tweet content based on artwork prompts
- Error handling for API failures

### ContentGenerator:
- Tweet generation based on character persona
- Category-based content creation
- Hashtag generation and management

### ImageTweetService:
- Image tweet generation and posting
- Retrieval of artwork from database
- Integration with AnthropicService for tweet text generation
- Image downloading and processing

### TwitterService:
- Twitter API integration for posting content
- Content formatting to meet Twitter requirements
- Media upload capabilities
- Robust error handling for API failures
- Engagement monitoring and tracking
- Fetching likes, reposts, and replies for tweets

### GrokService:
- Integration with Grok API for humorous responses
- OpenAI fallback when Grok API is unavailable
- Character-consistent response generation
- Dynamic prompt generation based on engagement context

### EngagementService:
- Tracking and logging user engagements
- Rules-based engagement response system
- Recurring fan detection and prioritization
- Daily engagement wrap-up generation
- Engagement metrics analysis

### EngagementScheduler:
- Scheduled engagement monitoring (every 30 minutes)
- Daily wrap-up scheduling (9:00 PM)
- Automated engagement response timing

### BlogPostScheduler:
- Scheduled blog post checking and posting (configurable days and times)
- Automatic conversion of blog content to Twitter posts
- Support for both single tweets and thread creation for longer content
- Markdown to plain text conversion for Twitter compatibility
- Queue management for failed posts with exponential backoff retry logic
- Detailed logging and status tracking in database
## Error Handling
- Comprehensive error handling throughout the application
- Specific error messages for different failure scenarios
- Graceful degradation when services are unavailable
- Detailed logging for troubleshooting
## Current Limitations
- Limited to Twitter platform (no multi-platform support yet)
- Single character support (Marvin only)
- Limited image tweet customization options
- Basic engagement rules without advanced user profiling
- Limited historical engagement analysis
## Web Interface
- Administrative dashboard for monitoring and control
- Status display showing next scheduled tweets
- Test tweet generation and posting functionality
- Engagement rules management interface
- Secure authentication with configurable credentials
- Accessible via HTTP on port 3000

## Configuration
- Environment-based configuration via .env file
- API keys for OpenAI, Anthropic, Twitter, and Grok
- Database connection parameters
- Character selection parameter
- Scheduling parameters for tweet timing
- Blog post scheduler configuration (enabled/disabled, days, time, dry run mode)
- Web interface authentication credentials
## Future Expansion Points
- Video content generation (planned)
- Voice generation integration (planned)
- Multi-character support (infrastructure in place)
- Enhanced community interaction capabilities (in progress)
- Advanced analytics and engagement tracking (in progress)
- Sophisticated user profiling for targeted responses (planned)
- A/B testing of engagement strategies (planned)
- X Articles API integration when available (planned)
