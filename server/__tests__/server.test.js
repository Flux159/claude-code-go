const request = require('supertest');
const express = require('express');
const { exec, spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

// Mock the child_process module
jest.mock('child_process', () => ({
  exec: jest.fn(),
  spawn: jest.fn()
}));

// Mock the fs/promises module
jest.mock('fs/promises', () => ({
  readdir: jest.fn()
}));

// Import the server app
const app = require('../main');

describe('Server API Endpoints', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('GET /directories', () => {
    it('should return the user home directory by default', async () => {
      const response = await request(app).get('/directories');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('directory', os.homedir());
    });

    it('should return the parent directory when relative=true', async () => {
      const response = await request(app).get('/directories?relative=true');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('directory');
    });
  });

  describe('POST /directories', () => {
    it('should return directory contents', async () => {
      // Mock the readdir function
      fs.readdir.mockResolvedValue([
        { name: 'file1.txt', isDirectory: () => false },
        { name: 'folder1', isDirectory: () => true }
      ]);

      const response = await request(app)
        .post('/directories')
        .send({ directory: '/test/path' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('contents');
      expect(response.body.contents).toHaveLength(2);
      expect(fs.readdir).toHaveBeenCalledWith('/test/path', { withFileTypes: true });
    });

    it('should return 400 if directory is not provided', async () => {
      const response = await request(app)
        .post('/directories')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Directory path is required');
    });
  });

  describe('POST /prompt', () => {
    it('should execute a command and return the output', async () => {
      // Mock the exec function
      exec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: 'Command output', stderr: '' });
      });

      const response = await request(app)
        .post('/prompt')
        .send({ command: 'ls -la' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('stdout', 'Command output');
      expect(response.body).toHaveProperty('success', true);
    });

    it('should return 400 if command is not provided', async () => {
      const response = await request(app)
        .post('/prompt')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Command is required');
    });

    it('should handle command execution errors', async () => {
      // Mock the exec function to simulate an error
      exec.mockImplementation((cmd, callback) => {
        callback(new Error('Command failed'), { stdout: '', stderr: 'Error message' });
      });

      const response = await request(app)
        .post('/prompt')
        .send({ command: 'invalid-command' });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to execute command');
    });
  });

  describe('POST /promptstream', () => {
    it('should set up SSE headers and handle streaming output', async () => {
      // Mock the spawn function
      const mockStdout = {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            // Simulate data event
            setTimeout(() => callback(Buffer.from('Stream output')), 100);
          }
        })
      };

      const mockStderr = {
        on: jest.fn()
      };

      const mockProcess = {
        stdout: mockStdout,
        stderr: mockStderr,
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            // Simulate close event
            setTimeout(() => callback(0), 200);
          }
        })
      };

      spawn.mockReturnValue(mockProcess);

      const response = await request(app)
        .post('/promptstream')
        .send({ command: 'long-running-command' })
        .expect('Content-Type', /text\/event-stream/)
        .expect('Cache-Control', /no-cache/)
        .expect('Connection', /keep-alive/);

      // The response should be a stream, so we can't easily test the content
      // In a real test, you would need to use a streaming HTTP client
      expect(spawn).toHaveBeenCalled();
    });

    it('should return 400 if command is not provided', async () => {
      const response = await request(app)
        .post('/promptstream')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Command is required');
    });
  });
}); 