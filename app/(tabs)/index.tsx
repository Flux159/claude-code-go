import React, { useRef, useState, useEffect } from "react";
import { 
  FlatList, 
  SafeAreaView, 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  Animated, 
  Keyboard, 
  KeyboardAvoidingView, 
  Platform
} from "react-native";
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
  const { username } = useAuth();
  const flatListRef = useRef<FlatList>(null);
  const assistantBubbleColor = useThemeColor({}, "assistantBubble");
  const colorScheme = useColorScheme();
  
  // Track if user is at bottom of chat
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollButtonOpacity = useRef(new Animated.Value(0)).current;
  
  // Track keyboard state
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Track user scroll intent
  const [isManuallyScrolling, setIsManuallyScrolling] = useState(false);
  const scrollTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Only dismiss keyboard on deliberate scrolling (not auto-scroll from typing)
  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;
    
    // Consider user at bottom if within 20px of bottom
    const isClose = contentHeight - offsetY - scrollViewHeight < 20;
    setIsAtBottom(isClose);
    
    // If this is a manual scroll event and keyboard is visible, dismiss it
    if (isManuallyScrolling && isKeyboardVisible && !isAtBottom) {
      Keyboard.dismiss();
    }
  };
  
  // Set manual scrolling flag on touch, with debounce to detect intentional scrolls
  const handleScrollBeginDrag = () => {
    setIsManuallyScrolling(true);
    
    // Clear any existing timer
    if (scrollTimer.current) {
      clearTimeout(scrollTimer.current);
    }
    
    // Reset the flag after a delay
    scrollTimer.current = setTimeout(() => {
      setIsManuallyScrolling(false);
    }, 1000);
  };

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
  
  // Setup keyboard event listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setIsKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
        
        if (isAtBottom) {
          // Small delay to ensure layout has updated
          setTimeout(() => scrollToBottom(), 100);
        }
      }
    );
    
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
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
        keyboardVerticalOffset={Platform.OS === "ios" ? 
          // Get screen dimensions to determine if it's a newer or older iPhone
          require('react-native').Dimensions.get('window').height >= 812 ? 0 : 24
        : 0}
      >
        <ThemedView style={styles.container}>
        {/* Chat Messages */}
        <View 
          style={styles.flatListContainer}
        >
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
            onScroll={handleScroll}
            onScrollBeginDrag={handleScrollBeginDrag}
            scrollEventThrottle={200}
          />
        </View>
        
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
              size={24}
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
  flatListContainer: {
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
    width: 38,
    height: 38,
    borderRadius: 19,
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
