/**
 * Application constants used throughout the app.
 */

export const Constants = {
  // Server configuration
  serverPort: 8142,
  serverHost: 'localhost', // Default, should be updated by SettingsModal
  
  // API endpoints that don't need authentication
  authEndpoints: [
    '/auth/login'
  ]
};
