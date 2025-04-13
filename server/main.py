from flask import Flask, request, jsonify, Response, send_file
import subprocess
import os
import json
from pathlib import Path
import sys
from typing import Dict, List, Union, Any, Optional
import time
import signal
import threading
import psutil
from collections import deque

# Add the parent directory to sys.path to allow imports from the root
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

# Now import from auth module
from server.auth import token_required, authenticate_user, create_access_token
from server.auth.cors_middleware import handle_cors

app = Flask(__name__)
# Setup CORS handling
handle_cors(app)

# Store recent errors for automatic inclusion in Claude prompts
# Using a deque for a fixed-size FIFO queue
MAX_STORED_ERRORS = 10
recent_errors = deque(maxlen=MAX_STORED_ERRORS)

# Web command process management
web_process: Optional[subprocess.Popen] = None
web_command_lock = threading.Lock()
web_command_status = {
    "running": False,
    "command": "",
    "pid": None,
    "start_time": None,
    "exit_code": None,
    "output": [],
    "error": None,
    "last_error_line": None,
    "logs": [],
    "max_logs": 1000,  # Maximum number of log lines to keep
}


def get_shell_env() -> Dict[str, str]:
    """Get the shell environment variables."""
    env_output = subprocess.check_output(["env"], shell=True).decode("utf-8")
    return dict(line.split("=", 1) for line in env_output.splitlines() if "=" in line)


def output_reader(process, output_list, is_stderr=False):
    """Read output from a process and append to the output list."""
    global web_command_status
    stream = process.stderr if is_stderr else process.stdout
    prefix = "ERROR: " if is_stderr else ""

    for line in iter(stream.readline, ""):
        if line:
            timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
            line_text = f"{prefix}{line.rstrip()}"
            log_entry = f"[{timestamp}] {line_text}"

            print(log_entry)
            output_list.append(line_text)

            # Add to logs with timestamp for display in UI
            with web_command_lock:
                web_command_status["logs"].append(log_entry)
                # Keep logs within the maximum size
                if len(web_command_status["logs"]) > web_command_status["max_logs"]:
                    web_command_status["logs"] = web_command_status["logs"][
                        -web_command_status["max_logs"] :
                    ]

                # If this is an error, update the last error line
                if is_stderr:
                    web_command_status["last_error_line"] = log_entry


def is_process_running(pid):
    """Check if a process with the given PID is running."""
    try:
        if pid is None:
            return False
        process = psutil.Process(pid)
        return process.is_running() and process.status() != psutil.STATUS_ZOMBIE
    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
        return False


def start_web_command(command, directory=None):
    """Start the web command process."""
    global web_process, web_command_status

    if directory is None:
        directory = str(Path(os.getcwd())) + "/claude-next-app"

    with web_command_lock:
        # Kill any existing process
        if web_process is not None and is_process_running(web_command_status["pid"]):
            try:
                # Try to terminate gracefully first
                web_process.terminate()
                web_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                # Force kill if it doesn't terminate
                web_process.kill()
            except Exception as e:
                print(f"Error terminating process: {e}")

        # Reset the status
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        start_time = time.time()

        web_command_status["running"] = False
        web_command_status["command"] = command
        web_command_status["pid"] = None
        web_command_status["start_time"] = start_time
        web_command_status["exit_code"] = None
        web_command_status["output"] = []
        web_command_status["error"] = None
        web_command_status["last_error_line"] = None

        # Clear previous logs
        web_command_status["logs"] = []

        # Add startup log
        log_entry = (
            f"[{timestamp}] Starting command: {command} in directory: {directory}"
        )
        web_command_status["logs"].append(log_entry)
        print(log_entry)

        try:
            # Start new process
            shell_env = get_shell_env()
            env = {**os.environ, **shell_env}

            web_process = subprocess.Popen(
                command,
                cwd=directory,
                env=env,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                universal_newlines=True,
            )

            # Save process details
            web_command_status["pid"] = web_process.pid
            web_command_status["running"] = True

            # Start output reader threads
            stdout_thread = threading.Thread(
                target=output_reader,
                args=(web_process, web_command_status["output"], False),
                daemon=True,
            )
            stderr_thread = threading.Thread(
                target=output_reader,
                args=(web_process, web_command_status["output"], True),
                daemon=True,
            )

            stdout_thread.start()
            stderr_thread.start()

            # Monitor process status
            def monitor_process():
                web_process.wait()

                timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
                exit_code = web_process.returncode

                with web_command_lock:
                    web_command_status["running"] = False
                    web_command_status["exit_code"] = exit_code

                    # If the process failed, capture the error
                    if exit_code != 0:
                        error_msg = f"Process exited with code {exit_code}"
                        web_command_status["error"] = error_msg

                        # Add to logs
                        log_entry = f"[{timestamp}] ERROR: {error_msg}"
                        web_command_status["logs"].append(log_entry)
                        web_command_status["last_error_line"] = log_entry

                        print(f"Web command failed: {error_msg}")
                    else:
                        # Normal exit
                        log_entry = (
                            f"[{timestamp}] Process completed normally with exit code 0"
                        )
                        web_command_status["logs"].append(log_entry)
                        print(log_entry)

            monitor_thread = threading.Thread(target=monitor_process, daemon=True)
            monitor_thread.start()

            return True
        except Exception as e:
            web_command_status["error"] = str(e)
            web_command_status["running"] = False
            print(f"Failed to start web command: {e}")
            return False


def stop_web_command():
    """Stop the web command process."""
    global web_process, web_command_status

    with web_command_lock:
        if web_process is None or not is_process_running(web_command_status["pid"]):
            web_command_status["running"] = False
            return True

        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] Stopping command: {web_command_status['command']}"
        web_command_status["logs"].append(log_entry)
        print(log_entry)

        try:
            # Try to terminate gracefully first
            web_process.terminate()
            try:
                web_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                # Force kill if it doesn't terminate
                timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
                log_entry = (
                    f"[{timestamp}] Process did not terminate gracefully, forcing kill"
                )
                web_command_status["logs"].append(log_entry)
                print(log_entry)

                web_process.kill()
                web_process.wait()

            web_command_status["running"] = False
            web_command_status["exit_code"] = web_process.returncode

            timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
            log_entry = f"[{timestamp}] Command stopped with exit code: {web_command_status['exit_code']}"
            web_command_status["logs"].append(log_entry)
            print(log_entry)

            return True
        except Exception as e:
            error_msg = str(e)
            web_command_status["error"] = error_msg

            timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
            log_entry = f"[{timestamp}] ERROR: Failed to stop command: {error_msg}"
            web_command_status["logs"].append(log_entry)
            web_command_status["last_error_line"] = log_entry

            print(f"Error stopping web command: {e}")
            return False

# Auth routes
@app.route("/auth/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        username = data.get("username")
        password = data.get("password")
        
        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400
            
        if authenticate_user(username, password):
            access_token = create_access_token(username)
            return jsonify({"access_token": access_token, "username": username}), 200
        else:
            return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"error": f"Login failed: {str(e)}"}), 500

@app.route("/auth/ping", methods=["GET"])
@token_required
def ping():
    """Simple endpoint to check if the user is authenticated"""
    return jsonify({"message": "Authenticated", "username": request.username}), 200


@app.route("/directories", methods=["GET"])
@token_required
def get_directories():
    try:
        relative = (
            request.args.get("relative", "true").lower() == "true"
        )  # Default to true
        print(relative)

        if relative:
            # Return the parent directory of the current repository
            directory = str(Path(os.getcwd())) + "/claude-next-app"
        else:
            # Return the user's home directory if explicitly asked for non-relative path
            directory = os.path.expanduser("~")
        print(directory)

        return jsonify({"directory": directory})
    except Exception as e:
        return jsonify({"error": "Failed to get directory path"}), 500


@app.route("/directories", methods=["POST"])
@token_required
def list_directory():
    try:
        data = request.get_json()
        directory = data.get("directory")

        if not directory:
            return jsonify({"error": "Directory path is required"}), 400

        contents = []
        for item in os.scandir(directory):
            contents.append(
                {
                    "name": item.name,
                    "type": "directory" if item.is_dir() else "file",
                    "path": os.path.join(directory, item.name),
                }
            )

        return jsonify({"contents": contents})
    except Exception as e:
        return jsonify({"error": "Failed to list directory contents"}), 500


@app.route("/report-error", methods=["POST"])
@token_required
def report_error():
    """Endpoint to receive errors from the Next.js application"""
    try:
        error_data = request.get_json()

        # Add timestamp if not provided
        if "timestamp" not in error_data:
            error_data["timestamp"] = time.strftime("%Y-%m-%d %H:%M:%S")

        # Add source information
        error_data["source"] = "next-js-app"

        # Add a unique ID to the error
        error_data["id"] = f"error-{time.time()}-{len(recent_errors)}"

        # Print to console for debugging with highlighting
        print("\n" + "!" * 80)
        print(" 🚨 ERROR REPORTED FROM NEXT.JS APP 🚨 ".center(80, "!"))
        print("!" * 80)
        print(f"\n{json.dumps(error_data, indent=2)}\n")
        print("!" * 80 + "\n")

        # Store in our error queue for later inclusion in Claude prompts
        recent_errors.append(error_data)

        # Log the count of stored errors
        error_count = len(recent_errors)
        print(f"Currently storing {error_count} errors for next Claude prompt")

        # Create the error_count file in the same directory as this script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        error_count_path = os.path.join(script_dir, "error_count.txt")

        # Add a file system flag for clients to detect errors more reliably
        try:
            with open(error_count_path, "w") as f:
                f.write(str(error_count))
            print(f"Wrote error count to {error_count_path}")
        except Exception as write_err:
            print(f"Could not write error count file: {write_err}")

        return jsonify(
            {
                "success": True,
                "stored_errors": len(recent_errors),
                "error_count": error_count,
                "error_count_file": error_count_path,
            }
        )
    except Exception as e:
        print(f"Error handling error report: {str(e)}")
        return (
            jsonify({"error": "Failed to process error report", "details": str(e)}),
            500,
        )


@app.route("/prompt", methods=["POST"])
@token_required
def execute_command():
    try:
        print("\n" + "-" * 80)
        print(" PROMPT REQUEST RECEIVED ".center(80, "-"))

        data = request.get_json()
        print(f"Request data: {json.dumps(data, indent=2)}")

        command = data.get("command")
        directory = data.get("directory")
        include_errors = data.get("include_errors", True)  # Default to including errors

        if not command:
            error_msg = "Command is required"
            print(f"Error: {error_msg}")
            return jsonify({"error": error_msg}), 400

        if not directory:
            # Use current directory as fallback
            directory = str(Path(os.getcwd()))
            print(f"No directory provided, using current directory: {directory}")

        # Count errors before processing
        initial_error_count = len(recent_errors)

        # If we have recent errors and they should be included, add them to the command
        modified_command = command
        if include_errors and recent_errors:
            error_context = "\n\nImportant: The following errors were detected in the Next.js application. Please analyze and fix these errors in your response:\n"
            for i, error in enumerate(recent_errors, 1):
                error_str = json.dumps(error, indent=2)
                error_context += f"\nError {i}:\n```\n{error_str}\n```\n"

            # Append error context to the original command
            modified_command = f"{command}\n{error_context}"

            # Clear the errors after including them
            recent_errors.clear()

            # Update the error count file to reflect that errors are now cleared
            try:
                script_dir = os.path.dirname(os.path.abspath(__file__))
                error_count_path = os.path.join(script_dir, "error_count.txt")
                with open(error_count_path, "w") as f:
                    f.write("0")
                print(f"Updated error count file to 0 at {error_count_path}")
            except Exception as write_err:
                print(f"Could not update error count file: {write_err}")

            print("\n" + "=" * 80)
            print(" 🔄 INCLUDING ERROR CONTEXT IN CLAUDE PROMPT 🔄 ".center(80, "="))
            print(" 🧹 ERRORS CLEARED AFTER INCLUSION 🧹 ".center(80, "="))
            print("=" * 80 + "\n")

        claude_command = f'claude -p --dangerously-skip-permissions --output-format "stream-json" "{modified_command}"'
        print(f"Executing command: {claude_command} in directory: {directory}")

        # Get shell environment
        shell_env = get_shell_env()
        env = {**os.environ, **shell_env}

        # Create a temporary file with the prompt content
        import tempfile

        with tempfile.NamedTemporaryFile(
            mode="w", delete=False, suffix=".txt"
        ) as temp_file:
            temp_file.write(modified_command)
            prompt_file = temp_file.name

        # Use cat to pipe the prompt content to claude
        claude_command = f'cat "{prompt_file}" | claude -p --dangerously-skip-permissions --output-format "stream-json"'
        print(f"Using command: {claude_command}")
        print(f"Prompt length: {len(modified_command)}")
        print(f"Using temp file: {prompt_file}")
        print(f"In directory: {directory}")

        result = subprocess.run(
            claude_command,
            cwd=directory,
            env=env,
            shell=True,
            capture_output=True,
            text=True,
        )

        print(f"Command completed with return code: {result.returncode}")
        print(
            f"stdout length: {len(result.stdout)}, stderr length: {len(result.stderr)}"
        )

        if result.returncode != 0:
            print(f"Error running command: {result.stderr}")

        # Include the error count in the response
        response_data = {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "success": result.returncode == 0,
            "initial_error_count": initial_error_count,
            "remaining_error_count": len(recent_errors),
        }
        return jsonify(response_data)
    except Exception as e:
        error_message = str(e)
        print(f"Exception in execute_command: {error_message}")
        import traceback

        traceback.print_exc()
        return (
            jsonify({"error": "Failed to execute command", "details": error_message}),
            500,
        )


@app.route("/")
def serve_test_html():
    return send_file("test-sse.html")


def generate_sse_response(command: str, directory: str, include_errors: bool = True):
    """Generator function for SSE responses."""
    try:
        # If we have recent errors and they should be included, add them to the command
        modified_command = command
        if include_errors and recent_errors:
            error_context = "\n\nImportant: The following errors were detected in the Next.js application. Please analyze and fix these errors in your response:\n"
            for i, error in enumerate(recent_errors, 1):
                error_str = json.dumps(error, indent=2)
                error_context += f"\nError {i}:\n```\n{error_str}\n```\n"

            # Append error context to the original command
            modified_command = f"{command}\n{error_context}"

            # Clear the errors after including them
            recent_errors.clear()

            print("\n" + "=" * 80)
            print(
                " 🔄 INCLUDING ERROR CONTEXT IN CLAUDE PROMPT (SSE) 🔄 ".center(80, "=")
            )
            print("=" * 80 + "\n")

        claude_command = f'claude -p --dangerously-skip-permissions --output-format "stream-json" "{modified_command}"'
        print(f"Executing command: {claude_command} in directory: {directory}")

        # Get shell environment
        shell_env = get_shell_env()
        env = {**os.environ, **shell_env}

        # Create a temporary file with the prompt content
        import tempfile

        with tempfile.NamedTemporaryFile(
            mode="w", delete=False, suffix=".txt"
        ) as temp_file:
            temp_file.write(modified_command)
            prompt_file = temp_file.name

        process = subprocess.Popen(
            claude_command,
            cwd=directory,
            shell=True,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True,
        )

        # We'll clean up the temp file after the process completes
        temp_files_to_clean = [prompt_file]

        all_outputs = []

        while True:
            output = process.stdout.readline()
            if output == "" and process.poll() is not None:
                break
            if output:
                all_outputs.append(output)
                yield f"data: {json.dumps({'stdout': output, 'allOutputs': all_outputs, 'success': True})}\n\n"

        # Check for any remaining stderr
        for error in process.stderr:
            all_outputs.append(error)
            yield f"data: {json.dumps({'stderr': error, 'allOutputs': all_outputs, 'success': True})}\n\n"

        # Send final event
        yield f"data: {json.dumps({'stdout': '', 'stderr': '', 'allOutputs': all_outputs, 'success': True, 'exitCode': process.returncode})}\n\n"

        # Clean up the temporary file
        try:
            for temp_file in temp_files_to_clean:
                os.unlink(temp_file)
                print(f"Removed temp file: {temp_file}")
        except Exception as clean_err:
            print(f"Failed to remove temp file: {clean_err}")

    except Exception as e:
        # Try to clean up temp files even on exception
        try:
            if "temp_files_to_clean" in locals():
                for temp_file in temp_files_to_clean:
                    if os.path.exists(temp_file):
                        os.unlink(temp_file)
                        print(f"Removed temp file on error: {temp_file}")
        except Exception as clean_err:
            print(f"Failed to remove temp file on error: {clean_err}")

        yield f"data: {json.dumps({'error': str(e), 'success': False})}\n\n"


@app.route("/promptstream", methods=["GET"])
@token_required
def prompt_stream_get():
    command = request.args.get("command")
    directory = request.args.get("directory")
    include_errors = request.args.get("include_errors", "true").lower() == "true"

    if not command:
        return jsonify({"error": "Command is required"}), 400
    if not directory:
        # Use current directory as fallback
        directory = str(Path(os.getcwd()))
        print(f"No directory provided, using current directory: {directory}")

    return Response(
        generate_sse_response(command, directory, include_errors),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@app.route("/promptstream", methods=["POST"])
@token_required
def prompt_stream_post():
    data = request.get_json()
    command = data.get("command")
    directory = data.get("directory")
    include_errors = data.get("include_errors", True)

    if not command:
        return jsonify({"error": "Command is required"}), 400
    if not directory:
        # Use current directory as fallback
        directory = str(Path(os.getcwd()))
        print(f"No directory provided, using current directory: {directory}")

    return Response(
        generate_sse_response(command, directory, include_errors),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@app.route("/errors", methods=["GET"])
@token_required
def get_errors():
    """Endpoint to retrieve current stored errors"""
    error_count = len(recent_errors)

    if error_count > 0:
        print("\n" + "!" * 80)
        print(
            f" 🔔 CLIENT REQUESTED ERROR COUNT: {error_count} PENDING ERRORS READY FOR CLAUDE 🔔 ".center(
                80, "!"
            )
        )
        print("!" * 80 + "\n")

    # Add CORS headers to make sure this endpoint works from any origin
    response = jsonify(
        {"count": error_count, "errors": list(recent_errors), "timestamp": time.time()}
    )
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type")
    response.headers.add("Access-Control-Allow-Methods", "GET")
    return response


@app.route("/clear-errors", methods=["POST"])
@token_required
def clear_errors():
    """Endpoint to manually clear all stored errors"""
    try:
        # Clear all stored errors
        recent_errors.clear()

        # Update the error count file
        script_dir = os.path.dirname(os.path.abspath(__file__))
        error_count_path = os.path.join(script_dir, "error_count.txt")
        with open(error_count_path, "w") as f:
            f.write("0")

        print("\n" + "=" * 80)
        print(" 🧹 ERRORS MANUALLY CLEARED 🧹 ".center(80, "="))
        print("=" * 80 + "\n")

        # Add CORS headers to make sure this endpoint works from any origin
        response = jsonify(
            {"success": True, "message": "All errors cleared successfully", "count": 0}
        )
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "POST")
        return response
    except Exception as e:
        print(f"Error clearing errors: {str(e)}")
        return jsonify({"error": "Failed to clear errors", "details": str(e)}), 500


def get_git_command():
    """Determine the git command to use (sl or git)."""
    try:
        subprocess.run(["sl", "--version"], capture_output=True, check=True)
        return "sl"
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "git"


@app.route("/git/status", methods=["POST"])
@token_required
def git_status():
    """Get the status of the git repository."""
    try:
        data = request.get_json()
        directory = data.get("directory")

        if not directory:
            return jsonify({"error": "Directory path is required"}), 400

        git_cmd = get_git_command()

        # Check if directory is a git or sl repository
        is_git_repo = os.path.exists(os.path.join(directory, ".git"))

        # For sl, check for existence of .sl directory
        is_sl_repo = os.path.exists(os.path.join(directory, ".sl"))

        if not is_git_repo and not is_sl_repo:
            return jsonify({"error": "Not a git or sl repository"}), 400

        # Use different status command based on git or sl
        if git_cmd == "git":
            # Git uses --porcelain format
            status_cmd = f"{git_cmd} status --porcelain"
        else:
            # SL doesn't support --porcelain, use regular status
            status_cmd = f"{git_cmd} status"

        result = subprocess.run(
            status_cmd,
            cwd=directory,
            shell=True,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            return jsonify({"success": False, "error": result.stderr}), 400

        changes = []

        # Parse differently based on git or sl
        if git_cmd == "git":
            # Parse the porcelain output (git)
            for line in result.stdout.splitlines():
                if not line.strip():
                    continue

                status = line[:2]
                file_path = line[3:].strip()

                # Determine the status type
                status_type = ""
                if status == "??":
                    status_type = "untracked"
                elif status == "MM":
                    status_type = "modified_staged_and_unstaged"
                elif status[0] == "M":
                    status_type = "modified_staged"
                elif status[1] == "M":
                    status_type = "modified_unstaged"
                elif status[0] == "A":
                    status_type = "added"
                elif status[0] == "D":
                    status_type = "deleted"
                elif status[1] == "D":
                    status_type = "deleted_unstaged"
                elif status == "R":
                    status_type = "renamed"
                else:
                    status_type = "other"

                changes.append(
                    {"status": status, "status_type": status_type, "path": file_path}
                )
        else:
            # Parse the SL status output
            current_section = None
            for line in result.stdout.splitlines():
                line = line.strip()
                if not line:
                    continue

                # SL status usually has sections like "Changed:", "Added:", etc.
                if line.endswith(":"):
                    current_section = line.lower().replace(":", "")
                    continue

                if current_section:
                    file_path = line

                    # Map SL sections to our status types
                    status_type = "other"
                    status = "??"

                    if "changed" in current_section:
                        status_type = "modified_unstaged"
                        status = " M"
                    elif "added" in current_section:
                        status_type = "added"
                        status = "A "
                    elif "removed" in current_section or "deleted" in current_section:
                        status_type = "deleted"
                        status = "D "
                    elif "untracked" in current_section:
                        status_type = "untracked"
                        status = "??"

                    changes.append(
                        {
                            "status": status,
                            "status_type": status_type,
                            "path": file_path,
                        }
                    )

            # If we didn't parse any changes but have output, try a simpler approach
            if not changes and result.stdout:
                # Try to find file mentions in the output
                for line in result.stdout.splitlines():
                    line = line.strip()
                    if not line or line.endswith(":"):
                        continue

                    # Try to extract filenames
                    parts = line.split()
                    if len(parts) > 0:
                        file_path = parts[-1]  # Assume last part is the file
                        status_type = "modified_unstaged"  # Default to modified
                        status = " M"

                        if "new file" in line.lower() or "add" in line.lower():
                            status_type = "added"
                            status = "A "
                        elif "delete" in line.lower():
                            status_type = "deleted"
                            status = "D "

                        changes.append(
                            {
                                "status": status,
                                "status_type": status_type,
                                "path": file_path,
                            }
                        )

        return jsonify(
            {"success": True, "changes": changes, "raw_output": result.stdout}
        )
    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Failed to get git status",
                    "details": str(e),
                }
            ),
            500,
        )


@app.route("/git/diff", methods=["POST"])
@token_required
def git_diff():
    """Get the diff of a specific file or all files."""
    try:
        data = request.get_json()
        directory = data.get("directory")
        file_path = data.get("file_path")  # Optional, if None, get diff for all files

        if not directory:
            return jsonify({"error": "Directory path is required"}), 400

        git_cmd = get_git_command()

        # Check if directory is a git or sl repository
        is_git_repo = os.path.exists(os.path.join(directory, ".git"))
        is_sl_repo = os.path.exists(os.path.join(directory, ".sl"))

        if not is_git_repo and not is_sl_repo:
            return jsonify({"error": "Not a git or sl repository"}), 400

        # Build the diff command, same for git and sl
        diff_cmd = f"{git_cmd} diff"

        # If file_path is provided, get diff for that specific file
        if file_path:
            if git_cmd == "git":
                diff_cmd = f"{diff_cmd} -- {file_path}"
            else:
                # For sl, the file path comes after the diff command without --
                diff_cmd = f"{diff_cmd} {file_path}"

        # Run git diff
        result = subprocess.run(
            diff_cmd,
            cwd=directory,
            shell=True,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            return jsonify({"success": False, "error": result.stderr}), 400

        return jsonify({"success": True, "diff": result.stdout, "file_path": file_path})
    except Exception as e:
        return (
            jsonify(
                {"success": False, "error": "Failed to get git diff", "details": str(e)}
            ),
            500,
        )


@app.route("/git/reset-file", methods=["POST"])
@token_required
def git_reset_file():
    """Reset changes to a specific file."""
    try:
        data = request.get_json()
        directory = data.get("directory")
        file_path = data.get("file_path")

        if not directory:
            return jsonify({"error": "Directory path is required"}), 400

        if not file_path:
            return jsonify({"error": "File path is required"}), 400

        git_cmd = get_git_command()

        # Check if directory is a git or sl repository
        is_git_repo = os.path.exists(os.path.join(directory, ".git"))
        is_sl_repo = os.path.exists(os.path.join(directory, ".sl"))

        if not is_git_repo and not is_sl_repo:
            return jsonify({"error": "Not a git or sl repository"}), 400

        # Reset the file (unstaged changes)
        if git_cmd == "git":
            result = subprocess.run(
                f"{git_cmd} checkout -- {file_path}",
                cwd=directory,
                shell=True,
                capture_output=True,
                text=True,
            )

            # If the file was staged, reset from staged too
            staged_result = subprocess.run(
                f"{git_cmd} reset HEAD {file_path}",
                cwd=directory,
                shell=True,
                capture_output=True,
                text=True,
            )
        else:
            # For Sapling, use sl revert
            result = subprocess.run(
                f"{git_cmd} revert {file_path}",
                cwd=directory,
                shell=True,
                capture_output=True,
                text=True,
            )

            # SL doesn't have a separate unstaging command like Git
            # For SL, the equivalent would be to use sl add to re-add a file
            # But this is not needed in our reset case
            staged_result = subprocess.CompletedProcess(
                args="", returncode=0, stdout="", stderr=""
            )

        return jsonify(
            {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
            }
        )
    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": f"Failed to reset file {file_path}",
                    "details": str(e),
                }
            ),
            500,
        )


@app.route("/git/commit", methods=["POST"])
@token_required
def git_commit():
    """Create a new commit with the provided message."""
    try:
        data = request.get_json()
        directory = data.get("directory")
        message = data.get("message")
        files = data.get(
            "files", []
        )  # Optional list of files to commit, empty means all changed files

        if not directory:
            return jsonify({"error": "Directory path is required"}), 400

        if not message:
            return jsonify({"error": "Commit message is required"}), 400

        git_cmd = get_git_command()

        # Check if directory is a git or sl repository
        is_git_repo = os.path.exists(os.path.join(directory, ".git"))
        is_sl_repo = os.path.exists(os.path.join(directory, ".sl"))

        if not is_git_repo and not is_sl_repo:
            return jsonify({"error": "Not a git or sl repository"}), 400

        # Stage the files
        if files:
            # Stage specific files
            for file in files:
                stage_result = subprocess.run(
                    f"{git_cmd} add {file}",
                    cwd=directory,
                    shell=True,
                    capture_output=True,
                    text=True,
                )
                if stage_result.returncode != 0:
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": f"Failed to stage file {file}",
                                "details": stage_result.stderr,
                            }
                        ),
                        400,
                    )
        else:
            # Stage all changes
            stage_result = subprocess.run(
                f"{git_cmd} add -A",
                cwd=directory,
                shell=True,
                capture_output=True,
                text=True,
            )
            if stage_result.returncode != 0:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "Failed to stage changes",
                            "details": stage_result.stderr,
                        }
                    ),
                    400,
                )

        # Create the commit
        commit_result = subprocess.run(
            f'{git_cmd} commit -m "{message}"',
            cwd=directory,
            shell=True,
            capture_output=True,
            text=True,
        )

        return jsonify(
            {
                "success": commit_result.returncode == 0,
                "stdout": commit_result.stdout,
                "stderr": commit_result.stderr,
            }
        )
    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Failed to create commit",
                    "details": str(e),
                }
            ),
            500,
        )


@app.route("/git/push", methods=["POST"])
@token_required
def git_push():
    """Push changes to the remote repository."""
    try:
        data = request.get_json()
        directory = data.get("directory")
        branch = data.get("branch", "")  # Optional branch name
        remote = data.get("remote", "origin")  # Default to origin

        if not directory:
            return jsonify({"error": "Directory path is required"}), 400

        git_cmd = get_git_command()

        # Check if directory is a git or sl repository
        is_git_repo = os.path.exists(os.path.join(directory, ".git"))
        is_sl_repo = os.path.exists(os.path.join(directory, ".sl"))

        if not is_git_repo and not is_sl_repo:
            return jsonify({"error": "Not a git or sl repository"}), 400

        # Build the push command
        push_cmd = f"{git_cmd} push {remote}"
        if branch:
            push_cmd = f"{push_cmd} {branch}"

        # Push changes
        push_result = subprocess.run(
            push_cmd,
            cwd=directory,
            shell=True,
            capture_output=True,
            text=True,
        )

        return jsonify(
            {
                "success": push_result.returncode == 0,
                "stdout": push_result.stdout,
                "stderr": push_result.stderr,
            }
        )
    except Exception as e:
        return (
            jsonify(
                {"success": False, "error": "Failed to push changes", "details": str(e)}
            ),
            500,
        )


@app.route("/git/create-pr", methods=["POST"])
@token_required
def git_create_pr():
    """Create a pull request."""
    try:
        data = request.get_json()
        directory = data.get("directory")
        title = data.get("title")
        body = data.get("body", "")
        base = data.get("base", "main")  # Default to main branch
        head = data.get("head", "")  # Source branch

        if not directory:
            return jsonify({"error": "Directory path is required"}), 400

        if not title:
            return jsonify({"error": "PR title is required"}), 400

        # Check if directory is a git or sl repository
        is_git_repo = os.path.exists(os.path.join(directory, ".git"))
        is_sl_repo = os.path.exists(os.path.join(directory, ".sl"))

        if not is_git_repo and not is_sl_repo:
            return jsonify({"error": "Not a git or sl repository"}), 400

        # Check if the gh CLI is installed
        try:
            gh_version = subprocess.run(
                "gh --version",
                cwd=directory,
                shell=True,
                capture_output=True,
                text=True,
            )
            if gh_version.returncode != 0:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "GitHub CLI (gh) is not installed or not properly configured",
                        }
                    ),
                    400,
                )
        except Exception:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "GitHub CLI (gh) is not installed or not properly configured",
                    }
                ),
                400,
            )

        # Create PR command
        pr_cmd = f'gh pr create --title "{title}"'
        if body:
            pr_cmd = f'{pr_cmd} --body "{body}"'
        if base:
            pr_cmd = f"{pr_cmd} --base {base}"
        if head:
            pr_cmd = f"{pr_cmd} --head {head}"

        # Create the PR
        pr_result = subprocess.run(
            pr_cmd,
            cwd=directory,
            shell=True,
            capture_output=True,
            text=True,
        )

        return jsonify(
            {
                "success": pr_result.returncode == 0,
                "stdout": pr_result.stdout,
                "stderr": pr_result.stderr,
            }
        )
    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Failed to create pull request",
                    "details": str(e),
                }
            ),
            500,
        )


@app.route("/reset", methods=["POST"])
@token_required
def git_reset():
    try:
        data = request.get_json()
        directory = data.get("directory")

        if not directory:
            return jsonify({"error": "Directory path is required"}), 400

        git_cmd = get_git_command()

        # Check if directory is a git or sl repository
        is_git_repo = os.path.exists(os.path.join(directory, ".git"))
        is_sl_repo = os.path.exists(os.path.join(directory, ".sl"))

        if not is_git_repo and not is_sl_repo:
            return jsonify({"error": "Not a git or sl repository"}), 400

        # Run reset
        if git_cmd == "git":
            # Git reset --hard
            result = subprocess.run(
                f"{git_cmd} reset --hard",
                cwd=directory,
                shell=True,
                capture_output=True,
                text=True,
            )

            # Also clean untracked files if desired
            clean_result = subprocess.run(
                f"{git_cmd} clean -fd",
                cwd=directory,
                shell=True,
                capture_output=True,
                text=True,
            )
        else:
            # SL uses revert -a for equivalent of git reset --hard
            result = subprocess.run(
                f"{git_cmd} revert -a",
                cwd=directory,
                shell=True,
                capture_output=True,
                text=True,
            )

            # SL has clean command
            clean_result = subprocess.run(
                f"{git_cmd} clean --force",
                cwd=directory,
                shell=True,
                capture_output=True,
                text=True,
            )

        return jsonify(
            {
                "success": result.returncode == 0 and clean_result.returncode == 0,
                "stdout": result.stdout + clean_result.stdout,
                "stderr": result.stderr + clean_result.stderr,
            }
        )
    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Failed to reset git repository",
                    "details": str(e),
                }
            ),
            500,
        )


@app.route("/web-command", methods=["GET"])
@token_required
def get_web_command_status():
    """Get the status of the web command process."""
    with web_command_lock:
        # Check if the process is actually running, even if we think it is
        if web_command_status["running"] and web_command_status["pid"]:
            web_command_status["running"] = is_process_running(
                web_command_status["pid"]
            )

        # Get log line limits from query params
        max_logs = request.args.get("max_logs", default=100, type=int)

        # Return a status response (limit the output lines to avoid huge responses)
        response = {
            "running": web_command_status["running"],
            "command": web_command_status["command"],
            "pid": web_command_status["pid"],
            "start_time": web_command_status["start_time"],
            "exit_code": web_command_status["exit_code"],
            "output": web_command_status["output"][-100:],  # Last 100 lines only
            "error": web_command_status["error"],
            "last_error_line": web_command_status["last_error_line"],
            "output_lines": len(web_command_status["output"]),
            "logs": web_command_status["logs"][
                -max_logs:
            ],  # Return the requested number of logs
            "total_logs": len(web_command_status["logs"]),
        }

    return jsonify(response)


@app.route("/web-command/start", methods=["POST"])
@token_required
def start_web_command_endpoint():
    """Start the web command process."""
    try:
        data = request.get_json()
        command = data.get("command")
        directory = data.get("directory")

        if not command:
            return jsonify({"error": "Command is required"}), 400

        if not directory:
            directory = str(Path(os.getcwd())) + "/claude-next-app"

        success = start_web_command(command, directory)

        return jsonify(
            {
                "success": success,
                "message": (
                    "Web command started" if success else "Failed to start web command"
                ),
                "error": web_command_status["error"],
            }
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/web-command/stop", methods=["POST"])
@token_required
def stop_web_command_endpoint():
    """Stop the web command process."""
    try:
        success = stop_web_command()

        return jsonify(
            {
                "success": success,
                "message": (
                    "Web command stopped" if success else "Failed to stop web command"
                ),
                "error": web_command_status["error"],
            }
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/web-command/restart", methods=["POST"])
@token_required
def restart_web_command_endpoint():
    """Restart the web command process."""
    try:
        data = request.get_json()
        command = data.get("command") or web_command_status["command"]
        directory = data.get("directory")

        if not command:
            return jsonify({"error": "No command found to restart"}), 400

        # Add restart log entry
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] Restarting command: {command}"

        with web_command_lock:
            # Clear logs immediately for restart
            web_command_status["logs"] = []
            web_command_status["logs"].append(log_entry)
            print(log_entry)

        # Stop the existing process
        stop_web_command()

        # Start the new process
        success = start_web_command(command, directory)

        return jsonify(
            {
                "success": success,
                "message": (
                    "Web command restarted"
                    if success
                    else "Failed to restart web command"
                ),
                "error": web_command_status["error"],
            }
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/web-command/output", methods=["GET"])
@token_required
def get_web_command_output():
    """Get the output of the web command process."""
    try:
        # Get optional query parameters for pagination
        start_line = request.args.get("start", type=int, default=0)
        max_lines = request.args.get("max", type=int, default=100)

        with web_command_lock:
            total_lines = len(web_command_status["output"])
            start_idx = max(0, min(start_line, total_lines))
            end_idx = min(start_idx + max_lines, total_lines)

            output_slice = web_command_status["output"][start_idx:end_idx]

            response = {
                "total_lines": total_lines,
                "start_line": start_idx,
                "end_line": end_idx,
                "lines": output_slice,
                "running": web_command_status["running"],
            }

        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/web-command/logs", methods=["GET"])
@token_required
def get_web_command_logs():
    """Get the logs of the web command process."""
    try:
        # Get optional query parameters for pagination
        start_line = request.args.get("start", type=int, default=0)
        max_lines = request.args.get("max", type=int, default=100)

        with web_command_lock:
            total_lines = len(web_command_status["logs"])
            start_idx = max(0, min(start_line, total_lines))
            end_idx = min(start_idx + max_lines, total_lines)

            logs_slice = web_command_status["logs"][start_idx:end_idx]

            response = {
                "total_lines": total_lines,
                "start_line": start_idx,
                "end_line": end_idx,
                "logs": logs_slice,
                "running": web_command_status["running"],
                "last_error_line": web_command_status["last_error_line"],
            }

        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    # Print a clear message that the server is running with hot reload
    print("\n" + "=" * 80)
    print(" Flask server starting with HOT RELOAD enabled ".center(80, "="))
    print(
        " Changes to Python files will automatically restart the server ".center(
            80, "="
        )
    )
    print("=" * 80 + "\n")

    # Enable debug mode for hot reloading
    app.debug = True

    # Explicitly disable caching for development
    app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0

    # Set use_reloader to True for hot reloading
    app.run(
        host="0.0.0.0",
        port=8142,
        debug=True,
        use_reloader=True,
        # These options make hot reloading more reliable
        extra_files=None,  # Add any extra files to watch
        use_debugger=True,
        threaded=True,
    )