import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";

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

  return (
    <>
      <SidebarMenu
        isVisible={fileTreeVisible || chatHistoryVisible}
        onClose={() => {
          setFileTreeVisible(false);
          setChatHistoryVisible(false);
        }}
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
                      marginRight: 8,
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
    </>
  );
}

// Add styles for the error badge
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
});
