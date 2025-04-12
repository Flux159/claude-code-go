import React, { useState, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Text,
  Alert,
} from 'react-native';

import { Constants } from '@/constants/Constants';
import { useAppContext } from '@/contexts/AppContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from './ui/IconSymbol';

export function ChatInput() {
  const [text, setText] = useState('');
  const { 
    hostname, 
    messages, 
    addMessage, 
    setIsResponseLoading,
    pendingErrorCount,
    updatePendingErrorCount,
    clearPendingErrors
  } = useAppContext();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const errorColor = '#ff6b6b'; // Red color for error indicator
  
  // Check for errors only when component mounts
  useEffect(() => {
    // Update immediately when component mounts
    updatePendingErrorCount();
    
    // No interval to avoid too many requests
  }, []);

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
    // Allow sending if there's text OR if there are pending errors
    const hasText = text.trim().length > 0;
    
    // If no text but we have errors, add a default message
    if (!hasText && pendingErrorCount > 0) {
      // Add a simple message when sending errors without text
      addMessage("Please fix these errors", 'user');
    } else if (!hasText) {
      // No text and no errors, nothing to send
      return;
    } else {
      // Normal case: we have text to send
      addMessage(text, 'user');
    }
    
    // Clear input
    setText('');

    // Clear error count immediately when sending a prompt
    // This gives immediate UI feedback
    if (pendingErrorCount > 0) {
      console.log(`Immediately clearing error count (was ${pendingErrorCount})`);
      await clearPendingErrors();
    }
    
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

    // Determine which message to send
    // If we have no input text but have errors, use our default message
    // Otherwise use the actual input text
    let messageToSend = hasText ? text : "Please fix these errors";
    
    const userMessage = `<user>${messageToSend}</user>`;

    // Build the conversation content
    const conversationContent = previousMessages
      ? `${previousMessages}\n${userMessage}`
      : userMessage;

    // Wrap conversation in tags and add instructions
    // Redefining this to fix the "Property 'commandWithHistory' doesn't exist" error
    const commandWithHistory = `<conversation>\n${conversationContent}\n</conversation>\n\n<instructions>Respond to the user's last message</instructions>`;

    try {
      // No need to update error count before sending
      
      // Use hostname from context for server communication
      // This ensures it works on both physical devices and simulators
      console.log('Sending request to Claude server:', {
        url: `http://${hostname}:${Constants.serverPort}/prompt`,
        messageCount: messages.length,
        pendingErrorCount,
        serverPort: Constants.serverPort
      });
      
      // Define with explicit type to ensure TypeScript recognizes the structure
      const requestBody: { command: string; include_errors: boolean } = {
        command: commandWithHistory,
        include_errors: true // Always include errors from Next.js if any exist
      };
      
      console.log('Request body:', JSON.stringify(requestBody).slice(0, 100) + '...');
      
      const response = await fetch(`http://${hostname}:${Constants.serverPort}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`Failed to send message to server: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('Server response received, length:', responseText.length);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        console.error('Failed to parse response:', error, 'Response text:', responseText.slice(0, 200));
        setIsResponseLoading(false);
        addMessage('Error: Could not parse server response', 'assistant');
        return;
      }
      
      // We've already cleared errors at the start of handleSend
      // No need to check again here

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
      console.error('Error sending message:', error);
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
            placeholder={pendingErrorCount > 0 
              ? `Reply to Claude (or press send to fix ${pendingErrorCount} error${pendingErrorCount > 1 ? 's' : ''})`
              : "Reply to Claude..."}
            placeholderTextColor={pendingErrorCount > 0 ? errorColor : "#999"}
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          
          {pendingErrorCount > 0 && (
            <TouchableOpacity 
              onPress={() => {
                Alert.alert(
                  'Clear Errors',
                  `Clear ${pendingErrorCount} pending error${pendingErrorCount > 1 ? 's' : ''}?`,
                  [
                    {text: 'Cancel', style: 'cancel'},
                    {text: 'Clear', onPress: clearPendingErrors},
                  ]
                );
              }}
              style={[styles.errorBadge, { backgroundColor: errorColor }]}
            >
              <Text style={styles.errorBadgeText}>{pendingErrorCount}</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity
          style={[styles.sendButton, { 
            backgroundColor: text.trim() || pendingErrorCount > 0 ? tintColor : '#cccccc' // Gray out when disabled
          }]}
          onPress={handleSend}
          disabled={!text.trim() && pendingErrorCount === 0} // Enable if there's text OR errors
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
