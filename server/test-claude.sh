#!/bin/bash

# Run the Claude command and capture its output
echo "Running Claude command..."
claude -p --dangerously-skip-permissions --output-format "stream-json" "ls -la" > claude_output.json 2> claude_error.log

# Check if the command was successful
if [ $? -eq 0 ]; then
  echo "Claude command completed successfully"
  echo "Output saved to claude_output.json"
  echo "Errors saved to claude_error.log"
  
  # Display the output
  echo "Output:"
  cat claude_output.json
  
  echo "Errors (if any):"
  cat claude_error.log
else
  echo "Claude command failed with exit code $?"
  echo "Errors:"
  cat claude_error.log
fi 