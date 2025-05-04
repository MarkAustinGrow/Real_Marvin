#!/bin/bash
# Test script for the Marvin AI Agent engagement system

# Display header
echo "====================================================="
echo "Marvin AI Agent - Engagement System Test"
echo "====================================================="
echo ""

# Check if a tweet ID was provided
if [ -z "$1" ]; then
    echo "❌ Error: No tweet ID provided"
    echo "Usage: ./test-engagement.sh <tweet_id>"
    echo ""
    echo "Example: ./test-engagement.sh 1234567890123456789"
    echo ""
    echo "You can find a tweet ID in the URL of a tweet:"
    echo "https://twitter.com/username/status/1234567890123456789"
    echo "                                    ↑ This is the tweet ID"
    exit 1
fi

# Display test information
echo "🧪 Running engagement system test with tweet ID: $1"
echo ""
echo "This test will:"
echo "1. Monitor engagements for the specified tweet"
echo "2. Generate a sample humorous reply using Grok/OpenAI"
echo "3. Detect recurring fans based on engagement history"
echo "4. Generate a daily wrap-up of engagement activity"
echo "5. Simulate an engagement and response"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Run the test
echo "🚀 Starting test..."
echo ""
npm run test-engagement $1

# Display completion message
echo ""
echo "====================================================="
echo "Test completed! Check the output above for results."
echo "====================================================="
echo ""
echo "To integrate the engagement system into your Marvin instance:"
echo "1. Make sure the engagement_metrics table exists in your database"
echo "2. Add GROK_API_KEY to your .env file (optional, will fall back to OpenAI)"
echo "3. The system is already integrated in src/index.ts"
echo ""
echo "For more information, see ENGAGEMENT_SYSTEM.md"
