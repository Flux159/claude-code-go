import React from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import { View, ActivityIndicator } from "react-native";

import { AppProvider, useAppContext } from "@/contexts/AppContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import LoginScreen from "@/components/LoginScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function AuthenticationWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, checkAuthStatus } = useAuth();
  const [checkedAuth, setCheckedAuth] = useState(false);

  // Get hostname from app context
  const { hostname } = useAppContext();

  useEffect(() => {
    // Check auth status when component mounts or hostname changes
    const checkAuth = async () => {
      await checkAuthStatus(hostname);
      setCheckedAuth(true);
    };

    checkAuth();
  }, [hostname]);

  if (isLoading || !checkedAuth) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#8c52ff" />
      </View>
    );
  }

  return isAuthenticated ? (
    <>{children}</>
  ) : (
    <ErrorBoundary>
      <LoginScreen />
    </ErrorBoundary>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <AppProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <AuthenticationWrapper>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
            </Stack>
          </AuthenticationWrapper>
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        </ThemeProvider>
      </AppProvider>
    </AuthProvider>
  );
}
