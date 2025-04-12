from flask import Flask, request, jsonify, Response, send_file
import subprocess
import os
import json
from pathlib import Path
import sys
from typing import Dict, List, Union, Any

app = Flask(__name__)

def get_shell_env() -> Dict[str, str]:
    """Get the shell environment variables."""
    env_output = subprocess.check_output(['env'], shell=True).decode('utf-8')
    return dict(line.split('=', 1) for line in env_output.splitlines() if '=' in line)

@app.route('/directories', methods=['GET'])
def get_directories():
    try:
        relative = request.args.get('relative', 'false').lower() == 'true'
        
        if relative:
            # Return the parent directory of the current repository
            directory = str(Path(os.getcwd()).parent)
        else:
            # Return the user's home directory by default
            directory = os.path.expanduser('~')
        
        return jsonify({'directory': directory})
    except Exception as e:
        return jsonify({'error': 'Failed to get directory path'}), 500

@app.route('/directories', methods=['POST'])
def list_directory():
    try:
        data = request.get_json()
        directory = data.get('directory')
        
        if not directory:
            return jsonify({'error': 'Directory path is required'}), 400

        contents = []
        for item in os.scandir(directory):
            contents.append({
                'name': item.name,
                'type': 'directory' if item.is_dir() else 'file',
                'path': os.path.join(directory, item.name)
            })

        return jsonify({'contents': contents})
    except Exception as e:
        return jsonify({'error': 'Failed to list directory contents'}), 500

@app.route('/prompt', methods=['POST'])
def execute_command():
    try:
        data = request.get_json()
        command = data.get('command')
        directory = data.get('directory')
        
        if not command:
            return jsonify({'error': 'Command is required'}), 400
        if not directory:
            directory = str(Path(os.getcwd())) + "/claude-next-app"
            # return jsonify({'error': 'Directory is required'}), 400

        claude_command = f'claude -p --dangerously-skip-permissions --output-format "stream-json" "{command}"'
        print(f"Executing command: {claude_command} in directory: {directory}")
        
        # Get shell environment
        shell_env = get_shell_env()
        env = {**os.environ, **shell_env}
        
        result = subprocess.run(
            claude_command,
            cwd=directory,
            env=env,
            shell=True,
            capture_output=True,
            text=True
        )
        
        return jsonify({
            'stdout': result.stdout,
            'stderr': result.stderr,
            'success': True
        })
    except Exception as e:
        return jsonify({
            'error': 'Failed to execute command',
            'details': str(e)
        }), 500

@app.route('/')
def serve_test_html():
    return send_file('test-sse.html')

def generate_sse_response(command: str, directory: str):
    """Generator function for SSE responses."""
    try:
        claude_command = f'claude -p --dangerously-skip-permissions --output-format "stream-json" "{command}"'
        print(f"Executing command: {claude_command} in directory: {directory}")
        
        process = subprocess.Popen(
            claude_command,
            cwd=directory,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        all_outputs = []
        
        while True:
            output = process.stdout.readline()
            if output == '' and process.poll() is not None:
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

@app.route('/promptstream', methods=['GET'])
def prompt_stream_get():
    command = request.args.get('command')
    directory = request.args.get('directory')
    
    if not command:
        return jsonify({'error': 'Command is required'}), 400
    if not directory:
        return jsonify({'error': 'Directory is required'}), 400
    
    return Response(
        generate_sse_response(command, directory),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    )

@app.route('/promptstream', methods=['POST'])
def prompt_stream_post():
    data = request.get_json()
    command = data.get('command')
    directory = data.get('directory')
    
    if not command:
        return jsonify({'error': 'Command is required'}), 400
    if not directory:
        return jsonify({'error': 'Directory is required'}), 400
    
    return Response(
        generate_sse_response(command, directory),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    )

@app.route('/reset', methods=['POST'])
def git_reset():
    try:
        data = request.get_json()
        directory = data.get('directory')
        
        if not directory:
            return jsonify({'error': 'Directory path is required'}), 400
        
        # Check which git command is available (oldgit or git)
        try:
            subprocess.run(['oldgit', '--version'], capture_output=True, check=True)
            git_cmd = 'oldgit'
        except (subprocess.CalledProcessError, FileNotFoundError):
            git_cmd = 'git'
        
        # Check if directory is a git repository
        if not os.path.exists(os.path.join(directory, '.git')):
            return jsonify({'error': 'Not a git repository'}), 400
        
        # Run git reset --hard
        result = subprocess.run(
            f'{git_cmd} reset --hard',
            cwd=directory,
            shell=True,
            capture_output=True,
            text=True
        )
        
        # Also clean untracked files if desired
        clean_result = subprocess.run(
            f'{git_cmd} clean -fd',
            cwd=directory,
            shell=True,
            capture_output=True,
            text=True
        )
        
        return jsonify({
            'success': result.returncode == 0 and clean_result.returncode == 0,
            'stdout': result.stdout + clean_result.stdout,
            'stderr': result.stderr + clean_result.stderr
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to reset git repository',
            'details': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8142) 
