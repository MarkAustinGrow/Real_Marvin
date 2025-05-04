@echo off
REM Test script for the Marvin AI Agent engagement system

REM Display header
echo =====================================================
echo Marvin AI Agent - Engagement System Test
echo =====================================================
echo.

REM Check if a tweet ID was provided
if "%~1"=="" (
    echo X Error: No tweet ID provided
    echo Usage: test-engagement.bat ^<tweet_id^>
    echo.
    echo Example: test-engagement.bat 1234567890123456789
    echo.
    echo You can find a tweet ID in the URL of a tweet:
    echo https://twitter.com/username/status/1234567890123456789
    echo                                    ^ This is the tweet ID
    exit /b 1
)

REM Display test information
echo Running engagement system test with tweet ID: %1
echo.
echo This test will:
echo 1. Monitor engagements for the specified tweet
echo 2. Generate a sample humorous reply using Grok/OpenAI
echo 3. Detect recurring fans based on engagement history
echo 4. Generate a daily wrap-up of engagement activity
echo 5. Simulate an engagement and response
echo.
echo Press Enter to continue or Ctrl+C to cancel...
pause > nul

REM Run the test
echo Starting test...
echo.
call npm run test-engagement %1

REM Display completion message
echo.
echo =====================================================
echo Test completed! Check the output above for results.
echo =====================================================
echo.
echo To integrate the engagement system into your Marvin instance:
echo 1. Make sure the engagement_metrics table exists in your database
echo 2. Add GROK_API_KEY to your .env file (optional, will fall back to OpenAI)
echo 3. The system is already integrated in src/index.ts
echo.
echo For more information, see ENGAGEMENT_SYSTEM.md
