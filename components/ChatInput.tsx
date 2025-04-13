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
  const errorColor = "#ff6b6b";
  const processingColor = "#f0ad4e"; // Orange for processing

  // Use the new audio recording hook
  const {
    status,
    error: recordingError,
    toggleRecording,
    cancelRecording,
    transcribedText,
  } = useSpeechRecognition();

  // Determine if the mic button should be disabled
  const isMicDisabled =
    status !== "ready" && status !== "recording" && status !== "stopped";
  const isRecording = status === "recording";
  const isProcessing = status === "processing";

  // Append transcribed text when it arrives
  useEffect(() => {
    if (transcribedText) {
      setText((prev) => prev + transcribedText);
    }
  }, [transcribedText]);

  // Check for errors only when component mounts
  useEffect(() => {
    // Update immediately when component mounts
    updatePendingErrorCount();

    // No interval to avoid too many requests
  }, []);

  // Display any speech recognition errors
  useEffect(() => {
    if (recordingError) {
      console.error("Speech recognition error:", recordingError);
      // Don't show an error alert for every error - just log it
      // If needed, we could add an unobtrusive error indicator here
    }
  }, [recordingError]);

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
    const currentText = text.trim();
    if (!currentText && pendingErrorCount === 0) return; // Nothing to send

    const messageToSend = currentText ? currentText : "Please fix these errors";
    addMessage(messageToSend, "user");
    setText("");

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

    // Construct previousMessages, commandWithHistory, requestBody etc.
    // Fetch call to `http://${hostname}:${Constants.serverPort}/prompt`
    // Handle response: parseJsonResponses, addMessage("assistant"), setIsResponseLoading(false)
    // This part needs to be restored or ensured it exists from previous versions
    try {
      const userMessage = `<user>${messageToSend}</user>`;
      const conversationContent = previousMessages
        ? `${previousMessages}\n${userMessage}`
        : userMessage;
      const commandWithHistory = `<conversation>\n${conversationContent}\n</conversation>\n\n<instructions>Respond to the user's last message</instructions>`;

      const requestBody = {
        command: commandWithHistory,
        include_errors: true,
        directory: currentDirectory || undefined,
      };

      console.log(`Sending prompt to ${hostname}...`);
      const response = await fetch(
        `http://${hostname}:${Constants.serverPort}/prompt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const responseText = await response.text();
      const data = JSON.parse(responseText); // Assuming server sends JSON

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
        addMessage(`Server Error: ${data.stderr}`, "assistant");
      } else {
        addMessage("Received empty response from server.", "assistant");
      }
    } catch (error: any) {
      console.error("Error sending prompt:", error);
      addMessage(`Error: ${error.message}`, "assistant");
    } finally {
      setIsResponseLoading(false);
    }
  };

  const iconColor = useThemeColor({}, "icon");

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0} // Adjust offset as needed
      style={[styles.container, { backgroundColor }]}
    >
      {/* Error Banners */}
      {pendingErrorCount > 0 && (
        <View style={styles.errorBanner}>
          <IconSymbol
            name="exclamationmark.triangle"
            size={16}
            color={errorColor}
            style={styles.errorIcon}
          />
          <View style={styles.errorTextContainer}>
            <Text style={styles.errorText}>
              {pendingErrorCount} error{pendingErrorCount !== 1 ? "s" : ""}{" "}
              detected
            </Text>
            <Text style={styles.errorSubText}>Tap send to generate fixes</Text>
          </View>
        </View>
      )}
      {recordingError && (
        <View style={[styles.errorBanner, styles.voiceErrorBanner]}>
          <IconSymbol
            name="exclamationmark.triangle"
            size={16}
            color={errorColor}
            style={styles.errorIcon}
          />
          <Text style={[styles.errorText, { flex: 1 }]}>{recordingError}</Text>
        </View>
      )}

      {/* Input Row */}
      <View style={styles.inputRow}>
        <View style={[styles.inputContainer, { backgroundColor }]}>
          <TextInput
            style={[styles.input, { color: textColor }]}
            placeholder="Message Claude..."
            placeholderTextColor="#888"
            value={text}
            onChangeText={setText}
            multiline
          />
        </View>

        <View style={styles.buttonContainer}>
          {/* Voice input button */}
          {/*
          <TouchableOpacity
            style={[
              styles.iconButton,
              isRecording && styles.iconButtonRecording,
              isProcessing && styles.iconButtonProcessing,
              isMicDisabled && styles.disabledButton,
              {
                backgroundColor: isRecording
                  ? "#ffdddd"
                  : isProcessing
                  ? "#fff3cd"
                  : backgroundColor,
              },
            ]}
            onPress={toggleRecording}
            disabled={isMicDisabled || isProcessing} // Disable while processing too
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={processingColor} />
            ) : (
              <IconSymbol
                name={isRecording ? "stop.fill" : "mic.fill"}
                size={20}
                color={
                  isRecording ? errorColor : isMicDisabled ? "#888" : tintColor
                }
              />
            )}
          </TouchableOpacity>
          */}

          {/* Send button */}
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor },
              !text.trim() && pendingErrorCount === 0 && styles.disabledButton,
            ]}
            onPress={handleSend}
            disabled={!text.trim() && pendingErrorCount === 0}
          >
            <IconSymbol
              name="paperplane.fill"
              size={20}
              color={
                !text.trim() && pendingErrorCount === 0 ? "#888" : tintColor
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Combined Recording/Processing Indicator Bar */}
      {(isRecording || isProcessing) && (
        <View style={styles.indicatorBar}>
          <ActivityIndicator
            size="small"
            color={isRecording ? errorColor : processingColor}
          />
          <Text style={styles.indicatorText}>
            {isRecording ? "Recording audio..." : "Processing audio..."}
          </Text>
          {isRecording && ( // Show cancel only during recording
            <TouchableOpacity onPress={cancelRecording}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  voiceErrorBanner: {
    backgroundColor: "#ff6b6b40", // Make voice errors slightly more prominent
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
    marginBottom: 8, // Add margin below input row
  },
  inputContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 20,
    paddingLeft: 16,
    paddingRight: 12,
    paddingTop: Platform.OS === "ios" ? 10 : 8,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
    marginRight: 8,
    maxHeight: 120,
    justifyContent: "center", // Center placeholder vertically
  },
  input: {
    fontSize: 16,
    lineHeight: 20,
    paddingVertical: 0, // Remove default padding if handled by container
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end", // Align buttons to bottom
    paddingBottom: 2, // Fine-tune alignment with text input
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#444",
    justifyContent: "center",
    alignItems: "center",
  },
  iconButtonRecording: {
    borderColor: "#ff6b6b", // Use direct value or reference styles.errorColor
    backgroundColor: "#ffdddd",
  },
  iconButtonProcessing: {
    borderColor: "#f0ad4e", // Use direct value or reference styles.processingColor
    backgroundColor: "#fff3cd",
  },
  disabledButton: {
    opacity: 0.5,
    borderColor: "#555",
  },
  // Indicator Bar below input row
  indicatorBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 4,
    backgroundColor: "#333333", // Darker background for contrast
    borderRadius: 15,
  },
  indicatorText: {
    marginLeft: 10,
    color: "#eee", // Light text
    flex: 1,
    fontSize: 13,
  },
  cancelText: {
    color: "#ff6b6b", // Use direct value or reference styles.errorColor
    fontWeight: "bold",
    fontSize: 13,
    marginLeft: 10,
  },
});
