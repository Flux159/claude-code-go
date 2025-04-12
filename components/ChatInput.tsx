import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Constants } from '@/constants/Constants';
import { useAppContext } from '@/contexts/AppContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from './ui/IconSymbol';

export function ChatInput() {
  const [text, setText] = useState('');
  const { hostname, messages, addMessage, setIsResponseLoading } = useAppContext();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

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
    if (!text.trim()) return;

    addMessage(text, 'user');
    setText('');

    setIsResponseLoading(true);

    // Format conversation history as plain text with User/Assistant prefixes
    const conversationHistory = messages
      .map(message => {
        // Extract only text content items
        const textContent = message.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join(' ');

        // Skip messages with no text content
        if (!textContent) return null;

        // Format as "User: ..." or "Assistant: ..."
        const role = message.role.charAt(0).toUpperCase() + message.role.slice(1);
        return `${role}: ${textContent}`;
      })
      .filter(Boolean) // Remove null entries
      .join('\n');

    // Add the current message to the conversation history with User prefix
    const fullConversation = conversationHistory
      ? `${conversationHistory}\nUser: ${text}`
      : `User: ${text}`;

    const commandWithHistory = fullConversation;

    try {
      const response = await fetch(`http://${hostname}:${Constants.serverPort}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: commandWithHistory
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
          placeholder="Reply to Claude..."
          placeholderTextColor="#999"
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: tintColor }]}
          onPress={handleSend}
          disabled={!text.trim()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <IconSymbol name="arrow.up" size={20} color={textColor} />
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
  input: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
