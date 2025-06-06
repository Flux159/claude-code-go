import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";
import { TouchableOpacity, View, Text, StyleSheet, Dimensions, PanResponder } from "react-native";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { ThemePreference, useAppContext } from "@/contexts/AppContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { SidebarMenu } from "@/components/SidebarMenu";
import { ThemedText } from "@/components/ThemedText";

declare global {
  var webViewRef: any;
  var fetchGitStatus: (() => Promise<void>) | null;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const {
    hostname,
    port,
    setSettingsVisible,
    clearMessages,
    pendingErrorCount,
    updatePendingErrorCount,
    currentDirectory,
    chatHistoryVisible,
    setChatHistoryVisible
  } = useAppContext();
  const displayUrl = `${hostname}:${port}`;
  const [fileTreeVisible, setFileTreeVisible] = useState(false);
  const textColor = useThemeColor({}, "text");

  // Periodically check for errors, but at a lower frequency
  useEffect(() => {
    // Check immediately
    updatePendingErrorCount();

    // Check less frequently to avoid overwhelming the server
    const intervalId = setInterval(updatePendingErrorCount, 5000);

    return () => clearInterval(intervalId);
  }, []);

  // Create a pan responder for swipe detection
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false, // Don't capture taps, only gestures
      onStartShouldSetPanResponderCapture: () => false, // Don't capture taps
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal movements starting from left edge
        const { dx, dy, moveX } = gestureState;
        // Ignore if near the hamburger menu icon (top 100px) to prevent interference
        const locationY = evt.nativeEvent.locationY;
        if (locationY < 100) {
          return false;
        }
        return moveX < 30 && Math.abs(dx) > Math.abs(dy) && dx > 20;
      },
      onPanResponderGrant: () => {
        // Grant the gesture without logging
      },
      onPanResponderMove: (evt, gestureState) => {
        // If swiping right from the left edge
        if (gestureState.dx > 50) {
          setFileTreeVisible(true);
        }
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  return (
    <>
      <SidebarMenu
        isVisible={fileTreeVisible || chatHistoryVisible}
        onClose={() => {
          setFileTreeVisible(false);
          setChatHistoryVisible(false);
        }}
      />
      
      <View style={{ flex: 1 }}>
        {/* Swipe area to open sidebar menu */}
        <View
          style={styles.gestureContainer}
          {...panResponder.panHandlers}
        />
        
        <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
          headerShown: true,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: {
            backgroundColor: Colors[colorScheme ?? "light"].background,
            borderTopColor: colorScheme === "dark" ? "#333" : "#ddd",
          },
          headerStyle: {
            backgroundColor: Colors[colorScheme ?? "light"].background,
            shadowColor: colorScheme === "dark" ? "#000" : undefined,
            borderBottomColor: colorScheme === "dark" ? "#333" : undefined,
            borderBottomWidth:
              colorScheme === "dark" ? StyleSheet.hairlineWidth : undefined,
            shadowOpacity: colorScheme === "dark" ? 0.3 : undefined,
          },
          headerTintColor: Colors[colorScheme ?? "light"].text,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            headerTitle: "Claude Go",
            tabBarLabel: "Chat",
            tabBarIcon: ({ color }) => (
              <View>
                <IconSymbol size={28} name="message.fill" color={color} />
                {pendingErrorCount > 0 && (
                  <View style={styles.errorBadge}>
                    <Text style={styles.errorText}>{pendingErrorCount}</Text>
                  </View>
                )}
              </View>
            ),
            headerLeft: () => (
              <View style={{ flexDirection: "row" }}>
                <TouchableOpacity
                  style={{
                    marginLeft: 8,
                    padding: 12,
                    minWidth: 44,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onPress={() => setFileTreeVisible(true)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <IconSymbol
                    name="line.3.horizontal"
                    size={20}
                    color={Colors[colorScheme ?? "light"].tint}
                  />
                </TouchableOpacity>
              </View>
            ),
            headerRight: () => (
              <View style={{ flexDirection: "row" }}>
                {false && (
                  <TouchableOpacity
                    style={{
                      padding: 12,
                      minWidth: 44,
                      minHeight: 44,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onPress={() => clearMessages()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <IconSymbol
                      name="plus.square"
                      size={20}
                      color={Colors[colorScheme ?? "light"].tint}
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={{
                    marginRight: 16,
                    padding: 12,
                    minWidth: 44,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onPress={() => setSettingsVisible(true)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <IconSymbol
                    name="gearshape"
                    size={20}
                    color={Colors[colorScheme ?? "light"].tint}
                  />
                </TouchableOpacity>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="web-preview"
          options={{
            headerTitle: () => (
              <Text style={{ fontSize: 14, color: textColor }}>
                {displayUrl}
              </Text>
            ),
            tabBarLabel: "Preview",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="globe" color={color} />
            ),
            headerLeft: () => (
              <View style={{ flexDirection: "row" }}>
                <TouchableOpacity
                  style={{
                    marginLeft: 8,
                    padding: 12,
                    minWidth: 44,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onPress={() => setFileTreeVisible(true)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <IconSymbol
                    name="line.3.horizontal"
                    size={20}
                    color={Colors[colorScheme ?? "light"].tint}
                  />
                </TouchableOpacity>
              </View>
            ),
            headerRight: () => (
              <View style={{ flexDirection: "row" }}>
                <TouchableOpacity
                  style={{
                    padding: 12,
                    minWidth: 44,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onPress={() => {
                    if (typeof global.openWebPreviewSettings === 'function') {
                      global.openWebPreviewSettings();
                    }
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <IconSymbol
                    name="server.rack"
                    size={20}
                    color={Colors[colorScheme ?? "light"].tint}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    marginRight: 16,
                    padding: 12,
                    minWidth: 44,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onPress={() => {
                    if (global.webViewRef && global.webViewRef.current) {
                      global.webViewRef.current.reload();
                      global.webViewRef.current.injectJavaScript(`
                        window.location.href = '/';
                        true; // This is needed for the injected script to run properly
                      `);
                    }
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <IconSymbol
                    name="arrow.clockwise"
                    size={20}
                    color={Colors[colorScheme ?? "light"].tint}
                  />
                </TouchableOpacity>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="git-changes"
          options={{
            headerTitle: () => (
              <Text style={{ fontSize: 14, color: textColor }}>
                {currentDirectory ? currentDirectory.split('/').pop() : ""}
              </Text>
            ),
            tabBarLabel: "Git",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="arrow.triangle.branch" color={color} />
            ),
            headerLeft: () => (
              <View style={{ flexDirection: "row" }}>
                <TouchableOpacity
                  style={{
                    marginLeft: 8,
                    padding: 12,
                    minWidth: 44,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onPress={() => setFileTreeVisible(true)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <IconSymbol
                    name="line.3.horizontal"
                    size={20}
                    color={Colors[colorScheme ?? "light"].tint}
                  />
                </TouchableOpacity>
              </View>
            ),
            headerRight: () => (
              <View style={{ flexDirection: "row" }}>
                <TouchableOpacity
                  style={{
                    marginRight: 16,
                    padding: 12,
                    minWidth: 44,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onPress={() => {
                    // Call the global fetchGitStatus function if available
                    if (typeof global.fetchGitStatus === 'function') {
                      global.fetchGitStatus();
                    }
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <IconSymbol
                    name="arrow.clockwise"
                    size={20}
                    color={Colors[colorScheme ?? "light"].tint}
                  />
                </TouchableOpacity>
              </View>
            ),
          }}
        />
      </Tabs>
      </View>
    </>
  );
}

// Add styles for the error badge and gesture container
const styles = StyleSheet.create({
  errorBadge: {
    position: "absolute",
    right: -6,
    top: -6,
    backgroundColor: "#ff6b6b",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  errorText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  gestureContainer: {
    position: 'absolute', 
    top: 100, // Start below the header to avoid interfering with the hamburger menu
    left: 0,
    bottom: 0,
    width: 20, // Narrower to only detect edge swipes
    zIndex: 100,
    // Uncomment to debug:
    // backgroundColor: 'rgba(255,0,0,0.1)',
  },
});
