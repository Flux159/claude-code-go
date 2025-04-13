import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Constants } from '@/constants/Constants';
import { useAuth } from '@/contexts/AuthContext';

// Token storage key for consistent usage
const TOKEN_STORAGE_KEY = 'auth_token';

// Custom hook for making authenticated API requests
export function useFetchWithAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logout } = useAuth();

  /**
   * Make an authenticated fetch request
   */
  const fetchWithAuth = useCallback(async (
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    setIsLoading(true);
    setError(null);

    try {
      // Determine if this is an auth endpoint that doesn't need a token
      const isAuthEndpoint = Constants.authEndpoints?.some(
        authPath => endpoint.includes(authPath)
      );

      // Create the full URL with the server host and port
      const url = `http://${Constants.serverHost}:${Constants.serverPort}${endpoint}`;
      
      // If not an auth endpoint, add the authorization header
      if (!isAuthEndpoint) {
        const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        
        if (token) {
          // Make sure headers object exists
          if (!options.headers) {
            options.headers = {};
          }
          
          // Add the Authorization header with Bearer prefix
          (options.headers as Record<string, string>)['Authorization'] = `Bearer: ${token}`;
        }
      }

      // Make the actual fetch request
      const response = await fetch(url, options);
      
      // Handle unauthorized responses (401)
      if (response.status === 401) {
        console.warn('Authentication failed, logging out');
        logout();
        setError('Session expired. Please log in again.');
        throw new Error('Authentication failed');
      }
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  /**
   * Make a GET request with authentication
   */
  const get = useCallback(async <T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const response = await fetchWithAuth(endpoint, {
      method: 'GET',
      ...options
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `Request failed with status ${response.status}`);
    }
    
    return response.json();
  }, [fetchWithAuth]);

  /**
   * Make a POST request with authentication
   */
  const post = useCallback(async <T = any>(
    endpoint: string,
    data: any,
    options: RequestInit = {}
  ): Promise<T> => {
    const response = await fetchWithAuth(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      body: JSON.stringify(data),
      ...options
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `Request failed with status ${response.status}`);
    }
    
    return response.json();
  }, [fetchWithAuth]);

  /**
   * Check authentication status with the server
   */
  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetchWithAuth('/auth/ping', { method: 'GET' });
      return response.ok;
    } catch (err) {
      return false;
    }
  }, [fetchWithAuth]);

  return {
    get,
    post,
    fetchWithAuth,
    checkAuth,
    isLoading,
    error,
    clearError: () => setError(null)
  };
}