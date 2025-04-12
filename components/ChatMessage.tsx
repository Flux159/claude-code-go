import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Collapsible } from '@/components/Collapsible';
import { Message } from '@/contexts/AppContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface ChatMessageProps {
  message: Message;
  toolResultsMap?: Record<string, any>;
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

export function ChatMessage({ message, toolResultsMap = {} }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const userBubbleColor = useThemeColor({}, 'userBubble');
  const assistantBubbleColor = useThemeColor({}, 'assistantBubble');

  // Format the timestamp
  const formattedTime = message.timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Define the type for processed content items
  type ProcessedContentItem = {
    type: string;
    content?: string;
    name?: string;
    input?: any;
    result?: any;
    key: string;
  };

  // Process the content items to combine tool calls with their results
  const processedContent = useMemo(() => {
    const result: ProcessedContentItem[] = [];

    // Create the processed items
    message.content.forEach((item, index) => {
      if (item.type === 'text') {
        // Text items pass through unchanged
        result.push({
          type: 'text',
          content: item.text,
          key: `text-${index}`
        });
      }
      else if (item.type === 'tool_use') {
        // Check if this tool use has a corresponding result
        const resultItem = item.id ? toolResultsMap[item.id] : null;

        if (resultItem) {
          // Create a combined tool item
          result.push({
            type: 'tool_combined',
            name: item.name,
            input: item.input,
            result: resultItem.content,
            key: `combined-${index}`
          });
        } else {
          // Just the tool call
          result.push({
            type: 'tool_call',
            name: item.name,
            input: item.input,
            key: `call-${index}`
          });
        }
      }
      // Skip tool_result items entirely - they're already handled with tool_use items
    });

    return result;
  }, [message.content, toolResultsMap]);

  // Render the processed content
  const renderContent = () => {
    return processedContent.map((item: ProcessedContentItem) => {
      switch (item.type) {
        case 'text':
          return (
            <ThemedText
              key={item.key}
              style={isUser ? styles.userText : styles.assistantText}
              selectable={true}
            >
              {item.content === "(no content)" ? "Completed." : item.content}
            </ThemedText>
          );

        case 'tool_combined':
          return (
            <Collapsible key={item.key} title={item.name || 'Tool'}>
              {/* Input section */}
              <ThemedText selectable={true} style={styles.toolResult}>
                {typeof item.input === 'object'
                  ? JSON.stringify(item.input, null, 2)
                  : String(item.input || '')}
              </ThemedText>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Result section */}
              <ThemedText selectable={true} style={styles.toolResult}>
                {typeof item.result === 'object'
                  ? JSON.stringify(item.result, null, 2)
                  : String(item.result || '')}
              </ThemedText>
            </Collapsible>
          );

        case 'tool_call':
          return (
            <Collapsible key={item.key} title={item.name || 'Tool Call'}>
              <ThemedText selectable={true} style={styles.toolResult}>
                {typeof item.input === 'object'
                  ? JSON.stringify(item.input, null, 2)
                  : String(item.input || '')}
              </ThemedText>
            </Collapsible>
          );

        case 'tool_result':
          return (
            <Collapsible key={item.key} title="Tool Result">
              <ThemedText selectable={true} style={styles.toolResult}>
                {typeof item.content === 'object'
                  ? JSON.stringify(item.content, null, 2)
                  : String(item.content || '')}
              </ThemedText>
            </Collapsible>
          );

        default:
          return null;
      }
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
    gap: 12,
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
    fontSize: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#cccccc80',
    marginVertical: 10,
    width: '100%',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.6,
  },
});
