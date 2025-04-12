from flask import Flask, request, jsonify, Response, send_file
import subprocess
import os
import json
from pathlib import Path
import sys
from typing import Dict, List, Union, Any
import time
from collections import deque

app = Flask(__name__)

# Store recent errors for automatic inclusion in Claude prompts
# Using a deque for a fixed-size FIFO queue
MAX_STORED_ERRORS = 10
recent_errors = deque(maxlen=MAX_STORED_ERRORS)


def get_shell_env() -> Dict[str, str]:
    """Get the shell environment variables."""
    env_output = subprocess.check_output(["env"], shell=True).decode("utf-8")
    return dict(line.split("=", 1) for line in env_output.splitlines() if "=" in line)


@app.route("/directories", methods=["GET"])
def get_directories():
    try:
        relative = request.args.get("relative", "false").lower() == "true"

        if relative:
            # Return the parent directory of the current repository
            directory = str(Path(os.getcwd()).parent)
        else:
            # Return the user's home directory by default
            directory = os.path.expanduser("~")

        return jsonify({"directory": directory})
    except Exception as e:
        return jsonify({"error": "Failed to get directory path"}), 500


@app.route("/directories", methods=["POST"])
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


@app.route("/reset", methods=["POST"])
def git_reset():
    try:
        data = request.get_json()
        directory = data.get("directory")

        if not directory:
            return jsonify({"error": "Directory path is required"}), 400

        # Check which git command is available (oldgit or git)
        try:
            subprocess.run(["oldgit", "--version"], capture_output=True, check=True)
            git_cmd = "oldgit"
        except (subprocess.CalledProcessError, FileNotFoundError):
            git_cmd = "git"

        # Check if directory is a git repository
        if not os.path.exists(os.path.join(directory, ".git")):
            return jsonify({"error": "Not a git repository"}), 400

        # Run git reset --hard
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
