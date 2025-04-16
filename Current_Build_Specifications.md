Marvin AI Agent - Current Build Specifications
Core Functionality
Autonomous AI character (Marvin) that generates and posts content to Twitter
Character-driven content generation based on predefined persona traits
Category-based tweet generation with consistent voice and style
Automatic hashtag generation and formatting
Twitter integration for automated posting
Technical Architecture
Node.js backend with TypeScript for type safety
Singleton pattern for service classes (SupabaseService, TwitterService, ContentGenerator, OpenAIService)
Modular design with separation of concerns between services
Database integration via Supabase (PostgreSQL)
AI content generation via OpenAI API
Social media integration via Twitter API v2
Database Schema
character_files table storing character data including:
Basic info (name, display name)
Personality traits (bio, lore, adjectives)
Style preferences (general, chat, post)
Content topics and interests
Components
SupabaseService:

Database connection and query management
Character data retrieval with fuzzy search fallback
Connection testing and error handling
OpenAIService:

Integration with OpenAI Chat Completions API
Dynamic prompt generation based on character data
Error handling for API failures
ContentGenerator:

Tweet generation based on character persona
Category-based content creation
Hashtag generation and management
TwitterService:

Twitter API integration for posting content
Content formatting to meet Twitter requirements
Media upload capabilities
Robust error handling for API failures
Error Handling
Comprehensive error handling throughout the application
Specific error messages for different failure scenarios
Graceful degradation when services are unavailable
Detailed logging for troubleshooting
Current Limitations
Limited to Twitter platform (no multi-platform support yet)
Text-only content (no image or video generation)
Single character support (Marvin only)
Manual execution (no scheduling or automation)
Configuration
Environment-based configuration via .env file
API keys for OpenAI and Twitter
Database connection parameters
Character selection parameter
Future Expansion Points
WordPress integration for blog posts (planned)
Image generation capabilities (planned)
Voice generation integration (planned)
Scheduled posting functionality (planned)
Multi-character support (infrastructure in place)
Community interaction capabilities (planned)