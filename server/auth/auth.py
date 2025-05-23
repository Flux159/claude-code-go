import os
import jwt
import datetime
import getpass
from pathlib import Path

# Configuration
JWT_SECRET_KEY = "claude-code-go-secret-key"  # In production, use a secure environment variable
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRY_MINUTES = 60 * 24  # 24 hours

def get_current_username():
    """Get the current system username"""
    return getpass.getuser()

def get_password_from_file():
    """Get the password from the passwd file in user's home directory or use default"""
    try:
        # Check for password file in user's home directory
        home_passwd_path = Path.home() / ".claudecodego" / "passwd"
        
        if home_passwd_path.exists():
            with open(home_passwd_path, "r") as f:
                return f.read().strip()
        else:
            # If no password file in home directory, use hardcoded default
            return "password123"
    except Exception as e:
        print(f"Error reading password file: {e}")
        # Fall back to default password
        return "password123"

def authenticate_user(username, password):
    """Authenticate a user by username and password"""
    system_username = get_current_username()
    stored_password = get_password_from_file()
    
    # Check if username matches system username and password matches stored password
    if username == system_username and password == stored_password:
        return True
    return False

def create_access_token(username):
    """Create a JWT access token"""
    payload = {
        "sub": username,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=TOKEN_EXPIRY_MINUTES),
        "iat": datetime.datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def validate_token(token):
    """Validate a JWT token"""
    try:
        if not token:
            return None
        
        # Remove 'Bearer: ' prefix if present
        if token.startswith("Bearer: "):
            token = token[8:]
        elif token.startswith("Bearer "):
            token = token[7:]
            
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")
        return username
    except jwt.PyJWTError as e:
        print(f"Token validation error: {e}")
        return None

def get_token_from_header(authorization_header):
    """Extract token from Authorization header"""
    if not authorization_header:
        return None
    
    parts = authorization_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer:" and parts[0].lower() != "bearer":
        return None
    
    return parts[1]
