const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const execAsync = promisify(exec);

async function main() {
    try {
        // Get path to Python script
        const pythonScript = path.join(__dirname, 'test-claude.py');
        console.log('Running Python script:', pythonScript);
        
        // Run Python script with environment variables
        const { stdout, stderr } = await execAsync(`python3 ${pythonScript}`, {
            env: {
                ...process.env,
                PATH: process.env.PATH,
                HOME: process.env.HOME,
                SHELL: process.env.SHELL,
                TERM: process.env.TERM
            },
            timeout: 60000 // 60 second timeout
        });
        
        if (stdout) {
            console.log('Python script output:');
            console.log(stdout);
            
            // Try to extract and parse the JSON responses
            const jsonLines = stdout.split('\n').filter(line => line.trim().startsWith('{'));
            for (const line of jsonLines) {
                try {
                    const jsonData = JSON.parse(line);
                    console.log('\nParsed JSON response:');
                    console.log(JSON.stringify(jsonData, null, 2));
                } catch (e) {
                    // Skip lines that aren't valid JSON
                }
            }
        }
        
        if (stderr) {
            console.error('Python script errors:');
            console.error(stderr);
        }
        
    } catch (error) {
        console.error('Error running Python script:', error.message);
        if (error.code === 'ETIMEDOUT') {
            console.error('Script timed out after 60 seconds');
        }
    }
}

main(); 