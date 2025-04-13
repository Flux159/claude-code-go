import React, { useRef } from 'react';
import { FlatList, SafeAreaView, StyleSheet, View, Text } from 'react-native';

import { ChatInput } from '@/components/ChatInput';
import { ChatMessage, LoadingDots } from '@/components/ChatMessage';
import { SettingsModal } from '@/components/SettingsModal';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function ChatScreen() {
  const { messages, isResponseLoading, settingsVisible, setSettingsVisible, isTogglingCollapsible } = useAppContext();
  const { username } = useAuth();
  const flatListRef = useRef<FlatList>(null);
  const assistantBubbleColor = useThemeColor({}, 'assistantBubble');

  // Create a global tool results map
  const toolResultsMap = React.useMemo(() => {
    const map: Record<string, any> = {};

    // Process all messages to build the tool results map
    messages.forEach(message => {
      message.content.forEach(item => {
        if (item.type === 'tool_result' && item.tool_use_id) {
          map[item.tool_use_id] = item;
        }
      });
    });

    return map;
  }, [messages]);

  // Filter out messages that only contain tool results that have been combined
  const filteredMessages = React.useMemo(() => {
    return messages.filter(message => {
      // Keep all user messages
      if (message.role === 'user') return true;

      // For assistant messages, check if they contain anything other than tool results
      // or if they contain tool results that haven't been combined
      return message.content.some(item =>
        item.type !== 'tool_result' ||
        !item.tool_use_id ||
        !toolResultsMap[item.tool_use_id]
      );
    });
  }, [messages, toolResultsMap]);

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
          data={filteredMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.messageItem}>
              <ChatMessage message={item} toolResultsMap={toolResultsMap} />
            </View>
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
  messageItem: {
    width: '100%',
  },
  assistantContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    marginVertical: 8,
    maxWidth: '90%',
  },
  bubble: {
    padding: 12,
    borderRadius: 8,
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
    borderBottomLeftRadius: 2,
  },
});
