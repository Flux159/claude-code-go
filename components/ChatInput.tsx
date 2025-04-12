import React, { useState, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Text,
} from 'react-native';

import { Constants } from '@/constants/Constants';
import { useAppContext } from '@/contexts/AppContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from './ui/IconSymbol';

export function ChatInput() {
  const [text, setText] = useState('');
  const [pendingErrors, setPendingErrors] = useState(0);
  const { hostname, messages, addMessage, setIsResponseLoading } = useAppContext();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const errorColor = '#ff6b6b'; // Red color for error indicator
  
  // Periodically check for pending errors
  useEffect(() => {
    // Initial check
    checkForErrors();
    
    // Set up interval to check every 5 seconds
    const intervalId = setInterval(checkForErrors, 5000);
    
    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [hostname]);
  
  // Function to check for pending errors
  const checkForErrors = async () => {
    try {
      const response = await fetch(`http://${hostname}:${Constants.serverPort}/errors`, {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        setPendingErrors(data.count || 0);
      }
    } catch (error) {
      console.error('Error checking for pending errors:', error);
    }
  };

  const parseJsonResponses = (responseText: string) => {
    try {
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [parsed];
    } catch (error) {
      // Continue with healing
    }

    try {
      const jsonObjects = [];
      let buffer = '';
      const lines = responseText.split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;

        buffer += line;

        try {
          const obj = JSON.parse(buffer);
          jsonObjects.push(obj);
          buffer = '';
        } catch (error) {
          // Continue buffering
        }
      }

      return jsonObjects.length > 0 ? jsonObjects : null;
    } catch (error) {
      console.error('Failed to parse JSON responses:', error);
      return null;
    }
  };

  const handleSend = async () => {
    // Allow sending even with empty text if there are errors to report
    if (!text.trim() && pendingErrors === 0) return;
    
    // If there's text, add it as a user message
    if (text.trim()) {
      addMessage(text, 'user');
      setText('');
    } else if (pendingErrors > 0) {
      // If no text but errors exist, add a placeholder message
      addMessage("Please analyze the errors", 'user');
    }
    
    // Reset pending errors (they'll be included in this prompt)
    // The server will clear them after including them in the prompt
    setPendingErrors(0);

    setIsResponseLoading(true);

    // Format conversation history as XML with user/assistant tags
    const previousMessages = messages
      .map(message => {
        // Skip empty messages
        if (!message.content || message.content.length === 0) return null;

        // Start the XML tag based on role
        const roleTag = message.role === 'user' ? 'user' : 'assistant';

        const formattedContent = message.content.map(item => {
          if (item.type === 'text') {
            return item.text;
          }
          else if (item.type === 'tool_use') {
            const formattedInput = typeof item.input === 'object'
              ? JSON.stringify(item.input, null, 2)
              : String(item.input || '');
            return `<tool_call name="${item.name || ''}" id="${item.id || ''}">\n${formattedInput}\n</tool_call>`;
          }
          else if (item.type === 'tool_result') {
            const formattedContent = typeof item.content === 'object'
              ? JSON.stringify(item.content, null, 2)
              : String(item.content || '');
            return `<tool_result tool_use_id="${item.tool_use_id || ''}">\n${formattedContent}\n</tool_result>`;
          }
          return '';
        }).join('\n');

        // Return the complete XML-formatted message
        return `<${roleTag}>${formattedContent}</${roleTag}>`;
      })
      .filter(Boolean) // Remove null entries
      .join('\n');

    // Create the new user message
    const userMessage = `<user>${text}</user>`;

    // Build the conversation content
    const conversationContent = previousMessages
      ? `${previousMessages}\n${userMessage}`
      : userMessage;

    // Wrap conversation in tags and add instructions
    const prompt = `<conversation>\n${conversationContent}\n</conversation>\n\n<instructions>Respond to the user's last message</instructions>`;

    try {
      const response = await fetch(`http://${hostname}:${Constants.serverPort}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: prompt
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message to server');
      }

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        setIsResponseLoading(false);
        addMessage('Error: Could not parse server response', 'assistant');
        return;
      }

      setIsResponseLoading(false);

      if (data.stdout) {
        const parsedResponses = parseJsonResponses(data.stdout);

        if (parsedResponses && Array.isArray(parsedResponses)) {
          for (const response of parsedResponses) {
            if (response.content) {
              addMessage(response.content, 'assistant');
            }
          }
        }
      } else if (data.stderr) {
        addMessage(`Error: ${data.stderr}`, 'assistant');
      } else {
        addMessage('No response from the server.', 'assistant');
      }
    } catch (error) {
      setIsResponseLoading(false);
      addMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'assistant');
    }
  };

  const iconColor = useThemeColor({}, 'icon');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={96}
    >
      <View style={[styles.container, { borderTopColor: '#cccccc80' }]}>
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor,
                color: textColor,
                borderColor: Platform.OS === 'ios' ? '#cccccc80' : 'transparent',
                borderWidth: StyleSheet.hairlineWidth,
              },
            ]}
            value={text}
            onChangeText={setText}
            placeholder={pendingErrors > 0 
              ? `Reply to Claude (includes ${pendingErrors} error${pendingErrors > 1 ? 's' : ''})`
              : "Reply to Claude..."}
            placeholderTextColor={pendingErrors > 0 ? errorColor : "#999"}
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          
          {pendingErrors > 0 && (
            <View style={[styles.errorBadge, { backgroundColor: errorColor }]}>
              <Text style={styles.errorBadgeText}>{pendingErrors}</Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity
          style={[
            styles.sendButton, 
            { 
              backgroundColor: tintColor,
              // Slightly dim the button if no text and only errors
              opacity: !text.trim() && pendingErrors > 0 ? 0.8 : 1
            }
          ]}
          onPress={handleSend}
          disabled={!text.trim() && pendingErrors === 0} // Enable if there's text OR errors
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <IconSymbol name="arrow.up" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc', // Default color, will be overridden by inline style
  },
  inputContainer: {
    flex: 1,
    position: 'relative',
    marginRight: 10,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    maxHeight: 100,
    width: '100%',
    paddingRight: 40, // Make room for the error badge
  },
  errorBadge: {
    position: 'absolute',
    right: 8,
    top: '50%',
    marginTop: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
