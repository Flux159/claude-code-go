import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ChatInput } from '@/components/ChatInput';
import { ChatMessage } from '@/components/ChatMessage';
import { SettingsModal } from '@/components/SettingsModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useAppContext } from '@/contexts/AppContext';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function ChatScreen() {
  const { messages, addMessage, hostname } = useAppContext();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const tintColor = useThemeColor({}, 'tint');

  const handleSend = (text: string) => {
    addMessage(text, 'user');
  };

  const handleServerResponse = (text: string) => {
    addMessage(text, 'assistant');
  };

  const openWebPreview = () => {
    router.push({
      pathname: '/web-preview',
      params: { hostname },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <ThemedText type="title">Claude Go</ThemedText>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setSettingsVisible(true)}
            >
              <IconSymbol name="gearshape" size={24} color={tintColor} />
            </TouchableOpacity>
          </View>
        </ThemedView>

        {/* Chat Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatMessage
              text={item.text}
              sender={item.sender}
              timestamp={item.timestamp}
            />
          )}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
        />

        {/* Input Area */}
        <ChatInput onSend={handleSend} />

        {/* Settings Modal */}
        <SettingsModal
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  messagesContainer: {
    flexGrow: 1,
    padding: 16,
  },
});
