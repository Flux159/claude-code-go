import { Tabs } from "expo-router";
import React from "react";
import { View, StyleSheet } from "react-native";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { ThemedText } from "@/components/ThemedText";
import { ClaudeLogo } from "@/components/ClaudeLogo";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? "light"].tint;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tintColor,
        headerShown: true,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: {},
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Chat",
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <ClaudeLogo size={24} color={tintColor} />
              <ThemedText style={styles.title}>Chat</ThemedText>
            </View>
          ),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="message.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="web-preview"
        options={{
          title: "Preview",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="globe" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
});
