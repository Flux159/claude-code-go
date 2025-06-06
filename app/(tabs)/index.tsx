import React, { useRef, useState, useEffect } from "react";
import { FlatList, SafeAreaView, StyleSheet, View, TouchableOpacity, Animated, Keyboard, KeyboardAvoidingView, Platform } from "react-native";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { IconSymbol } from "@/components/ui/IconSymbol";

import { ChatInput } from "@/components/ChatInput";
import { ChatMessage, LoadingDots } from "@/components/ChatMessage";
import { SettingsModal } from "@/components/SettingsModal";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeColor } from "@/hooks/useThemeColor";

export default function ChatScreen() {
  const {
    messages,
    isResponseLoading,
    settingsVisible,
    setSettingsVisible,
    isTogglingCollapsible,
  } = useAppContext();
  const flatListRef = useRef<FlatList>(null);
  const assistantBubbleColor = useThemeColor({}, "assistantBubble");
  const colorScheme = useColorScheme();

  // Track if user is at bottom of chat
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollButtonOpacity = useRef(new Animated.Value(0)).current;
  // Track whether scroll was initiated by user or programmatically
  const isUserScrolling = useRef(false);
  const lastScrollY = useRef(0);

  // Create a global tool results map
  const toolResultsMap = React.useMemo(() => {
    const map: Record<string, any> = {};

    // Process all messages to build the tool results map
    messages.forEach((message) => {
      message.content.forEach((item) => {
        if (item.type === "tool_result" && item.tool_use_id) {
          map[item.tool_use_id] = item;
        }
      });
    });

    return map;
  }, [messages]);

  // Filter out messages that only contain tool results that have been combined
  const filteredMessages = React.useMemo(() => {
    return messages.filter((message) => {
      // Keep all user messages
      if (message.role === "user") return true;

      // For assistant messages, check if they contain anything other than tool results
      // or if they contain tool results that haven't been combined
      return message.content.some(
        (item) =>
          item.type !== "tool_result" ||
          !item.tool_use_id ||
          !toolResultsMap[item.tool_use_id]
      );
    });
  }, [messages, toolResultsMap]);

  // Handle scroll button animation
  useEffect(() => {
    Animated.timing(scrollButtonOpacity, {
      toValue: isAtBottom ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isAtBottom]);

  // Handle scrolling to bottom
  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setIsAtBottom(true);
  };

  // Setup keyboard event listeners to scroll to bottom when keyboard appears
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        if (isAtBottom) {
          // Small delay to ensure layout has updated
          setTimeout(() => scrollToBottom(), 100);
        }
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, [isAtBottom]);

  // Loading indicator component to show at the bottom of the message list
  const LoadingIndicator = () => {
    if (!isResponseLoading) return null;

    return (
      <View style={styles.assistantContainer}>
        <ThemedView
          style={[
            styles.bubble,
            styles.assistantBubble,
            { backgroundColor: assistantBubbleColor },
          ]}
        >
          <LoadingDots />
        </ThemedView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ThemedView style={styles.container}>
          {/* Chat Messages */}
          <FlatList
            ref={flatListRef}
            data={filteredMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.messageItem}>
                <ChatMessage
                  message={item}
                  toolResultsMap={toolResultsMap}
                  shouldFadeSystem={filteredMessages.some(msg => msg.role === 'user')}
                />
              </View>
            )}
            ListFooterComponent={<LoadingIndicator />}
            contentContainerStyle={styles.messagesContainer}
            onContentSizeChange={() => {
              if (!isTogglingCollapsible && isAtBottom) {
                flatListRef.current?.scrollToEnd({ animated: true });
              }
            }}
            onScrollBeginDrag={() => {
              // User initiated scroll
              isUserScrolling.current = true;
            }}
            onScroll={(event) => {
              const offsetY = event.nativeEvent.contentOffset.y;
              const contentHeight = event.nativeEvent.contentSize.height;
              const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;

              // Consider user at bottom if within 20px of bottom
              const isClose = contentHeight - offsetY - scrollViewHeight < 20;

              // Detect significant manual scrolling (more than 10px) from bottom to up
              const scrollDelta = offsetY - lastScrollY.current;
              lastScrollY.current = offsetY;
              
              // Only dismiss keyboard on intentional user scrolling away from bottom
              if (isUserScrolling.current && !isClose && isAtBottom && Math.abs(scrollDelta) > 10) {
                Keyboard.dismiss();
              }

              setIsAtBottom(isClose);
            }}
            onMomentumScrollEnd={() => {
              // Reset user scrolling flag after scroll momentum ends
              isUserScrolling.current = false;
            }}
            scrollEventThrottle={200}
          />

          {/* Scroll to bottom button */}
          <Animated.View
            style={[
              styles.scrollToBottomButton,
              { opacity: scrollButtonOpacity }
            ]}
            pointerEvents={isAtBottom ? 'none' : 'auto'}
          >
            <TouchableOpacity
              onPress={scrollToBottom}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[
                styles.scrollButton,
                { backgroundColor: Colors[colorScheme ?? "light"].tint }
              ]}
            >
              <IconSymbol
                name="arrow.down"
                size={20}
                color={colorScheme === "dark" ? "#FFFFFF" : "#333333"}
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Input Area */}
          <ChatInput />

          {/* Settings Modal */}
          <SettingsModal
            visible={settingsVisible}
            onClose={() => setSettingsVisible(false)}
          />
        </ThemedView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  messagesContainer: {
    flexGrow: 1,
    padding: 16,
  },
  messageItem: {
    width: "100%",
  },
  assistantContainer: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
    marginVertical: 8,
    maxWidth: "90%",
  },
  bubble: {
    padding: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  assistantBubble: {
    borderBottomLeftRadius: 2,
  },
  scrollToBottomButton: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    zIndex: 10,
  },
  scrollButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  }
});
