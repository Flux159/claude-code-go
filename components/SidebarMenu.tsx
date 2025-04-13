import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { IconSymbol } from "./ui/IconSymbol";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useAppContext, Chat } from "@/contexts/AppContext";
import { Constants } from "@/constants/Constants";

interface FileItem {
  name: string;
  type: "directory" | "file";
  path: string;
}

interface SidebarMenuProps {
  isVisible: boolean;
  onClose: () => void;
}

type MenuTab = "files" | "chats";

export function SidebarMenu({ isVisible, onClose }: SidebarMenuProps) {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(-300)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [localVisible, setLocalVisible] = useState(isVisible);
  const [activeTab, setActiveTab] = useState<MenuTab>("files");

  // FileTree props
  const { hostname, currentDirectory, setCurrentDirectory } = useAppContext();
  const PYTHON_PORT = Constants.serverPort;
  const [directoryContents, setDirectoryContents] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialDirectory, setInitialDirectory] = useState("");

  // ChatHistory props
  const {
    chats,
    currentChatId,
    switchChat,
    clearMessages,
    setChatHistoryVisible,
    setChats,
  } = useAppContext();

  // Get theme-aware colors
  const backgroundColor = useThemeColor({}, "background");
  const borderColor = useThemeColor({}, "icon");
  const textColor = useThemeColor({}, "text");
  const tintColor = Colors[colorScheme ?? "light"].tint;

  useEffect(() => {
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

      // If we're on the files tab and have a current directory, load its contents
      if (activeTab === "files" && currentDirectory) {
        console.log(`Using saved directory: ${currentDirectory}`);
        loadDirectory(currentDirectory);
      } else if (activeTab === "files") {
        // Otherwise fetch the initial directory
        console.log("No current directory, fetching from server");
        fetchInitialDirectory();
      }
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
  }, [isVisible, currentDirectory, hostname, PYTHON_PORT, activeTab]);

  // Change tab effect
  useEffect(() => {
    if (activeTab === "files" && isVisible && currentDirectory) {
      loadDirectory(currentDirectory);
    }
  }, [activeTab]);

  // File tree methods
  const fetchInitialDirectory = async () => {
    try {
      console.log(
        `Fetching initial directory from: http://${hostname}:${PYTHON_PORT}/directories`
      );
      setIsLoading(true);
      setError("");
      setDirectoryContents([]); // Clear current contents

      // Get auth token from AsyncStorage
      const token = await AsyncStorage.getItem('auth_token');

      const response = await fetch(
        `http://${hostname}:${PYTHON_PORT}/directories`,
        {
          headers: {
            "Authorization": token ? `Bearer: ${token}` : "",
          }
        }
      );
      const data = await response.json();

      if (response.ok) {
        console.log(`Received directory from server: ${data.directory}`);
        // Save the initial directory
        setInitialDirectory(data.directory);
        // Update the current directory in the app context
        setCurrentDirectory(data.directory);
        // Load the contents of this directory
        await loadDirectory(data.directory);
      } else {
        console.error(`Server error: ${data.error || "Unknown error"}`);
        setError(data.error || "Failed to fetch initial directory");
      }
    } catch (error) {
      console.error("Error fetching directory:", error);
      setError(
        "Error loading initial directory: " +
        (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadDirectory = async (directoryPath: string) => {
    try {
      console.log(`Loading contents of directory: ${directoryPath}`);
      setIsLoading(true);
      setError("");

      // Get auth token from AsyncStorage
      const token = await AsyncStorage.getItem('auth_token');

      const response = await fetch(
        `http://${hostname}:${PYTHON_PORT}/directories`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer: ${token}` : "",
          },
          body: JSON.stringify({ directory: directoryPath }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        console.log(
          `Loaded ${data.contents?.length || 0} items from ${directoryPath}`
        );
        setDirectoryContents(data.contents || []);
      } else {
        console.error(
          `Error loading directory: ${data.error || "Unknown error"}`
        );
        setError(data.error || "Failed to load directory contents");
      }
    } catch (error) {
      console.error("Error in loadDirectory:", error);
      setError(
        "Error loading directory: " +
        (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileItemPress = (item: FileItem) => {
    if (item.type === "directory") {
      setCurrentDirectory(item.path);
    }
  };

  const getParentDirectory = (directory: string) => {
    const parts = directory.split("/");
    parts.pop(); // Remove the last part
    return parts.join("/") || "/";
  };

  const navigateToParent = () => {
    if (currentDirectory && currentDirectory !== "/") {
      const parentDir = getParentDirectory(currentDirectory);
      setCurrentDirectory(parentDir);
    }
  };

  // Chat history methods
  const handleChatSelect = (chatId: string) => {
    switchChat(chatId);
    onClose();
  };

  // Format the chat time
  const formatChatTime = (timestamp: Date | string) => {
    if (!timestamp) return "";
    try {
      // Make sure we have a Date object
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return "";
      }

      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting chat time:", error);
      return "";
    }
  };

  // Format the chat date
  const formatChatDate = (timestamp: Date | string) => {
    if (!timestamp) return "Unknown Date";
    try {
      // Make sure we have a Date object
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return "Unknown Date";
      }

      return date.toLocaleDateString();
    } catch (error) {
      console.error("Error formatting chat date:", error);
      return "Unknown Date";
    }
  };

  // Get first message content
  const getFirstUserMessage = (chat: Chat) => {
    if (!chat || !chat.messages || !Array.isArray(chat.messages)) {
      return "New conversation";
    }

    const userMessage = chat.messages.find((msg) => msg && msg.role === "user");
    if (!userMessage || !userMessage.content) return "New conversation";

    const textContent = userMessage.content.find(
      (content) => content && content.type === "text"
    );
    if (!textContent || !textContent.text) return "No content";

    return textContent.text.length > 50
      ? textContent.text.substring(0, 50) + "..."
      : textContent.text;
  };

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

  const clearAllChatsExceptCurrent = () => {
    const currentChat = chats.find(
      (chat) => chat.id === currentChatId
    );
    if (currentChat) {
      // Keep only the current chat
      const updatedChats = [currentChat];

      // Update local state first for immediate UI update
      const updatedChatsWithTimeFixing = updatedChats.map(
        (chat) => ({
          ...chat,
          timestamp:
            chat.timestamp instanceof Date
              ? chat.timestamp
              : new Date(chat.timestamp),
          messages: Array.isArray(chat.messages)
            ? chat.messages.map((msg) => ({
              ...msg,
              timestamp:
                msg.timestamp instanceof Date
                  ? msg.timestamp
                  : new Date(msg.timestamp),
            }))
            : [],
        })
      );

      // This is a workaround since we don't have direct access to setChats
      // Instead of just closing, we'll reload the page to force a refresh
      AsyncStorage.setItem(
        "app_chats",
        JSON.stringify(updatedChats)
      )
        .then(() => {
          // On web we can do a refresh, on mobile we'll just close the dialog
          if (Platform.OS === "web") {
            window.location.reload();
          } else {
            setChats(updatedChatsWithTimeFixing);
            onClose();
          }
        })
        .catch((error) =>
          console.error("Failed to save chats:", error)
        );
    }
  };

  if (!localVisible) return null;

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
            {activeTab === "files" ? "Project Files" : "Chat History"}
          </ThemedText>

          <View style={styles.headerButtons}>
            {activeTab === "chats" && (
              <>
                <TouchableOpacity
                  onPress={() => {
                    clearMessages();
                    onClose();
                  }}
                  style={styles.actionButton}
                >
                  <IconSymbol name="plus.square" size={20} color={tintColor} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    if (Platform.OS === "web") {
                      if (confirm("Clear all chat history except current chat?")) {
                        clearAllChatsExceptCurrent();
                      }
                    } else {
                      Alert.alert(
                        "Clear Chat History",
                        "Are you sure you want to clear all chat history except the current chat?",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Clear",
                            style: "destructive",
                            onPress: clearAllChatsExceptCurrent,
                          },
                        ]
                      );
                    }
                  }}
                  style={styles.actionButton}
                >
                  <IconSymbol name="trash" size={20} color={tintColor} />
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={20} color={tintColor} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Segmented control for tab switching */}
        <View style={styles.tabControl}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "files" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("files")}
          >
            <IconSymbol
              name="folder"
              size={16}
              color={activeTab === "files" ? tintColor : textColor}
            />
            <ThemedText
              style={[
                styles.tabText,
                activeTab === "files" && styles.activeTabText,
              ]}
            >
              Files
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "chats" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("chats")}
          >
            <IconSymbol
              name="text.bubble"
              size={16}
              color={activeTab === "chats" ? tintColor : textColor}
            />
            <ThemedText
              style={[
                styles.tabText,
                activeTab === "chats" && styles.activeTabText,
              ]}
            >
              Chats
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* File Tree Content */}
        {activeTab === "files" && (
          <>
            {/* Current path display */}
            <View style={styles.pathDisplay}>
              <View style={styles.pathRow}>
                <ThemedText
                  numberOfLines={1}
                  ellipsizeMode="head"
                  style={styles.pathText}
                >
                  {currentDirectory}
                </ThemedText>
                <TouchableOpacity
                  onPress={fetchInitialDirectory}
                  style={[styles.resetButton, !currentDirectory || (initialDirectory && currentDirectory === initialDirectory) ? styles.disabledButton : null]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  disabled={!currentDirectory || (initialDirectory && currentDirectory === initialDirectory) ? true : false}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <IconSymbol
                      name="house"
                      size={16}
                      color={!currentDirectory || (initialDirectory && currentDirectory === initialDirectory) ? "rgba(120,120,120,0.3)" : tintColor}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {isLoading ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={tintColor} />
                <ThemedText style={styles.loaderText}>Loading...</ThemedText>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() =>
                    currentDirectory
                      ? loadDirectory(currentDirectory)
                      : fetchInitialDirectory()
                  }
                >
                  <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={styles.fileList}>
                {/* Parent directory */}
                {currentDirectory !== "/" && (
                  <TouchableOpacity
                    style={styles.fileItem}
                    onPress={navigateToParent}
                  >
                    <IconSymbol name="arrow.up" size={16} color={tintColor} />
                    <ThemedText style={styles.fileName}>
                      Parent Directory
                    </ThemedText>
                  </TouchableOpacity>
                )}

                {/* Directories first */}
                {directoryContents
                  .filter(
                    (item) =>
                      item.type === "directory" && !item.name.startsWith(".")
                  )
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((item, index) => (
                    <TouchableOpacity
                      key={item.path + index}
                      style={styles.fileItem}
                      onPress={() => handleFileItemPress(item)}
                    >
                      <IconSymbol name="folder" size={16} color={tintColor} />
                      <ThemedText
                        style={styles.fileName}
                        numberOfLines={1}
                        ellipsizeMode="middle"
                      >
                        {item.name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}

                {/* Then files */}
                {directoryContents
                  .filter(
                    (item) => item.type === "file" && !item.name.startsWith(".")
                  )
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((item, index) => (
                    <View
                      key={item.path + index}
                      style={styles.fileItem}
                    >
                      <IconSymbol name="doc.text" size={16} color={tintColor} style={{ opacity: 0.3 }} />
                      <ThemedText
                        style={[styles.fileName, styles.dimmedText]}
                        numberOfLines={1}
                        ellipsizeMode="middle"
                      >
                        {item.name}
                      </ThemedText>
                    </View>
                  ))}

                {directoryContents.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <ThemedText style={styles.emptyText}>
                      Empty directory
                    </ThemedText>
                  </View>
                )}
              </ScrollView>
            )}
          </>
        )}

        {/* Chat History Content */}
        {activeTab === "chats" && (
          <ScrollView style={styles.chatList}>
            {sortedDates.map((date) => (
              <View key={date}>
                <ThemedText style={styles.dateHeader}>{date}</ThemedText>
                {chatsByDate[date]
                  .sort((a, b) => {
                    // Safe timestamp comparison
                    const timeA = a.timestamp
                      ? new Date(a.timestamp).getTime()
                      : 0;
                    const timeB = b.timestamp
                      ? new Date(b.timestamp).getTime()
                      : 0;
                    return timeB - timeA;
                  })
                  .map((chat) => (
                    <TouchableOpacity
                      key={chat.id}
                      style={[
                        styles.chatItem,
                        chat.id === currentChatId && styles.activeChatItem,
                      ]}
                      onPress={() => handleChatSelect(chat.id)}
                    >
                      <View style={styles.chatItemContent}>
                        <ThemedText
                          style={[
                            styles.chatPreview,
                            chat.id === currentChatId && styles.activeChatText,
                          ]}
                          numberOfLines={2}
                        >
                          {getFirstUserMessage(chat)}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.chatTime,
                            chat.id === currentChatId && styles.activeChatText,
                          ]}
                        >
                          {formatChatTime(chat.timestamp)}
                        </ThemedText>
                      </View>
                      {chat.id === currentChatId && (
                        <IconSymbol
                          name="checkmark"
                          size={16}
                          color={tintColor}
                        />
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
        )}
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
    flexDirection: "row",
    alignItems: "center",
  },
  closeButton: {
    padding: 8,
  },
  actionButton: {
    padding: 8,
    marginRight: 8,
  },
  tabControl: {
    flexDirection: "row",
    padding: 8,
    marginBottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    justifyContent: "center",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    borderRadius: 4,
  },
  activeTabButton: {
    backgroundColor: "rgba(0, 125, 255, 0.1)",
  },
  tabText: {
    marginLeft: 4,
  },
  activeTabText: {
    fontWeight: "bold",
  },
  pathDisplay: {
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.03)",
  },
  pathRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pathText: {
    flex: 1,
    fontSize: 13,
  },
  resetButton: {
    padding: 6,
    paddingHorizontal: 8,
    marginLeft: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.3,
  },
  dimmedText: {
    opacity: 0.3,
  },
  // File tree styles
  fileList: {
    flex: 1,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 0,
    marginVertical: 2,
  },
  fileName: {
    marginLeft: 8,
    flex: 1,
  },
  // Chat history styles
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
    marginTop: 0,
  },
  chatPreview: {
    fontSize: 14,
    marginBottom: 4,
  },
  activeChatText: {
    fontWeight: "500",
  },
  // Shared styles
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#999",
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#FF6B6B",
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryButtonText: {
    color: "white",
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
