#!/bin/bash
echo "Testing Twitter replies with new improvements (no emojis, shorter responses)"
echo "=================================================================="

# Test a reply to a mention
echo "Testing reply to a mention..."
curl -X POST http://localhost:3000/api/test-tweet \
  -H "Content-Type: application/json" \
  -d '{"previewOnly": true, "promptText": "Hey @MarvinAI, what do you think about the future of AI?", "isQuestion": true}'

echo -e "\n\n"
echo "Testing reply to a regular engagement..."
curl -X POST http://localhost:3000/api/test-tweet \
  -H "Content-Type: application/json" \
  -d '{"previewOnly": true, "promptText": "I really liked your last tweet about technology!", "isQuestion": false}'

echo -e "\n\n"
echo "Done testing Twitter replies"
