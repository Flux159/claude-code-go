import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAppContext } from '@/contexts/AppContext';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function WebPreviewScreen() {
  const { hostname, port } = useAppContext();
  const [error, setError] = useState<string | null>(null);
  const backgroundColor = useThemeColor({}, 'background');
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    global.webViewRef = webViewRef;
    return () => {
      global.webViewRef = null;
    };
  }, []);

  const url = `http://${hostname}:${port}`;
  const displayUrl = `${hostname}:${port}`;

  const handleLoadStart = () => {
    setError(null);
  };

  const handleError = () => {
    setError(`Failed to load ${displayUrl}. Make sure the server is running and the hostname is correct.`);
  };

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
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </ThemedView>
          )}
        </View>
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
});
