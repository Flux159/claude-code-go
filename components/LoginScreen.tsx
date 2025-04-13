import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { Colors } from '@/constants/Colors';
import { Constants } from '@/constants/Constants';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { ClaudeLogo } from './ClaudeLogo';
import { ErrorBoundary } from './ErrorBoundary';

// Custom Login Error fallback component
function LoginErrorFallback({ error, resetError }: { error: Error | null, resetError: () => void }) {
  const colorScheme = useColorScheme();
  
  return (
    <ThemedView style={styles.container}>
      <View style={styles.errorContainer}>
        <ThemedText style={styles.errorTitle}>Connection Error</ThemedText>
        <ThemedText style={styles.errorMessage}>
          {error?.message || 'Could not connect to the server. Please check your server settings and try again.'}
        </ThemedText>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#8c52ff' }]}
          onPress={resetError}
        >
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const { hostname, setHostname } = useAppContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [serverHost, setServerHost] = useState(hostname || Constants.serverHost);
  const colorScheme = useColorScheme();
  const textColor = Colors[colorScheme].text;
  const bgColor = Colors[colorScheme].background;
  const inputBgColor = colorScheme === 'dark' ? '#333' : '#f2f2f2';
  const buttonColor = '#8c52ff'; // Claude purple

  // No need to get system username from the server

  // Update the hostname in app context when it changes in login form
  useEffect(() => {
    if (serverHost && serverHost !== hostname) {
      setHostname(serverHost);
    }
  }, [serverHost, hostname, setHostname]);

  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      if (!username.trim() || !password.trim()) {
        Alert.alert('Login Error', 'Please enter both username and password');
        return;
      }

      if (!serverHost.trim()) {
        Alert.alert('Login Error', 'Please enter a server hostname');
        return;
      }

      // Clear any previous errors
      setLoginError(null);

      // Save the current hostname first
      if (serverHost !== hostname) {
        await setHostname(serverHost);
      }

      const success = await login(username, password, serverHost);
      
      if (!success) {
        // Login failed - error message already shown by the login function
        setLoginError('Authentication failed. Please check your credentials and try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(
        error instanceof Error 
          ? error.message 
          : 'Failed to connect to the server. Please check your server settings.'
      );
    }
  };

  const handleErrorReset = () => {
    setLoginError(null);
  };
  
  // If we have a login error, show the fallback component
  if (loginError) {
    return (
      <LoginErrorFallback 
        error={new Error(loginError)} 
        resetError={handleErrorReset} 
      />
    );
  }

  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <LoginErrorFallback error={error} resetError={resetError} />
      )}
    >
      <ThemedView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.innerContainer}
        >
          <View style={styles.logoContainer}>
            <ClaudeLogo size={80} />
            <ThemedText style={styles.title}>Claude Code Go</ThemedText>
            <ThemedText style={styles.subtitle}>Please log in to continue</ThemedText>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Server Hostname</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBgColor, color: textColor }
                ]}
                value={serverHost}
                onChangeText={setServerHost}
                placeholder="hostname or IP address"
                placeholderTextColor="#999"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Username</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBgColor, color: textColor }
                ]}
                value={username}
                onChangeText={setUsername}
                placeholder="Your username"
                placeholderTextColor="#999"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Password</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBgColor, color: textColor }
                ]}
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColor="#999"
                secureTextEntry
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: buttonColor }]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Log In</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </ThemedView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    opacity: 0.8,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  hint: {
    marginTop: 4,
    fontSize: 12,
    opacity: 0.7,
  },
  button: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Error styles
  errorContainer: {
    padding: 20,
    borderRadius: 8,
    width: '85%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 240, 240, 0.9)', 
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#D32F2F',
  },
  errorMessage: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
    lineHeight: 22,
  }
});