# Marvin AI Agent - Current Build Specifications

## Core Functionality
- Autonomous AI character (Marvin) that generates and posts content to Twitter
- Character-driven content generation based on predefined persona traits
- Category-based tweet generation with consistent voice and style
- Image tweets with artwork and AI-generated poetic descriptions
- Automatic hashtag generation and formatting
- Twitter integration for automated posting
- Scheduled posting three times daily (morning, afternoon, evening)
## Technical Architecture
- Node.js backend with TypeScript for type safety
- Singleton pattern for service classes (SupabaseService, TwitterService, ContentGenerator, OpenAIService, AnthropicService, ImageTweetService)
- Modular design with separation of concerns between services
- Database integration via Supabase (PostgreSQL)
- AI content generation via OpenAI API and Anthropic Claude API
- Social media integration via Twitter API v2
- Automated scheduling for regular posting
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
## Error Handling
- Comprehensive error handling throughout the application
- Specific error messages for different failure scenarios
- Graceful degradation when services are unavailable
- Detailed logging for troubleshooting
## Current Limitations
- Limited to Twitter platform (no multi-platform support yet)
- Single character support (Marvin only)
- Limited image tweet customization options
## Configuration
- Environment-based configuration via .env file
- API keys for OpenAI, Anthropic, and Twitter
- Database connection parameters
- Character selection parameter
- Scheduling parameters for tweet timing
## Future Expansion Points
- WordPress integration for blog posts (planned)
- Video content generation (planned)
- Voice generation integration (planned)
- Multi-character support (infrastructure in place)
- Community interaction capabilities (planned)
- Advanced analytics and engagement tracking (planned)
