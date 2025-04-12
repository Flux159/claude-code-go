import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface ChatMessageProps {
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

export function ChatMessage({ text, sender, timestamp }: ChatMessageProps) {
  const isUser = sender === 'user';
  const primaryColor = useThemeColor({}, 'tint');

  // Format the timestamp
  const formattedTime = timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <ThemedView
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          isUser ? { backgroundColor: primaryColor } : {},
        ]}
      >
        <ThemedText
          style={isUser ? styles.userText : styles.assistantText}
          selectable={true}
        >
          {text}
        </ThemedText>
      </ThemedView>
      <ThemedText style={styles.timestamp}>{formattedTime}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    maxWidth: '80%',
  },
  userContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
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
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
  },
  userText: {
    color: 'black',
  },
  assistantText: {},
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.6,
  },
});
