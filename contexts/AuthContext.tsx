import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import { Constants } from '@/constants/Constants';

// Authentication related types
interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  username: string | null;
  login: (username: string, password: string, serverHost?: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  checkAuthStatus: (serverHost?: string) => Promise<boolean>;
}

const TOKEN_STORAGE_KEY = 'auth_token';
const USERNAME_STORAGE_KEY = 'auth_username';

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  token: null,
  username: null,
  login: async () => false,
  logout: () => {},
  isLoading: true,
  checkAuthStatus: async () => false,
});

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load token from storage on app start
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        const storedUsername = await AsyncStorage.getItem(USERNAME_STORAGE_KEY);
        
        if (storedToken) {
          setToken(storedToken);
          setUsername(storedUsername);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Failed to load authentication token:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadToken();
  }, []);

  // Function to check if the user is authenticated with the server
  const checkAuthStatus = async (serverHost?: string): Promise<boolean> => {
    if (!token) return false;
    
    // Use the provided server host or fallback to Constants
    const host = serverHost || Constants.serverHost;
    
    try {
      const response = await fetch(`http://${host}:${Constants.serverPort}/auth/ping`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer: ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        return true;
      } else {
        // If token is invalid, clear the authentication state
        await logout();
        return false;
      }
    } catch (error) {
      console.error('Error checking authentication status:', error);
      return false;
    }
  };

  // Login function
  const login = async (username: string, password: string, serverHost?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Use the provided server host or fallback to Constants
      const host = serverHost || Constants.serverHost;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout
      
      const response = await fetch(`http://${host}:${Constants.serverPort}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (response.ok && data.access_token) {
        // Store token and username
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
        await AsyncStorage.setItem(USERNAME_STORAGE_KEY, username);
        
        // Update state
        setToken(data.access_token);
        setUsername(username);
        setIsAuthenticated(true);
        return true;
      } else {
        const errorMessage = data.error || 'Authentication failed';
        console.error('Login API error:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle different error types
      if (error.name === 'AbortError') {
        throw new Error('Connection timed out. Please check your server hostname and try again.');
      } else if (error instanceof TypeError && error.message.includes('Network request failed')) {
        throw new Error('Cannot connect to server. Please check your server hostname and try again.');
      }
      
      // Rethrow the error to be handled by the login screen
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Clear stored credentials
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      await AsyncStorage.removeItem(USERNAME_STORAGE_KEY);
      
      // Update state
      setToken(null);
      setUsername(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Context value
  const authContextValue: AuthContextType = {
    isAuthenticated,
    token,
    username,
    login,
    logout,
    isLoading,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};