import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Collapsible } from '@/components/Collapsible';
import { Message } from '@/contexts/AppContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

// Utility functions for compact formatting
const formatCompactJSON = (json: any): string => {
  // For objects and arrays, show a preview with limited entries
  if (typeof json === 'object') {
    if (json === null) return 'null';
    
    const isArray = Array.isArray(json);
    const entries = isArray ? json : Object.entries(json);
    const totalLength = isArray ? entries.length : entries.length;
    
    // Limit to first 3 entries
    const displayEntries = isArray 
      ? entries.slice(0, 3) 
      : Object.entries(json).slice(0, 3);
    
    // Format the preview
    let result = isArray ? '[\n' : '{\n';
    
    displayEntries.forEach((entry, index) => {
      if (isArray) {
        result += `  ${JSON.stringify(entry, null, 1).replace(/\n/g, '\n  ')}`;
      } else {
        const [key, value] = entry as [string, any];
        result += `  "${key}": ${JSON.stringify(value, null, 1).replace(/\n/g, '\n  ')}`;
      }
      if (index < displayEntries.length - 1) {
        result += ',';
      }
      result += '\n';
    });
    
    // Add ellipsis if there are more entries
    if (totalLength > 3) {
      result += `  ... (${totalLength - 3} more items)\n`;
    }
    
    result += isArray ? ']' : '}';
    return result;
  }
  
  // For primitive values, just stringify
  return JSON.stringify(json, null, 2);
};

const formatCompactText = (text: string): string => {
  // If it's a code block with too many lines, show a preview
  const lines = text.split('\n');
  
  if (lines.length > 7) {
    // Show first 3 lines + last 3 lines
    return [
      ...lines.slice(0, 3),
      `... (${lines.length - 6} more lines)`,
      ...lines.slice(-3)
    ].join('\n');
  }
  
  return text;
};

interface ChatMessageProps {
  message: Message;
  toolResultsMap?: Record<string, any>;
}

export const LoadingDots = () => {
  const waitingWords = [
    "Thinking",
    "Processing",
    "Analyzing",
    "Computing", 
    "Pondering",
    "Contemplating",
    "Honking",
    "Calculating",
    "Ruminating",
    "Cogitating",
    "Deliberating",
    "Meditating",
    "Reflecting",
    "Considering",
    "Evaluating",
    "Examining",
    "Mulling",
    "Investigating",
    "Brainstorming",
    "Musing",
    "Synthesizing",
    "Deducing",
    "Prognosticating"
  ];
  
  const waitingEmojis = [
    "⚔️", "🐉", "🐠", "🪄", "🔍", "🧠", "🦉", "📊", 
    "🔮", "🦙", "🎯", "🧩", "🧬", "💭", "🤔", "⏳",
    "🚀", "🌟", "🧿", "🦢", "🔥", "🧪", "🧮", "🦾", 
    "🌌", "🧲", "🦚", "🦄", "🐙", "🧸", "🪐", "🎲",
    "🎭", "🐢", "🦇", "🦋", "🦜", "🦁", "🎨", "🎧",
    "🧫", "🔆", "🛸", "🎪", "🦔", "🌈", "🐿️", "☄️"
  ];
  
  const [currentWordIndex, setCurrentWordIndex] = useState(
    Math.floor(Math.random() * waitingWords.length)
  );
  const [currentEmojiIndex, setCurrentEmojiIndex] = useState(
    Math.floor(Math.random() * waitingEmojis.length)
  );
  const [sessionStartTime] = useState(Date.now());

  useEffect(() => {
    // Update emoji every 1 second
    const emojiInterval = setInterval(() => {
      setCurrentEmojiIndex(prev => (prev + 1) % waitingEmojis.length);
    }, 1000);
    
    // Check if 30 seconds have passed since component mounted
    const textInterval = setInterval(() => {
      const timeElapsed = Date.now() - sessionStartTime;
      if (timeElapsed >= 30000) { // 30 seconds
        setCurrentWordIndex(prev => {
          // Choose a different index than the current one
          const newIndex = Math.floor(Math.random() * (waitingWords.length - 1));
          return newIndex >= prev ? newIndex + 1 : newIndex;
        });
      }
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(emojiInterval);
      clearInterval(textInterval);
    };
  }, [sessionStartTime, waitingEmojis.length, waitingWords.length]);

  return (
    <ThemedText style={styles.loadingDots}>
      {waitingEmojis[currentEmojiIndex]} {waitingWords[currentWordIndex]}...
    </ThemedText>
  );
};

export function ChatMessage({ message, toolResultsMap = {} }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const userBubbleColor = useThemeColor({}, 'userBubble');
  const assistantBubbleColor = useThemeColor({}, 'assistantBubble');
  const systemBubbleColor = useThemeColor({}, 'background');

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
              style={[
                isUser ? styles.userText : styles.assistantText,
                styles.scrollableText
              ]}
              selectable={true}
            >
              {item.content === "(no content)" ? "Completed." : item.content}
            </ThemedText>
          );

        case 'tool_combined':
          return (
            <Collapsible key={item.key} title={item.name || 'Tool'}>
              {/* Input section */}
              {/* Input section - compact */}
              <View style={styles.codeBlock}>
                <ThemedText selectable={true} style={[styles.toolResult, styles.scrollableText]}>
                  <ThemedText style={styles.toolHeader}>Input:</ThemedText>{'\n'}
                  {typeof item.input === 'object'
                    ? formatCompactJSON(item.input)
                    : formatCompactText(String(item.input || ''))}
                </ThemedText>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Result section - compact */}
              <View style={styles.codeBlock}>
                <ThemedText selectable={true} style={[styles.toolResult, styles.scrollableText]}>
                  <ThemedText style={styles.toolHeader}>Result:</ThemedText>{'\n'}
                  {typeof item.result === 'object'
                    ? formatCompactJSON(item.result)
                    : formatCompactText(String(item.result || ''))}
                </ThemedText>
              </View>
            </Collapsible>
          );

        case 'tool_call':
          return (
            <Collapsible key={item.key} title={item.name || 'Tool Call'}>
              <View style={styles.codeBlock}>
                <ThemedText selectable={true} style={[styles.toolResult, styles.scrollableText]}>
                  {typeof item.input === 'object'
                    ? formatCompactJSON(item.input)
                    : formatCompactText(String(item.input || ''))}
                </ThemedText>
              </View>
            </Collapsible>
          );

        case 'tool_result':
          return (
            <Collapsible key={item.key} title="Tool Result">
              <View style={styles.codeBlock}>
                <ThemedText selectable={true} style={[styles.toolResult, styles.scrollableText]}>
                  {typeof item.content === 'object'
                    ? formatCompactJSON(item.content)
                    : formatCompactText(String(item.content || ''))}
                </ThemedText>
              </View>
            </Collapsible>
          );

        default:
          return null;
      }
    });
  };

  // For system messages, use a special centered layout
  if (isSystem) {
    return (
      <View style={styles.systemContainer}>
        <ThemedView
          style={[styles.systemBubble, { backgroundColor: systemBubbleColor }]}
        >
          {renderContent()}
        </ThemedView>
      </View>
    );
  }

  // For regular user/assistant messages
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
    maxWidth: '90%',
  },
  userContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  systemContainer: {
    alignSelf: 'center',
    marginVertical: 16,
  },
  systemBubble: {
    padding: 8,
    borderRadius: 12,
    opacity: 0.7,
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
    gap: 12,
  },
  userBubble: {
    borderBottomRightRadius: 2,
  },
  assistantBubble: {
    borderBottomLeftRadius: 2,
  },
  userText: {
    color: 'white',
  },
  assistantText: {},
  loadingDots: {
    fontSize: 16,
    color: '#f28c28', // Orange color
    fontWeight: 'bold',
    minWidth: 150,
    lineHeight: 24,
  },
  toolUse: {
    fontStyle: 'italic',
    opacity: 0.8,
  },
  toolResult: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  toolHeader: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  scrollableText: {
    flexShrink: 1,
  },
  codeBlock: {
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    padding: 8,
    width: '100%',
    overflow: 'scroll',
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
