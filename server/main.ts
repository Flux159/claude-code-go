import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

interface ListDirectoryRequest {
    directory: string;
}

interface ExecuteCommandRequest {
    command: string;
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
        const { command } = req.body;
        
        if (!command) {
            return res.status(400).json({ error: 'Command is required' });
        }

        const { stdout, stderr } = await execAsync(command);
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

// @ts-ignore
app.post("/promptstream", async (req: Request<{}, {}, ExecuteCommandRequest>, res: Response) => {
    try {
        const { command } = req.body;
        
        if (!command) {
            return res.status(400).json({ error: 'Command is required' });
        }

        // TODO: Change this to use a stream of outputs
        const { stdout, stderr } = await execAsync(command);
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

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

