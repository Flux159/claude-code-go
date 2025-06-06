import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Platform, StyleSheet, View, Animated } from 'react-native';

import { Collapsible } from '@/components/Collapsible';
import { Message } from '@/contexts/AppContext';
import { useColorScheme } from '@/hooks/useColorScheme';
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

// Formats diff output with color highlighting
const formatDiff = (text: string): JSX.Element => {
  if (!text) return <></>;

  const lines = text.split('\n');

  // Create elements for each line with appropriate styling
  const elements = lines.map((line, index) => {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      // Added line - green
      return <ThemedText key={index} style={{ color: '#4CAF50', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>{line}</ThemedText>;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      // Removed line - red
      return <ThemedText key={index} style={{ color: '#F44336', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>{line}</ThemedText>;
    } else {
      // Context line - normal
      return <ThemedText key={index} style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>{line}</ThemedText>;
    }
  });

  // Join elements with line breaks
  return (
    <>
      {elements.map((element, index) => (
        <React.Fragment key={`line-${index}`}>
          {element}
          {index < elements.length - 1 && '\n'}
        </React.Fragment>
      ))}
    </>
  );
};

// Checks if text looks like a diff output
const isDiffOutput = (text: string): boolean => {
  if (!text) return false;

  // Simple heuristic: check if content has lines starting with + or - and contains @@ markers
  const lines = text.split('\n');
  const hasDiffMarkers = lines.some(line =>
    (line.startsWith('+') && !line.startsWith('+++')) ||
    (line.startsWith('-') && !line.startsWith('---'))
  );
  const hasHunkHeaders = text.includes('@@ ');

  return hasDiffMarkers && hasHunkHeaders;
};

interface ChatMessageProps {
  message: Message;
  toolResultsMap?: Record<string, any>;
  shouldFadeSystem?: boolean;
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
    "Prognosticating",
    "Reasoning",
    "Simulating",
    "Extrapolating",
    "Theorizing",
    "Comprehending",
    "Scrutinizing",
    "Deciphering",
    "Formulating",
    "Hypothesizing",
    "Inferring",
    "Puzzling",
    "Studying",
    "Estimating",
    "Correlating",
    "Visualizing",
    "Conceptualizing",
    "Associating",
    "Reckoning",
    "Discerning",
    "Exploring",
    "Connecting",
    "Generating",
    "Integrating",
    "Systemizing",
    "Unraveling",
    "Assessing",
    "Harmonizing",
    "Reconciling",
    "Envisioning",
    "Orchestrating",
    "Reconciling",
    "Perceiving",
    "Amalgamating",
    "Calculating",
    "Configuring",
    "Disentangling",
    "Recalibrating",
    "Synthesizing"
  ];

  const waitingEmojis = [
    "⚔️", "🐉", "🐠", "🪄", "🔍", "🧠", "🦉", "📊",
    "🔮", "🦙", "🎯", "🧩", "🧬", "💭", "🤔", "⏳",
    "🚀", "🌟", "🧿", "🦢", "🔥", "🧪", "🧮", "🦾",
    "🌌", "🧲", "🦚", "🦄", "🐙", "🧸", "🪐", "🎲",
    "🎭", "🐢", "🦇", "🦋", "🦜", "🦁", "🎨", "🎧",
    "🧫", "🔆", "🛸", "🎪", "🦔", "🌈", "🐿️", "☄️",
    "🌋", "✨", "🔬", "🌊", "🍄", "🌻", "🦝", "🐸",
    "🕰️", "🔭", "🤖", "👽", "🧙", "🧝", "🧞", "🦖",
    "🐌", "🕸️", "🦒", "🐬", "🦩", "🦊", "🦡", "🦫",
    "🐳", "🦦", "🦥", "🦢", "🦗", "🦎", "🐝", "🦅",
    "🪶", "🪵", "🦂", "🕳️", "🎓", "🎡", "🧩", "🎠",
    "🧵", "🎁", "📚", "💡", "🥽", "⚗️", "🧿", "🧶",
    "🔧", "⌛", "📝", "🏺", "🧨", "🌠", "💫", "🍀",
    "🔮", "🎡", "🪅", "🎪", "🎭", "🎯", "🎨", "🃏",
    "🎐", "🌠", "✴️", "⚡", "🦚", "🦭", "🦮", "🦈",
    "🦕", "🦧", "🐲", "🧚", "🧛", "🧜", "🧟", "🦹"
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
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <ThemedText style={{ marginRight: 8 }}>
        {waitingEmojis[currentEmojiIndex]}
      </ThemedText>
      <ThemedText style={{ color: '#999' }}>
        {waitingWords[currentWordIndex]}...
      </ThemedText>
    </View>
  );
};

export function ChatMessage({ message, toolResultsMap = {}, shouldFadeSystem = false }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const userBubbleColor = useThemeColor({}, 'userBubble');
  const assistantBubbleColor = useThemeColor({}, 'assistantBubble');
  const systemBubbleColor = useThemeColor({}, 'background');
  const colorScheme = useColorScheme();
  
  // Animation for system message fade out
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (isSystem && shouldFadeSystem) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [isSystem, shouldFadeSystem, fadeAnim]);

  // Get theme colors for code blocks
  const codeBackgroundColor = useThemeColor({}, 'codeBackground');
  const codeBorderColor = useThemeColor({}, 'codeBorder');
  const dividerColor = useThemeColor({}, 'divider');

  // Format the timestamp (handle both Date objects and serialized date strings)
  const formattedTime = (() => {
    try {
      if (!message.timestamp) return '';

      // If it's already a Date object with the method
      if (message.timestamp instanceof Date && typeof message.timestamp.toLocaleTimeString === 'function') {
        return message.timestamp.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
      }

      // If it's a serialized date string
      const date = new Date(message.timestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
      }

      return '';
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return '';
    }
  })();

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
              {/* Input section - compact with height limit */}
              <View style={[
                styles.codeBlock,
                styles.inputCodeBlock,
                {
                  backgroundColor: codeBackgroundColor,
                  borderColor: codeBorderColor
                }
              ]}>
                {false && <ThemedText style={styles.toolHeader}>Input:</ThemedText>}
                <ThemedText selectable={true} style={[styles.toolResult, styles.scrollableText]}>
                  {typeof item.input === 'object'
                    ? formatCompactJSON(item.input)
                    : formatCompactText(String(item.input || ''))}
                </ThemedText>
              </View>

              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: dividerColor }]} />

              {/* Result section - compact with diff highlighting */}
              <View style={[
                styles.codeBlock,
                {
                  backgroundColor: codeBackgroundColor,
                  borderColor: codeBorderColor
                }
              ]}>
                {false && <ThemedText style={styles.toolHeader}>Result:</ThemedText>}
                {typeof item.result === 'object' ? (
                  <ThemedText selectable={true} style={[styles.toolResult, styles.scrollableText]}>
                    {formatCompactJSON(item.result)}
                  </ThemedText>
                ) : isDiffOutput(String(item.result || '')) ? (
                  <View style={styles.scrollableText}>
                    {formatDiff(String(item.result || ''))}
                  </View>
                ) : (
                  <ThemedText selectable={true} style={[styles.toolResult, styles.scrollableText]}>
                    {formatCompactText(String(item.result || ''))}
                  </ThemedText>
                )}
              </View>
            </Collapsible>
          );

        case 'tool_call':
          return (
            <Collapsible key={item.key} title={item.name || 'Tool Call'}>
              <View style={[
                styles.codeBlock,
                styles.inputCodeBlock,
                {
                  backgroundColor: codeBackgroundColor,
                  borderColor: codeBorderColor
                }
              ]}>
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
              <View style={[
                styles.codeBlock,
                {
                  backgroundColor: codeBackgroundColor,
                  borderColor: codeBorderColor
                }
              ]}>
                {typeof item.content === 'object' ? (
                  <ThemedText selectable={true} style={[styles.toolResult, styles.scrollableText]}>
                    {formatCompactJSON(item.content)}
                  </ThemedText>
                ) : isDiffOutput(String(item.content || '')) ? (
                  <View style={styles.scrollableText}>
                    {formatDiff(String(item.content || ''))}
                  </View>
                ) : (
                  <ThemedText selectable={true} style={[styles.toolResult, styles.scrollableText]}>
                    {formatCompactText(String(item.content || ''))}
                  </ThemedText>
                )}
              </View>
            </Collapsible>
          );

        default:
          return null;
      }
    });
  };

  // For system messages, use a special centered layout with animation
  if (isSystem) {
    return (
      <Animated.View style={[styles.systemContainer, { opacity: fadeAnim }]}>
        <ThemedView
          style={[styles.systemBubble, { backgroundColor: systemBubbleColor }]}
        >
          {renderContent()}
        </ThemedView>
      </Animated.View>
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
  toolUse: {
    fontStyle: 'italic',
    opacity: 0.8,
  },
  toolResult: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  toolHeader: {
    marginBottom: 4,
  },
  scrollableText: {
    flexShrink: 1,
  },
  codeBlock: {
    borderRadius: 8,
    padding: 8,
    width: '100%',
    overflow: 'scroll',
  },
  inputCodeBlock: {
    maxHeight: 150, // Limit height of input section
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
    width: '100%',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.6,
  },
});
