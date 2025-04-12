import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Collapsible } from '@/components/Collapsible';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: Array<{
      type: string;
      text?: string;
      content?: string;
      name?: string;
      input?: any;
      tool_use_id?: string;
    }>;
    timestamp: Date;
  };
}

export const LoadingDots = () => {
  const [dots, setDots] = useState('.');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '.';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <ThemedText style={styles.loadingDots}>
      {dots}
    </ThemedText>
  );
};

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const userBubbleColor = useThemeColor({}, 'userBubble');
  const assistantBubbleColor = useThemeColor({}, 'assistantBubble');

  // Format the timestamp
  const formattedTime = message.timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Render different content based on type
  const renderContent = () => {
    return message.content.map((item, index) => {
      if (item.type === 'text' && item.text) {
        return (
          <ThemedText
            key={index}
            style={isUser ? styles.userText : styles.assistantText}
            selectable={true}
          >
            {item.text}
          </ThemedText>
        );
      } else if (item.type === 'tool_result' && item.content) {
        return (
          <Collapsible key={index} title="Tool Result">
            <ThemedText selectable={true} style={styles.toolResult}>
              {item.content}
            </ThemedText>
          </Collapsible>
        );
      } else if (item.type === 'tool_use' && item.name) {
        return (
          <Collapsible key={index} title={item.name}>
            <ThemedText selectable={true} style={styles.toolResult}>
              {JSON.stringify(item.input, null, 2)}
            </ThemedText>
          </Collapsible>
        );
      }
      return null;
    });
  };

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <ThemedView
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          isUser ? { backgroundColor: userBubbleColor } : { backgroundColor: assistantBubbleColor },
        ]}
      >
        {renderContent()}
      </ThemedView>
      {false && <ThemedText style={styles.timestamp}>{formattedTime}</ThemedText>}
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
    color: 'white',
  },
  assistantText: {},
  loadingDots: {
    fontSize: 16,
    letterSpacing: 2,
    minWidth: 20,
  },
  toolUse: {
    fontStyle: 'italic',
    opacity: 0.8,
  },
  toolResult: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.6,
  },
});
