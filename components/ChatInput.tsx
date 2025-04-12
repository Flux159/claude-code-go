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

interface ChatInputProps {
  onSend: (text: string) => void;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [text, setText] = useState('');
  const { hostname, port, addMessage } = useAppContext();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const handleSend = async () => {
    if (!text.trim()) return;

    onSend(text);
    setText('');

    try {
      // Send the message to the server
      const response = await fetch(`http://${hostname}:${Constants.serverPort}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: text
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message to server');
      }

      const data = await response.json();

      // Add the response to the chat as an assistant message
      if (data.stdout) {
        // Use the AppContext directly to specify the sender as 'assistant'
        addMessage(data.stdout, 'assistant');
      } else if (data.stderr) {
        addMessage(`Error: ${data.stderr}`, 'assistant');
      } else {
        addMessage('No response from the server.', 'assistant');
      }
    } catch (error) {
      addMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'assistant');
    }
  };

  const iconColor = useThemeColor({}, 'icon');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={60}
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
        >
          <IconSymbol name="paperplane.fill" size={20} color={textColor} />
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
    padding: 10,
    paddingTop: 10,
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
