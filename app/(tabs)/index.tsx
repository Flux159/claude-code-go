import React, { useRef } from 'react';
import { FlatList, SafeAreaView, StyleSheet, View } from 'react-native';

import { ChatInput } from '@/components/ChatInput';
import { ChatMessage, LoadingDots } from '@/components/ChatMessage';
import { SettingsModal } from '@/components/SettingsModal';
import { ThemedView } from '@/components/ThemedView';
import { useAppContext } from '@/contexts/AppContext';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function ChatScreen() {
  const { messages, isResponseLoading, settingsVisible, setSettingsVisible, isTogglingCollapsible } = useAppContext();
  const flatListRef = useRef<FlatList>(null);
  const assistantBubbleColor = useThemeColor({}, 'assistantBubble');

  // Loading indicator component to show at the bottom of the message list
  const LoadingIndicator = () => {
    if (!isResponseLoading) return null;

    return (
      <View style={styles.assistantContainer}>
        <ThemedView
          style={[
            styles.bubble,
            styles.assistantBubble,
            { backgroundColor: assistantBubbleColor }
          ]}
        >
          <LoadingDots />
        </ThemedView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* Chat Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatMessage message={item} />
          )}
          ListFooterComponent={<LoadingIndicator />}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={() => {
            if (!isTogglingCollapsible) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
        />

        {/* Input Area */}
        <ChatInput />

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
  messagesContainer: {
    flexGrow: 1,
    padding: 16,
  },
  assistantContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    marginVertical: 8,
    maxWidth: '80%',
  },
  bubble: {
    padding: 12,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
  },
});
