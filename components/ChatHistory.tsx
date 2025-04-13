import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { IconSymbol } from "./ui/IconSymbol";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useAppContext, Chat } from "@/contexts/AppContext";

interface ChatHistoryProps {
  isVisible: boolean;
  onClose: () => void;
}

export function ChatHistory({ isVisible, onClose }: ChatHistoryProps) {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(-300)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [localVisible, setLocalVisible] = useState(isVisible);
  const { chats, currentChatId, switchChat, clearMessages } = useAppContext();

  // Get theme-aware colors
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = Colors[colorScheme ?? "light"].tint;

  // Handle visibility changes
  React.useEffect(() => {
    if (isVisible) {
      setLocalVisible(true);
      // Animate the drawer in
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate the drawer out
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -300,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setLocalVisible(false);
      });
    }
  }, [isVisible]);

  // Handle chat selection
  const handleChatSelect = (chatId: string) => {
    switchChat(chatId);
    onClose();
  };

  // Format the chat time
  const formatChatTime = (timestamp: Date | string) => {
    if (!timestamp) return '';
    try {
      // Make sure we have a Date object
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return '';
      }
      
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error formatting chat time:', error);
      return '';
    }
  };

  // Format the chat date
  const formatChatDate = (timestamp: Date | string) => {
    if (!timestamp) return 'Unknown Date';
    try {
      // Make sure we have a Date object
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'Unknown Date';
      }
      
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting chat date:', error);
      return 'Unknown Date';
    }
  };

  // Get first message content
  const getFirstUserMessage = (chat: Chat) => {
    if (!chat || !chat.messages || !Array.isArray(chat.messages)) {
      return "New conversation";
    }
    
    const userMessage = chat.messages.find(msg => msg && msg.role === 'user');
    if (!userMessage || !userMessage.content) return "New conversation";
    
    const textContent = userMessage.content.find(content => content && content.type === 'text');
    if (!textContent || !textContent.text) return "No content";
    
    return textContent.text.length > 50 
      ? textContent.text.substring(0, 50) + '...' 
      : textContent.text;
  };

  if (!localVisible) return null;

  // Group chats by date
  const chatsByDate = chats.reduce((acc, chat) => {
    if (!chat || !chat.timestamp) return acc;
    
    const date = formatChatDate(chat.timestamp);
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(chat);
    return acc;
  }, {} as Record<string, Chat[]>);

  // Sort dates in reverse chronological order
  const sortedDates = Object.keys(chatsByDate).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  return (
    <View style={styles.mainContainer}>
      {/* Background overlay - clickable to close drawer */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity }]} />
      </TouchableWithoutFeedback>

      {/* The actual drawer */}
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateX }],
            paddingTop: insets.top,
            backgroundColor,
          },
        ]}
      >
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Chat History
          </ThemedText>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={() => {
                clearMessages();
                onClose();
              }}
              style={styles.newButton}
            >
              <IconSymbol name="plus.square" size={20} color={tintColor} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="chevron.right" size={24} color={tintColor} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.chatList}>
          {sortedDates.map(date => (
            <View key={date}>
              <ThemedText style={styles.dateHeader}>{date}</ThemedText>
              {chatsByDate[date]
                .sort((a, b) => {
                  // Safe timestamp comparison
                  const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                  const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                  return timeB - timeA;
                })
                .map(chat => (
                  <TouchableOpacity
                    key={chat.id}
                    style={[
                      styles.chatItem,
                      chat.id === currentChatId && styles.activeChatItem
                    ]}
                    onPress={() => handleChatSelect(chat.id)}
                  >
                    <View style={styles.chatItemContent}>
                      <ThemedText 
                        style={[
                          styles.chatTime,
                          chat.id === currentChatId && styles.activeChatText
                        ]}
                      >
                        {formatChatTime(chat.timestamp)}
                      </ThemedText>
                      <ThemedText 
                        style={[
                          styles.chatPreview,
                          chat.id === currentChatId && styles.activeChatText
                        ]}
                        numberOfLines={2}
                      >
                        {getFirstUserMessage(chat)}
                      </ThemedText>
                    </View>
                    {chat.id === currentChatId && (
                      <IconSymbol name="checkmark" size={16} color={tintColor} />
                    )}
                  </TouchableOpacity>
                ))}
            </View>
          ))}

          {chats.length === 0 && (
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>
                No chat history yet
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    elevation: 5,
  },
  overlay: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
  },
  container: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  title: {
    fontSize: 18,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
  },
  newButton: {
    padding: 8,
    marginRight: 8,
  },
  chatList: {
    flex: 1,
  },
  dateHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: "bold",
    opacity: 0.7,
    backgroundColor: "rgba(0, 0, 0, 0.03)",
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  activeChatItem: {
    backgroundColor: "rgba(0, 125, 255, 0.1)",
  },
  chatItemContent: {
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  chatPreview: {
    fontSize: 14,
  },
  activeChatText: {
    fontWeight: "500",
  },
  emptyContainer: {
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    opacity: 0.5,
  },
});