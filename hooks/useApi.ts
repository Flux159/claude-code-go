import { useState, useCallback } from 'react';
import { apiGet, apiPost } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Custom hook for handling API calls with authentication
 */
export function useApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logout } = useAuth();

  /**
   * Make a GET request with authentication
   */
  const get = useCallback(async <T = any>(endpoint: string, options: RequestInit = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiGet<T>(endpoint, options);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      
      // Handle authentication errors
      if (errorMessage.includes('Authentication failed')) {
        logout();
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  /**
   * Make a POST request with authentication
   */
  const post = useCallback(async <T = any>(
    endpoint: string, 
    data: any, 
    options: RequestInit = {}
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const responseData = await apiPost<T>(endpoint, data, options);
      return responseData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      
      // Handle authentication errors
      if (errorMessage.includes('Authentication failed')) {
        logout();
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  /**
   * Check authentication status
   */
  const ping = useCallback(async () => {
    try {
      await get('/auth/ping');
      return true;
    } catch (error) {
      return false;
    }
  }, [get]);

  return {
    get,
    post,
    ping,
    isLoading,
    error,
    clearError: () => setError(null)
  };
}