import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { WebPreviewSettings } from '@/components/WebPreviewSettings';
import { useAppContext } from '@/contexts/AppContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Constants } from '@/constants/Constants';
import { TOKEN_STORAGE_KEY } from '@/utils/api';

// Make server status and settings available globally
declare global {
  var webServerStatus: {
    isRunning: boolean;
    checkStatus: () => Promise<void>;
    startServer: () => Promise<void>;
    stopServer?: () => Promise<void>;
  } | null;
  var openWebPreviewSettings: (() => void) | undefined;
}

interface WebCommandStatus {
  running: boolean;
  command: string;
  pid: number | null;
  start_time: number | null;
  exit_code: number | null;
  output: string[];
  error: string | null;
  output_lines: number;
}

export default function WebPreviewScreen() {
  const { hostname, port, webCommand, currentDirectory } = useAppContext();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<WebCommandStatus | null>(null);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const [settingsVisible, setSettingsVisible] = useState<boolean>(false);
  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    global.webViewRef = webViewRef;
    
    // Make server status and control methods available globally
    global.webServerStatus = {
      isRunning: status?.running || false,
      checkStatus: checkServerStatus,
      startServer: startServer,
    };
    
    return () => {
      global.webViewRef = null;
      global.webServerStatus = null;
    };
  }, [status?.running]);

  // Auto-check server status on component mount and periodically
  useEffect(() => {
    // Check immediately
    checkServerStatus();
    
    // Then check every 10 seconds
    const intervalId = setInterval(checkServerStatus, 10000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Check server status when error occurs - with immediate check
  useEffect(() => {
    if (error) {
      checkServerStatus();
    }
  }, [error]);

  const url = `http://${hostname}:${port}`;
  const displayUrl = `${hostname}:${port}`;

  const handleLoadStart = () => {
    setError(null);
  };

  const handleError = () => {
    setError(`Failed to load ${displayUrl}. Server might not be running.`);
  };

  // Check if the web server is running
  const checkServerStatus = async () => {
    try {
      setIsCheckingStatus(true);
      // Get auth token
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

      const response = await fetch(
        `http://${hostname}:${Constants.serverPort}/web-command`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer: ${token}` : '',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to check server status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Start the web server
  const startServer = async () => {
    try {
      setIsStarting(true);
      
      // Always use the claude-next-app directory for the web server
      // This is where the Next.js app lives and has package.json with npm run dev
      let serverDirectory;
      
      // If the current directory contains claude-next-app, use it directly
      if (currentDirectory?.includes('claude-next-app')) {
        serverDirectory = currentDirectory;
      } 
      // Otherwise use the root project directory + claude-next-app
      else if (currentDirectory) {
        // Extract the project root - go up to the claude-code-go root if possible
        const parts = currentDirectory.split('/');
        const claudeCodeGoIndex = parts.findIndex(part => part === 'claude-code-go');
        
        if (claudeCodeGoIndex >= 0) {
          // Rebuild the path up to claude-code-go and add claude-next-app
          const rootPath = parts.slice(0, claudeCodeGoIndex + 1).join('/');
          serverDirectory = `${rootPath}/claude-next-app`;
        } else {
          // Fallback - try to use current dir + claude-next-app or just use current dir
          serverDirectory = `${currentDirectory}/claude-next-app`;
        }
      } else {
        // No current directory set, try to use a reasonable default
        serverDirectory = '/Users/sclay/projects/claude-code-go/claude-next-app';
      }

      // Get auth token
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

      console.log('Starting server with:', {
        command: webCommand,
        directory: serverDirectory,
        url: `http://${hostname}:${Constants.serverPort}/web-command/start`,
      });

      const response = await fetch(
        `http://${hostname}:${Constants.serverPort}/web-command/start`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer: ${token}` : '',
          },
          body: JSON.stringify({ 
            command: webCommand, 
            directory: serverDirectory 
          }),
        }
      );

      console.log('Server start response status:', response.status);
      
      if (response.ok) {
        try {
          const data = await response.json();
          console.log('Server start success:', data);
        } catch (e) {
          console.log('Could not parse response JSON:', e);
        }
        
        // Wait a bit to give the server time to start
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // After starting the server, check status and reload webview
        await checkServerStatus();
        
        // Only if status shows running, reload the webview
        if (status?.running && webViewRef.current) {
          console.log('Reloading WebView after server started');
          webViewRef.current.reload();
        } else {
          console.log('Server not running after start attempt, not reloading WebView');
          // Try one more status check after a delay
          await new Promise(resolve => setTimeout(resolve, 2000));
          await checkServerStatus();
          
          if (status?.running && webViewRef.current) {
            console.log('Reloading WebView after second status check');
            webViewRef.current.reload();
          }
        }
      } else {
        let errorData = null;
        try {
          errorData = await response.json();
          console.error('Server start error response:', errorData);
        } catch (e) {
          console.error('Error response could not be parsed:', e);
        }
      }
    } catch (error) {
      console.error('Failed to start web server:', error);
    } finally {
      setIsStarting(false);
    }
  };

  // Calculate the directory where the server should run
  const getServerDirectory = () => {
    // If the current directory contains claude-next-app, use it directly
    if (currentDirectory?.includes('claude-next-app')) {
      return currentDirectory;
    } 
    // Otherwise use the root project directory + claude-next-app
    else if (currentDirectory) {
      // Extract the project root - go up to the claude-code-go root if possible
      const parts = currentDirectory.split('/');
      const claudeCodeGoIndex = parts.findIndex(part => part === 'claude-code-go');
      
      if (claudeCodeGoIndex >= 0) {
        // Rebuild the path up to claude-code-go and add claude-next-app
        const rootPath = parts.slice(0, claudeCodeGoIndex + 1).join('/');
        return `${rootPath}/claude-next-app`;
      } else {
        // Fallback - try to use current dir + claude-next-app
        return `${currentDirectory}/claude-next-app`;
      }
    } else {
      // No current directory set, use a reasonable default
      return '/Users/sclay/projects/claude-code-go/claude-next-app';
    }
  };

  // Render the server start dialog
  const renderServerStartDialog = () => {
    const serverDirectory = getServerDirectory();
    
    // If server is actually running but WebView had an error
    if (status?.running) {
      return (
        <ThemedView style={styles.dialogContainer}>
          <ThemedText style={styles.dialogTitle}>Connection Error</ThemedText>
          
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
            <ThemedText style={styles.statusText}>Server is running</ThemedText>
          </View>
          
          <ThemedText style={styles.dialogMessage}>
            The server is running but the WebView cannot connect to {displayUrl}.
          </ThemedText>
          
          <ThemedText style={styles.dialogTip}>
            Possible reasons:
          </ThemedText>
          
          <View style={styles.tipsList}>
            <ThemedText style={styles.tipItem}>• The server is still starting up</ThemedText>
            <ThemedText style={styles.tipItem}>• Wrong hostname or port settings</ThemedText>
            <ThemedText style={styles.tipItem}>• Server is listening on a different interface</ThemedText>
          </View>
          
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: tintColor }]}
            onPress={() => {
              if (webViewRef.current) {
                webViewRef.current.reload();
              }
            }}
          >
            <ThemedText style={styles.startButtonText}>Retry Connection</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      );
    }
    
    // Normal server not running dialog
    return (
      <ThemedView style={styles.dialogContainer}>
        <ThemedText style={styles.dialogTitle}>Server Not Running</ThemedText>
        
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: '#F44336' }]} />
          <ThemedText style={styles.statusText}>Server is stopped</ThemedText>
        </View>
        
        <ThemedText style={styles.dialogMessage}>
          The web server at {displayUrl} is not responding.
        </ThemedText>
        
        <ThemedText style={styles.commandText}>
          Command: <ThemedText style={styles.commandHighlight}>{webCommand}</ThemedText>
        </ThemedText>
        
        <ThemedText style={styles.directoryText}>
          Using directory: <ThemedText style={styles.directoryHighlight}>
            {serverDirectory}
          </ThemedText>
        </ThemedText>

        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: tintColor }]}
          onPress={startServer}
          disabled={isStarting}
        >
          {isStarting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <ThemedText style={styles.startButtonText}>Start Server</ThemedText>
          )}
        </TouchableOpacity>

        <ThemedText style={styles.settingsHint}>
          The Next.js app must run from the claude-next-app directory
        </ThemedText>

        {status && !status.running && status.error && (
          <ThemedView style={styles.errorContainer}>
            <ThemedText style={styles.errorLabel}>Error:</ThemedText>
            <ThemedText style={styles.errorDetails}>{status.error}</ThemedText>
          </ThemedView>
        )}
      </ThemedView>
    );
  };

  // Open settings when server button in toolbar is clicked
  useEffect(() => {
    // Define a custom event listener
    const openServerSettings = () => {
      setSettingsVisible(true);
    };
    
    // Attach the listener to the global scope for the server button to trigger
    global.openWebPreviewSettings = openServerSettings;
    
    // Clean up the listener when component unmounts
    return () => {
      global.openWebPreviewSettings = undefined;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <View style={styles.webViewContainer}>
          <WebView
            key={url}
            ref={webViewRef}
            source={{ uri: url }}
            style={[styles.webView, { backgroundColor }]}
            onLoadStart={handleLoadStart}
            onError={handleError}
          />

          {error && (
            <ThemedView style={styles.errorOverlay}>
              {isCheckingStatus ? (
                <ActivityIndicator color={tintColor} size="large" />
              ) : (
                renderServerStartDialog()
              )}
            </ThemedView>
          )}
        </View>
        
        {/* Web Preview Settings Modal */}
        <WebPreviewSettings 
          visible={settingsVisible} 
          onClose={() => setSettingsVisible(false)} 
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 20,
  },
  dialogContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dialogMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  dialogTip: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  tipsList: {
    alignSelf: 'stretch',
    marginBottom: 20,
  },
  tipItem: {
    fontSize: 14,
    marginBottom: 4,
    paddingLeft: 4,
  },
  commandText: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
    width: '100%',
  },
  commandHighlight: {
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  directoryText: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
    width: '100%',
  },
  directoryHighlight: {
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  startButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  settingsHint: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 12,
    textAlign: 'center',
  },
  errorContainer: {
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
    width: '100%',
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
  },
  errorLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  errorDetails: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
});
