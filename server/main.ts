import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

interface ListDirectoryRequest {
    directory: string;
}

interface ExecuteCommandRequest {
    command: string;
    directory: string;
}

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());

// Helper function to execute shell commands
const execAsync = promisify(exec);

app.get('/directories', (req: Request, res: Response) => {
    try {
        const { relative } = req.query;
        
        let directory: string;
        
        if (relative === 'true') {
            // Return the parent directory of the current repository
            const currentDir = process.cwd();
            directory = path.dirname(currentDir);
        } else {
            // Return the user's home directory by default
            directory = os.homedir();
        }
        
        res.json({ directory });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get directory path' });
    }
});

// Route to list files and directoriesd
// @ts-ignore
app.post('/directories', async (req: Request<{}, {}, ListDirectoryRequest>, res: Response) => {
    try {
        const { directory } = req.body;
        
        if (!directory) {
            return res.status(400).json({ error: 'Directory path is required' });
        }

        const items = await fs.readdir(directory, { withFileTypes: true });
        const contents = items.map(item => ({
            name: item.name,
            type: item.isDirectory() ? 'directory' : 'file',
            path: path.join(directory, item.name)
        }));

        res.json({ contents });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list directory contents' });
    }
});

// Route to execute shell commands
// @ts-ignore
app.post('/prompt', async (req: Request<{}, {}, ExecuteCommandRequest>, res: Response) => {
    try {
        const { command, directory } = req.body;
        
        if (!command) {
            return res.status(400).json({ error: 'Command is required' });
        }

        if (!directory) {
            return res.status(400).json({ error: 'Directory is required' });
        }

        const { stdout, stderr } = await execAsync(command, { cwd: directory });
        res.json({ 
            stdout,
            stderr,
            success: true
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to execute command',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Serve the test HTML file
app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'test-sse.html'));
});

// @ts-ignore
app.get("/promptstream", async (req: Request, res: Response) => {
    try {
        // Get command and directory from query parameters
        const command = req.query.command as string;
        const directory = req.query.directory as string;
        
        if (!command) {
            return res.status(400).json({ error: 'Command is required' });
        }

        if (!directory) {
            return res.status(400).json({ error: 'Directory is required' });
        }

        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // Send an initial comment to establish the connection
        res.write(': ping\n\n');
        
        // Construct the Claude command
        const claudeCommand = `claude -p --dangerously-skip-permissions --output-format "stream-json" ${command}`;
        
        console.log(`Executing command: ${claudeCommand} in directory: ${directory}`);
        
        // Use spawn instead of exec for streaming output
        const process = spawn(claudeCommand, { 
            cwd: directory,
            shell: true // Use shell to handle commands better
        });
        
        // Keep track of all outputs
        let allOutputs: string[] = [];
        
        // Handle stdout data
        process.stdout.on('data', (data) => {
            const output = data.toString();
            allOutputs.push(output);
            
            // Send the most recent output as an SSE event
            res.write(`data: ${JSON.stringify({ 
                stdout: output,
                allOutputs,
                success: true
            })}\n\n`);
        });
        
        // Handle stderr data
        process.stderr.on('data', (data) => {
            const error = data.toString();
            allOutputs.push(error);
            
            // Send the error as an SSE event
            res.write(`data: ${JSON.stringify({ 
                stderr: error,
                allOutputs,
                success: true
            })}\n\n`);
        });
        
        // Handle process errors
        process.on('error', (error) => {
            console.error(`Process error: ${error.message}`);
            res.write(`data: ${JSON.stringify({ 
                stderr: `Process error: ${error.message}`,
                allOutputs,
                success: false,
                error: error.message
            })}\n\n`);
        });
        
        // Handle process completion
        process.on('close', (code, signal) => {
            console.log(`Process exited with code ${code} and signal ${signal}`);
            
            // Send final event with all outputs
            res.write(`data: ${JSON.stringify({ 
                stdout: '',
                stderr: '',
                allOutputs,
                success: true,
                exitCode: code,
                signal: signal
            })}\n\n`);
            res.end();
        });
        
        // Handle client disconnect
        req.on('close', () => {
            console.log('Client disconnected, killing process');
            process.kill();
        });
        
    } catch (error) {
        console.error('Error in promptstream:', error);
        res.status(500).json({ 
            error: 'Failed to execute command',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// @ts-ignore
app.post("/promptstream", async (req: Request<{}, {}, ExecuteCommandRequest>, res: Response) => {
    try {
        // Get command from body
        const { command, directory } = req.body;
        
        if (!command) {
            return res.status(400).json({ error: 'Command is required' });
        }

        if (!directory) {
            return res.status(400).json({ error: 'Directory is required' });
        }

        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // Send an initial comment to establish the connection
        res.write(': ping\n\n');
        
        // Construct the Claude command
        const claudeCommand = `claude -p --dangerously-skip-permissions --output-format "stream-json" "${command}"`;
        
        console.log(`Executing command: ${claudeCommand} in directory: ${directory}`);
        
        // Use spawn instead of exec for streaming output
        const process = spawn(claudeCommand, { 
            cwd: directory,
            shell: true // Use shell to handle commands better
        });
        
        console.log(process);

        // Keep track of all outputs
        let allOutputs: string[] = [];
        
        // Handle stdout data
        process.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
            const output = data.toString();
            allOutputs.push(output);
            
            // Send the most recent output as an SSE event
            res.write(`data: ${JSON.stringify({ 
                stdout: output,
                allOutputs,
                success: true
            })}\n\n`);
        });
        
        // Handle stderr data
        process.stderr.on('data', (data) => {
            console.log(`stderr: ${data}`);
            const error = data.toString();
            allOutputs.push(error);
            
            // Send the error as an SSE event
            res.write(`data: ${JSON.stringify({ 
                stderr: error,
                allOutputs,
                success: true
            })}\n\n`);
        });
        
        // Handle process errors
        process.on('error', (error) => {
            console.error(`Process error: ${error.message}`);
            res.write(`data: ${JSON.stringify({ 
                stderr: `Process error: ${error.message}`,
                allOutputs,
                success: false,
                error: error.message
            })}\n\n`);
        });
        
        // Handle process completion
        process.on('close', (code, signal) => {
            console.log(`Process exited with code ${code} and signal ${signal}`);
            
            // Send final event with all outputs
            res.write(`data: ${JSON.stringify({ 
                stdout: '',
                stderr: '',
                allOutputs,
                success: true,
                exitCode: code,
                signal: signal
            })}\n\n`);
            res.end();
        });
        
        // Handle client disconnect
        req.on('close', () => {
            // console.log('Client disconnected, killing process');
            // process.kill();
        });
        
        console.log('test');

    } catch (error) {
        console.error('Error in promptstream:', error);
        res.status(500).json({ 
            error: 'Failed to execute command',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

