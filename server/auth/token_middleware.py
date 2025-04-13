from functools import wraps
from flask import request, jsonify
from .auth import validate_token

def token_required(f):
    """Decorator to enforce token authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({'message': 'Authentication token is missing!'}), 401
        
        # Extract the token from the header
        if auth_header.startswith('Bearer: '):
            token = auth_header.split('Bearer: ')[1]
        elif auth_header.startswith('Bearer '):
            token = auth_header.split('Bearer ')[1]
        else:
            return jsonify({'message': 'Invalid token format! Use Bearer: <token>'}), 401
            
        # Validate the token
        username = validate_token(token)
        if not username:
            return jsonify({'message': 'Invalid or expired token!'}), 401
            
        # Add the username to the request context
        request.username = username
        return f(*args, **kwargs)
    
    return decorated
