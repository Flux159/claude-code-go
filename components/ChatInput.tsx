import React, { useState, useEffect } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Text,
  Alert,
  ActivityIndicator,
} from "react-native";

import { Constants } from "@/constants/Constants";
import { useAppContext } from "@/contexts/AppContext";
import { useThemeColor } from "@/hooks/useThemeColor";
import { IconSymbol } from "./ui/IconSymbol";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

export function ChatInput() {
  const [text, setText] = useState("");
  const {
    hostname,
    messages,
    addMessage,
    setIsResponseLoading,
    pendingErrorCount,
    updatePendingErrorCount,
    clearPendingErrors,
    currentDirectory,
  } = useAppContext();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const errorColor = "#ff6b6b"; // Red color for error indicator

  // Voice recognition state
  const {
    isListening,
    speechText,
    hasPermission,
    error: speechError,
    toggleListening,
    stopListening,
  } = useSpeechRecognition();

  // Listen for speech text changes
  useEffect(() => {
    if (speechText) {
      setText((prev) => prev + speechText);
    }
  }, [speechText]);

  // Check for errors only when component mounts
  useEffect(() => {
    // Update immediately when component mounts
    updatePendingErrorCount();

    // No interval to avoid too many requests
  }, []);

  // Display any speech recognition errors
  useEffect(() => {
    if (speechError) {
      console.error("Speech recognition error:", speechError);
      // Don't show an error alert for every error - just log it
      // If needed, we could add an unobtrusive error indicator here
    }
  }, [speechError]);

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
      let buffer = "";
      const lines = responseText.split("\n");

      for (const line of lines) {
        if (!line.trim()) continue;

        buffer += line;

        try {
          const obj = JSON.parse(buffer);
          jsonObjects.push(obj);
          buffer = "";
        } catch (error) {
          // Continue buffering
        }
      }

      return jsonObjects.length > 0 ? jsonObjects : null;
    } catch (error) {
      console.error("Failed to parse JSON responses:", error);
      return null;
    }
  };

  const handleSend = async () => {
    // Allow sending if there's text OR if there are pending errors
    const hasText = text.trim().length > 0;

    // If no text but we have errors, add a default message
    if (!hasText && pendingErrorCount > 0) {
      // Add a simple message when sending errors without text
      addMessage("Please fix these errors", "user");
    } else if (!hasText) {
      // No text and no errors, nothing to send
      return;
    } else {
      // Normal case: we have text to send
      addMessage(text, "user");
    }

    // Clear input
    setText("");

    // Clear error count immediately when sending a prompt
    // This gives immediate UI feedback
    if (pendingErrorCount > 0) {
      console.log(
        `Immediately clearing error count (was ${pendingErrorCount})`
      );
      await clearPendingErrors();
    }

    setIsResponseLoading(true);

    // Format conversation history as XML with user/assistant tags
    const previousMessages = messages
      .map((message) => {
        // Skip empty messages
        if (!message.content || message.content.length === 0) return null;

        // Start the XML tag based on role
        const roleTag = message.role === "user" ? "user" : "assistant";

        const formattedContent = message.content
          .map((item) => {
            if (item.type === "text") {
              return item.text;
            } else if (item.type === "tool_use") {
              const formattedInput =
                typeof item.input === "object"
                  ? JSON.stringify(item.input, null, 2)
                  : String(item.input || "");
              return `<tool_call name="${item.name || ""}" id="${
                item.id || ""
              }">\n${formattedInput}\n</tool_call>`;
            } else if (item.type === "tool_result") {
              const formattedContent =
                typeof item.content === "object"
                  ? JSON.stringify(item.content, null, 2)
                  : String(item.content || "");
              return `<tool_result tool_use_id="${
                item.tool_use_id || ""
              }">\n${formattedContent}\n</tool_result>`;
            }
            return "";
          })
          .join("\n");

        // Return the complete XML-formatted message
        return `<${roleTag}>${formattedContent}</${roleTag}>`;
      })
      .filter(Boolean) // Remove null entries
      .join("\n");

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
      console.log("Sending request to Claude server:", {
        url: `http://${hostname}:${Constants.serverPort}/prompt`,
        messageCount: messages.length,
        pendingErrorCount,
        serverPort: Constants.serverPort,
      });

      // Define with explicit type to ensure TypeScript recognizes the structure
      const requestBody: {
        command: string;
        include_errors: boolean;
        directory?: string;
      } = {
        command: commandWithHistory,
        include_errors: true, // Always include errors from Next.js if any exist
      };

      // Include the current directory if it exists
      if (currentDirectory) {
        requestBody.directory = currentDirectory;
        console.log(`Using directory from file explorer: ${currentDirectory}`);
      }

      console.log(
        "Request body:",
        JSON.stringify(requestBody).slice(0, 100) + "..."
      );

      const response = await fetch(
        `http://${hostname}:${Constants.serverPort}/prompt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server error response:", {
          status: response.status,
          statusText: response.statusText,
          errorText,
        });
        throw new Error(
          `Failed to send message to server: ${response.status} ${response.statusText}`
        );
      }

      const responseText = await response.text();
      console.log("Server response received, length:", responseText.length);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        console.error(
          "Failed to parse response:",
          error,
          "Response text:",
          responseText.slice(0, 200)
        );
        setIsResponseLoading(false);
        addMessage("Error: Could not parse server response", "assistant");
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
              addMessage(response.content, "assistant");
            }
          }
        }
      } else if (data.stderr) {
        addMessage(`Error: ${data.stderr}`, "assistant");
      } else {
        addMessage("No response from the server.", "assistant");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setIsResponseLoading(false);

      addMessage(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        "assistant"
      );
    }
  };

  const iconColor = useThemeColor({}, "icon");

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      style={[styles.container, { backgroundColor }]}
    >
      {pendingErrorCount > 0 && (
        <TouchableOpacity
          style={styles.errorBanner}
          onPress={() => {
            updatePendingErrorCount();
          }}
        >
          <View style={styles.errorTextContainer}>
            <Text style={styles.errorText}>
              {pendingErrorCount} error{pendingErrorCount !== 1 ? "s" : ""}{" "}
              detected
            </Text>
            <Text style={styles.errorSubText}>
              Tap to send a "fix errors" prompt
            </Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.inputRow}>
        <View style={[styles.inputContainer, { backgroundColor }]}>
          <TextInput
            style={[
              styles.input,
              {
                color: textColor,
                backgroundColor,
              },
            ]}
            placeholder="Message Claude..."
            placeholderTextColor="#888"
            value={text}
            onChangeText={setText}
            multiline
          />
        </View>

        <View style={styles.buttonContainer}>
          {/* Voice input button */}
          <TouchableOpacity
            style={[
              styles.iconButton,
              isListening && styles.iconButtonActive,
              { backgroundColor: isListening ? "#ffe0e0" : backgroundColor },
            ]}
            onPress={toggleListening}
          >
            <IconSymbol
              name={isListening ? "mic.fill" : "mic"}
              size={20}
              color={isListening ? errorColor : tintColor}
            />
          </TouchableOpacity>

          {/* Send button */}
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor },
              text.trim().length === 0 && styles.disabledButton,
            ]}
            onPress={handleSend}
            disabled={text.trim().length === 0 && pendingErrorCount === 0}
          >
            <IconSymbol
              name="paperplane.fill"
              size={20}
              color={
                text.trim().length === 0 && pendingErrorCount === 0
                  ? "#888"
                  : tintColor
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Voice recording indicator */}
      {isListening && (
        <View style={styles.listeningIndicator}>
          <ActivityIndicator size="small" color={errorColor} />
          <Text style={styles.listeningText}>Listening...</Text>
          <TouchableOpacity onPress={stopListening}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
  },
  errorBanner: {
    backgroundColor: "#ff6b6b20",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  errorIcon: {
    marginRight: 8,
  },
  errorTextContainer: {
    flex: 1,
  },
  errorText: {
    color: "#ff6b6b",
    fontWeight: "bold",
  },
  errorSubText: {
    color: "#ff6b6b80",
    fontSize: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  inputContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 20,
    paddingLeft: 16,
    paddingRight: 8,
    paddingTop: 8,
    paddingBottom: 8,
    marginRight: 6,
  },
  input: {
    fontSize: 16,
    maxHeight: 120,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
  },
  iconButtonActive: {
    borderColor: "#ff6b6b",
  },
  disabledButton: {
    opacity: 0.5,
  },
  listeningIndicator: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    marginTop: 8,
    backgroundColor: "#f8f8f830",
    borderRadius: 8,
  },
  listeningText: {
    marginLeft: 8,
    color: "#fff",
    flex: 1,
  },
  cancelText: {
    color: "#ff6b6b",
    fontWeight: "bold",
  },
});
