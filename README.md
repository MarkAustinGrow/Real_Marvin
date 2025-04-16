# Marvin AI Agent

Marvin AI Agent is an autonomous AI character that generates and posts content to Twitter. The system is designed to be fully automated while maintaining a consistent persona and engaging with the community.

## Project Overview

Marvin is a 28-year-old robotics engineer and AI specialist known for his deadpan humor, quiet genius, and love for building sentient machines with a touch of sarcasm. This project creates an AI agent that posts tweets in Marvin's persona, maintaining his unique voice and style.

## Features

- Character-driven content generation based on predefined persona traits
- Category-based tweet generation with consistent voice and style
- Automatic hashtag generation and formatting
- Twitter integration for automated posting
- Robust error handling and logging

## Tech Stack

- **Backend**: Node.js with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Content Generation**: OpenAI API
- **Social Media Integration**: Twitter API v2

## Project Structure

```
Real-Marvin/
├── src/
│   └── index.ts              # Application entry point
├── services/
│   ├── content/
│   │   └── ContentGenerator.ts # Content generation service
│   ├── openai/
│   │   └── OpenAIService.ts  # OpenAI API integration
│   ├── supabase/
│   │   └── SupabaseService.ts # Database interaction layer
│   └── twitter/
│       └── TwitterService.ts # Twitter API integration
├── config/
│   └── index.ts              # Configuration management
└── types/
    └── index.ts              # TypeScript type definitions
```

## Setup Instructions

### 1. Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account
- OpenAI API key
- Twitter API keys

### 2. Environment Setup

Create a `.env` file in the root directory with the required variables (see `.env.example` for a template).

### 3. Installation

```bash
# Clone the repository
git clone https://github.com/MarkAustinGrow/Real_Marvin.git
cd Real_Marvin

# Install dependencies
npm install

# Start the application
npm start
```

## Roadmap

See `Roadmap.md` for detailed development phases and upcoming features.

## Current Limitations

- Limited to Twitter platform (no multi-platform support yet)
- Text-only content (no image or video generation)
- Single character support (Marvin only)
- Manual execution (no scheduling or automation)

## License

[MIT License](LICENSE)
