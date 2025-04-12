# Server Testing Guide

This directory contains the server implementation and testing tools for the Claude Code Go application.

## Running the Server

To start the server, run:

```bash
npm run server
```

The server will start on port 3000.

## Testing the Endpoints

### Using the Test Script

A shell script is provided to test all endpoints using curl:

```bash
./test-endpoints.sh
```

This script will test all endpoints:
- GET /directories
- GET /directories?relative=true
- POST /directories
- POST /prompt
- POST /promptstream

### Using the Web Interface

A web interface is provided to test the SSE streaming endpoint:

1. Start the server
2. Open a browser and navigate to: http://localhost:3000
3. Use the file browser to navigate to a directory
4. Enter a command in the input field (e.g., `ls -la`)
5. Click "Start Command" to begin streaming the command output
6. Click "Stop" to abort the command

### Using Jest Tests

To run the automated tests:

```bash
npm test
```

## Endpoints

### GET /directories

Returns the user's home directory by default, or the parent directory of the current repository if `relative=true`.

### POST /directories

Lists the contents of a specified directory.

Request body:
```json
{
  "directory": "/path/to/directory"
}
```

### POST /prompt

Executes a shell command and returns the output.

Request body:
```json
{
  "command": "ls -la",
  "directory": "/path/to/directory"
}
```

### POST /promptstream

Executes a shell command and streams the output using Server-Sent Events (SSE).

Request body:
```json
{
  "command": "ping -c 5 localhost",
  "directory": "/path/to/directory"
}
```

The response is a stream of SSE events, each containing:
- `stdout`: Standard output from the command
- `stderr`: Standard error from the command
- `allOutputs`: Array of all outputs so far
- `success`: Boolean indicating if the command is still running
- `exitCode`: Exit code of the command (only in the final event) 