#!/bin/bash

# Set the base URL
BASE_URL="http://localhost:3000"

echo "Testing GET /directories (default)"
curl -X GET "$BASE_URL/directories" | jq

echo -e "\nTesting GET /directories with relative=true"
curl -X GET "$BASE_URL/directories?relative=true" | jq

echo -e "\nTesting POST /directories"
curl -X POST "$BASE_URL/directories" \
  -H "Content-Type: application/json" \
  -d '{"directory": "'$(pwd)'"}' | jq

echo -e "\nTesting POST /prompt"
curl -X POST "$BASE_URL/prompt" \
  -H "Content-Type: application/json" \
  -d '{"command": "ls -la", "directory": "'$(pwd)'"}' | jq

echo -e "\nTesting POST /promptstream (this will stream output)"
echo "Press Ctrl+C to stop the stream"
curl -X POST "$BASE_URL/promptstream" \
  -H "Content-Type: application/json" \
  -d '{"command": "ping -c 5 localhost", "directory": "'$(pwd)'"}' \
  --no-buffer

echo -e "\nAll tests completed!" 