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

        # Print to console for debugging with highlighting
        print("\n" + "!" * 80)
        print(" 🚨 ERROR REPORTED FROM NEXT.JS APP 🚨 ".center(80, "!"))
        print("!" * 80)
        print(f"\n{json.dumps(error_data, indent=2)}\n")
        print("!" * 80 + "\n")

        # Store in our error queue for later inclusion in Claude prompts
        recent_errors.append(error_data)

        # Log the count of stored errors
        print(f"Currently storing {len(recent_errors)} errors for next Claude prompt")

        return jsonify({"success": True, "stored_errors": len(recent_errors)})
    except Exception as e:
        print(f"Error handling error report: {str(e)}")
        return jsonify({"error": "Failed to process error report", "details": str(e)}), 500


@app.route("/prompt", methods=["POST"])
def execute_command():
    try:
        data = request.get_json()
        command = data.get("command")
        directory = data.get("directory")
        include_errors = data.get("include_errors", True)  # Default to including errors

        if not command:
            return jsonify({"error": "Command is required"}), 400
        if not directory:
            directory = str(Path(os.getcwd())) + "/claude-next-app"
            # return jsonify({'error': 'Directory is required'}), 400

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
            print(" 🔄 INCLUDING ERROR CONTEXT IN CLAUDE PROMPT 🔄 ".center(80, "="))
            print("=" * 80 + "\n")

        claude_command = (
            f'claude -p --dangerously-skip-permissions --output-format "stream-json" "{modified_command}"'
        )
        print(f"Executing command: {claude_command} in directory: {directory}")

        # Get shell environment
        shell_env = get_shell_env()
        env = {**os.environ, **shell_env}

        result = subprocess.run(
            claude_command,
            cwd=directory,
            env=env,
            shell=False,
            capture_output=True,
            text=True,
        )

        return jsonify({"stdout": result.stdout, "stderr": result.stderr, "success": True})
    except Exception as e:
        return jsonify({"error": "Failed to execute command", "details": str(e)}), 500


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
            print(" 🔄 INCLUDING ERROR CONTEXT IN CLAUDE PROMPT (SSE) 🔄 ".center(80, "="))
            print("=" * 80 + "\n")

        claude_command = (
            f'claude -p --dangerously-skip-permissions --output-format "stream-json" "{modified_command}"'
        )
        print(f"Executing command: {claude_command} in directory: {directory}")

        process = subprocess.Popen(
            claude_command,
            cwd=directory,
            shell=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True,
        )

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

    except Exception as e:
        yield f"data: {json.dumps({'error': str(e), 'success': False})}\n\n"


@app.route("/promptstream", methods=["GET"])
def prompt_stream_get():
    command = request.args.get("command")
    directory = request.args.get("directory")
    include_errors = request.args.get("include_errors", "true").lower() == "true"

    if not command:
        return jsonify({"error": "Command is required"}), 400
    if not directory:
        return jsonify({"error": "Directory is required"}), 400

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
        return jsonify({"error": "Directory is required"}), 400

    return Response(
        generate_sse_response(command, directory, include_errors),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@app.route("/errors", methods=["GET"])
def get_errors():
    """Endpoint to retrieve current stored errors"""
    return jsonify({"count": len(recent_errors), "errors": list(recent_errors)})


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
    print(" Changes to Python files will automatically restart the server ".center(80, "="))
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
