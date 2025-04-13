import AsyncStorage from '@react-native-async-storage/async-storage';
import { Constants } from '@/constants/Constants';

export const TOKEN_STORAGE_KEY = 'auth_token';

/**
 * Create a fetch request with authentication token for API calls
 */
export async function authenticatedFetch(
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> {
  // Determine if this endpoint requires authentication
  const isAuthEndpoint = Constants.authEndpoints?.some(
    authPath => endpoint.includes(authPath)
  );
  
  // Don't add auth header for login and other auth endpoints
  if (!isAuthEndpoint) {
    try {
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      if (token) {
        // Initialize headers if not present
        if (!options.headers) {
          options.headers = {};
        }
        
        // Add the token to the Authorization header
        (options.headers as Record<string, string>)['Authorization'] = `Bearer: ${token}`;
      }
    } catch (error) {
      console.error('Error retrieving auth token:', error);
    }
  }
  
  // Build the full URL
  const url = `http://${Constants.serverHost}:${Constants.serverPort}${endpoint}`;
  
  // Make the fetch request
  return fetch(url, options);
}

/**
 * Handle response errors and parsing JSON
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    // Handle authentication errors
    if (response.status === 401) {
      // Clear token on auth error
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      throw new Error('Authentication failed');
    }
    
    const errorText = await response.text();
    try {
      // Try to parse error as JSON
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.error || 'API request failed');
    } catch (e) {
      // If not valid JSON, throw the text
      throw new Error(errorText || `API request failed with status ${response.status}`);
    }
  }
  
  return response.json();
}

/**
 * Make an authenticated GET request
 */
export async function apiGet<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await authenticatedFetch(endpoint, {
    method: 'GET',
    ...options
  });
  return handleApiResponse<T>(response);
}

/**
 * Make an authenticated POST request
 */
export async function apiPost<T = any>(
  endpoint: string, 
  data: any, 
  options: RequestInit = {}
): Promise<T> {
  const response = await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: JSON.stringify(data),
    ...options
  });
  return handleApiResponse<T>(response);
}