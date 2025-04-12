import { Tabs } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useAppContext } from '@/contexts/AppContext';
import { useColorScheme } from '@/hooks/useColorScheme';

declare global {
  var webViewRef: any;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { hostname, port, setSettingsVisible } = useAppContext();
  const displayUrl = `${hostname}:${port}`;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: true,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: {},
      }}>
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: 'Claude Go',
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="message.fill" color={color} />,
          headerRight: () => (
            <TouchableOpacity
              style={{
                marginRight: 16,
                padding: 12,
                minWidth: 44,
                minHeight: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => setSettingsVisible(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <IconSymbol name="gearshape" size={20} color={Colors[colorScheme ?? 'light'].tint} />
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="web-preview"
        options={{
          headerTitle: displayUrl,
          tabBarLabel: 'Preview',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="globe" color={color} />,
          headerRight: () => (
            <TouchableOpacity
              style={{
                marginRight: 16,
                padding: 12,
                minWidth: 44,
                minHeight: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => {
                if (global.webViewRef && global.webViewRef.current) {
                  global.webViewRef.current.source = { uri: `http://${hostname}:${port}` };
                  global.webViewRef.current.reload();
                }
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <IconSymbol name="arrow.clockwise" size={20} color={Colors[colorScheme ?? 'light'].tint} />
            </TouchableOpacity>
          ),
        }}
      />
    </Tabs>
  );
}
