import subprocess
import json
import sys
from datetime import datetime

def main():
    print(f"Starting Claude test at {datetime.now()}")
    
    # Command to run
    cmd = ['claude', '-p', '--dangerously-skip-permissions', '--output-format', 'stream-json', 'ls -la']
    
    try:
        # Run the command with a timeout
        print("Running command:", ' '.join(cmd))
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30  # 30 second timeout
        )
        
        print("\nExit code:", result.returncode)
        
        if result.stdout:
            print("\nStdout:")
            print(result.stdout)
            
            # Try to parse JSON output
            try:
                for line in result.stdout.splitlines():
                    if line.strip():
                        json_data = json.loads(line)
                        print("\nParsed JSON:")
                        print(json.dumps(json_data, indent=2))
            except json.JSONDecodeError as e:
                print("Failed to parse JSON:", e)
        
        if result.stderr:
            print("\nStderr:")
            print(result.stderr)
            
    except subprocess.TimeoutExpired:
        print("Command timed out after 30 seconds")
    except subprocess.CalledProcessError as e:
        print("Command failed with exit code:", e.returncode)
        print("Stderr:", e.stderr)
    except Exception as e:
        print("Error:", str(e))

if __name__ == "__main__":
    main() 