const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function main() {
    try {
        const command = 'claude -p --dangerously-skip-permissions --output-format "stream-json" "ls -la"';
        console.log('Running command:', command);
        
        // Set a timeout to prevent hanging
        const timeout = 30000; // 30 seconds
        
        // Create a promise that rejects after the timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Command timed out after ${timeout}ms`));
            }, timeout);
        });
        
        // Run the command with a timeout
        const result = await Promise.race([
            execAsync(command),
            timeoutPromise
        ]);
        
        console.log('Command completed successfully');
        console.log('stdout:', result.stdout);
        if (result.stderr) console.log('stderr:', result.stderr);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main(); 