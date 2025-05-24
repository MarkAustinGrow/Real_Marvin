#!/bin/bash

echo "🔍 Testing Rate Limiting Improvements"
echo "======================================"

# Check if Docker container is running
if ! docker ps | grep -q "real-marvin"; then
    echo "❌ Marvin container is not running"
    echo "Please start the container first with: docker start real-marvin"
    exit 1
fi

echo "✅ Marvin container is running"
echo ""

echo "📊 Checking recent logs for rate limiting improvements..."
echo ""

# Check for smart scheduling
echo "🕐 Smart Scheduling:"
docker logs real-marvin --tail 50 | grep -i "smart\|peak\|off-peak\|overnight\|next engagement check" | tail -5

echo ""

# Check for emergency quota mode
echo "🚨 Emergency Quota Protection:"
docker logs real-marvin --tail 100 | grep -i "emergency\|quota" | tail -3

echo ""

# Check for rate limit handling
echo "⚠️  Rate Limit Handling:"
docker logs real-marvin --tail 100 | grep -i "rate limit\|429\|skipping" | tail -5

echo ""

# Check for API optimization
echo "🎯 API Call Optimization:"
docker logs real-marvin --tail 100 | grep -i "optimized\|skipping.*expensive\|cached" | tail -3

echo ""

# Check current engagement monitoring frequency
echo "📈 Current Engagement Monitoring:"
docker logs real-marvin --tail 20 | grep -i "engagement monitoring"

echo ""

echo "🔧 Recommendations:"
echo "1. Monitor logs for 'Emergency quota mode activated' messages"
echo "2. Look for 'Next engagement check in X minutes' with varying intervals"
echo "3. Verify 'Skipping expensive engagement calls' messages"
echo "4. Check that rate limit violations have stopped"

echo ""
echo "📋 To continue monitoring:"
echo "docker logs -f real-marvin | grep -i 'engagement\\|quota\\|rate limit'"
