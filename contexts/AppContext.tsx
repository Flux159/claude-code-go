import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Constants } from "@/constants/Constants";

export interface MessageContent {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: any;
  content?: any;
  tool_use_id?: string;
}

export interface Message {
  id: string;
  type?: string;
  role: "user" | "assistant" | "system";
  model?: string;
  content: MessageContent[];
  timestamp: Date;
}

export interface Chat {
  id: string;
  name: string;
  messages: Message[];
  timestamp: Date;
}

export type ThemePreference = "light" | "dark" | "auto";

interface AppContextType {
  hostname: string;
  setHostname: (hostname: string) => void;
  port: number;
  setPort: (port: number) => void;
  webCommand: string;
  setWebCommand: (command: string) => void;
  messages: Message[];
  addMessage: (
    content: string | MessageContent[],
    role: "user" | "assistant" | "system"
  ) => void;
  clearMessages: () => void;
  isResponseLoading: boolean;
  setIsResponseLoading: (isLoading: boolean) => void;
  settingsVisible: boolean;
  setSettingsVisible: (visible: boolean) => void;
  isTogglingCollapsible: boolean;
  setIsTogglingCollapsible: (isToggling: boolean) => void;
  pendingErrorCount: number;
  setPendingErrorCount?: (count: number) => void;
  updatePendingErrorCount: () => Promise<number>;
  clearPendingErrors: () => Promise<void>;
  isErrorMonitoringEnabled: boolean;
  themePreference: ThemePreference;
  setThemePreference: (theme: ThemePreference) => void;
  currentDirectory: string;
  setCurrentDirectory: (directory: string) => void;
  chats: Chat[];
  setChats: (chats: Chat[]) => void;
  currentChatId: string;
  switchChat: (chatId: string) => void;
  chatHistoryVisible: boolean;
  setChatHistoryVisible: (visible: boolean) => void;
}

const defaultContext: AppContextType = {
  hostname: "",
  setHostname: () => {},
  port: 3000,
  setPort: () => {},
  webCommand: "npm run dev",
  setWebCommand: () => {},
  messages: [],
  addMessage: () => {},
  clearMessages: () => {},
  isResponseLoading: false,
  setIsResponseLoading: () => {},
  settingsVisible: false,
  setSettingsVisible: () => {},
  isTogglingCollapsible: false,
  setIsTogglingCollapsible: () => {},
  pendingErrorCount: 0,
  setPendingErrorCount: () => {},
  updatePendingErrorCount: async () => 0,
  clearPendingErrors: async () => {},
  isErrorMonitoringEnabled: true,
  themePreference: "auto",
  setThemePreference: () => {},
  currentDirectory: "",
  setCurrentDirectory: () => {},
  chats: [],
  setChats: () => {},
  currentChatId: "",
  switchChat: () => {},
  chatHistoryVisible: false,
  setChatHistoryVisible: () => {},
};

const AppContext = createContext<AppContextType>(defaultContext);

export function useAppContext() {
  return useContext(AppContext);
}

interface AppProviderProps {
  children: ReactNode;
}

const HOSTNAME_STORAGE_KEY = "app_hostname";
const PORT_STORAGE_KEY = "app_port";
const THEME_PREFERENCE_KEY = "app_theme_preference";
const CURRENT_DIRECTORY_STORAGE_KEY = "app_current_directory";
const WEB_COMMAND_STORAGE_KEY = "app_web_command";
const CHATS_STORAGE_KEY = "app_chats";
const CURRENT_CHAT_ID_STORAGE_KEY = "app_current_chat_id";

export function AppProvider({ children }: AppProviderProps) {
  const [hostname, setHostname] = useState("suyogs-macbook-pro.local");
  const [port, setPort] = useState(3000);
  const [webCommand, setWebCommandState] = useState("npm run dev");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResponseLoading, setIsResponseLoading] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [isTogglingCollapsible, setIsTogglingCollapsible] = useState(false);
  const [pendingErrorCount, setPendingErrorCount] = useState(0);
  const [themePreference, setThemePreferenceState] =
    useState<ThemePreference>("auto");
  const [currentDirectory, setCurrentDirectoryState] = useState("");

  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState("");
  const [chatHistoryVisible, setChatHistoryVisible] = useState(false);

  // Determine if error monitoring should be enabled
  const isUsingDefaultCommand = webCommand.trim() === "npm run dev";
  const isInDefaultDirectory =
    currentDirectory.endsWith("claude-next-app") || currentDirectory === "";
  const isErrorMonitoringEnabled =
    isUsingDefaultCommand && isInDefaultDirectory;

  // Load saved settings when app starts
  useEffect(() => {
    const loadSavedSettings = async () => {
      try {
        const savedHostname = await AsyncStorage.getItem(HOSTNAME_STORAGE_KEY);
        if (savedHostname) {
          setHostname(savedHostname);
        }

        const savedPort = await AsyncStorage.getItem(PORT_STORAGE_KEY);
        if (savedPort) {
          setPort(parseInt(savedPort, 10));
        }

        const savedWebCommand = await AsyncStorage.getItem(
          WEB_COMMAND_STORAGE_KEY
        );
        if (savedWebCommand) {
          setWebCommandState(savedWebCommand);
        }

        const savedTheme = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
        if (
          savedTheme &&
          (savedTheme === "light" ||
            savedTheme === "dark" ||
            savedTheme === "auto")
        ) {
          setThemePreferenceState(savedTheme as ThemePreference);
        }

        const savedDirectory = await AsyncStorage.getItem(
          CURRENT_DIRECTORY_STORAGE_KEY
        );
        if (savedDirectory) {
          setCurrentDirectoryState(savedDirectory);
        }

        // Load saved chats
        const savedChats = await AsyncStorage.getItem(CHATS_STORAGE_KEY);
        console.log("saved chats from storage");
        console.log(savedChats);
        if (savedChats) {
          // Parse chats and convert string dates back to Date objects
          const parsedChats: Chat[] = JSON.parse(savedChats);

          // Fix timestamp objects (JSON.parse converts dates to strings)
          const fixedChats = parsedChats.map((chat) => ({
            ...chat,
            timestamp: new Date(chat.timestamp),
            messages: chat.messages.map((msg) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })),
          }));

          setChats(fixedChats);
        }

        // Load current chat ID
        const savedCurrentChatId = await AsyncStorage.getItem(
          CURRENT_CHAT_ID_STORAGE_KEY
        );
        if (savedCurrentChatId) {
          setCurrentChatId(savedCurrentChatId);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedSettings();
  }, []);

  // Custom setters that also save to AsyncStorage
  const updateHostname = async (newHostname: string) => {
    try {
      await AsyncStorage.setItem(HOSTNAME_STORAGE_KEY, newHostname);
      setHostname(newHostname);
    } catch (error) {
      console.error("Failed to save hostname:", error);
    }
  };

  const updatePort = async (newPort: number) => {
    try {
      await AsyncStorage.setItem(PORT_STORAGE_KEY, newPort.toString());
      setPort(newPort);
    } catch (error) {
      console.error("Failed to save port:", error);
    }
  };

  const setCurrentDirectory = async (newDirectory: string) => {
    try {
      await AsyncStorage.setItem(CURRENT_DIRECTORY_STORAGE_KEY, newDirectory);
      setCurrentDirectoryState(newDirectory);
    } catch (error) {
      console.error("Failed to save current directory:", error);
    }
  };

  const setWebCommand = async (newCommand: string) => {
    try {
      await AsyncStorage.setItem(WEB_COMMAND_STORAGE_KEY, newCommand);
      setWebCommandState(newCommand);
    } catch (error) {
      console.error("Failed to save web command:", error);
    }
  };

  const saveChatsToStorage = async (updatedChats: Chat[]) => {
    try {
      await AsyncStorage.setItem(
        CHATS_STORAGE_KEY,
        JSON.stringify(updatedChats)
      );
    } catch (error) {
      console.error("Failed to save chats:", error);
    }
  };

  const saveCurrentChatIdToStorage = async (chatId: string) => {
    try {
      await AsyncStorage.setItem(CURRENT_CHAT_ID_STORAGE_KEY, chatId);
    } catch (error) {
      console.error("Failed to save current chat ID:", error);
    }
  };

  // Get current chat from chats array
  const getCurrentChat = () => {
    if (!currentChatId || chats.length === 0) return null;
    return chats.find((chat) => chat.id === currentChatId);
  };

  // Create a formatted date string for chat names
  const getFormattedDate = () => {
    const now = new Date();
    return `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
  };

  // Create a new chat and set it as current
  const createNewChat = () => {
    const now = new Date();
    const chatId = `chat-${now.getTime()}`;
    const chatName = `Chat ${getFormattedDate()}`;

    // First, save any existing conversation if we have one
    if (currentChatId && messages.length > 0) {
      try {
        const currentChatIndex = chats.findIndex(
          (c) => c && c.id === currentChatId
        );

        if (currentChatIndex >= 0) {
          // Important: Save complete current messages to the current chat before creating a new one
          console.log(
            `Saving ${messages.length} messages to chat ${currentChatId} before creating new chat`
          );
          
          const updatedChats = [...chats];
          updatedChats[currentChatIndex] = {
            ...updatedChats[currentChatIndex],
            messages: [...messages], // Save the complete messages array
          };

          // Update both state and storage to ensure consistency
          setChats(updatedChats);
          saveChatsToStorage(updatedChats);
        }
      } catch (error) {
        console.error(
          "Error saving current chat before creating new one:",
          error
        );
      }
    }

    const initialMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      role: "system",
      content: [{ type: "text", text: "New conversation started." }],
      timestamp: now,
    };

    const newChat: Chat = {
      id: chatId,
      name: chatName,
      messages: [initialMessage],
      timestamp: now,
    };

    // Update the messages state immediately for UI responsiveness
    setMessages([initialMessage]);

    // Add the new chat to the chats array (safely)
    const existingChats = Array.isArray(chats) ? chats : [];
    const updatedChats = [...existingChats, newChat];
    setChats(updatedChats);
    setCurrentChatId(chatId);

    // Save to AsyncStorage
    saveChatsToStorage(updatedChats);
    saveCurrentChatIdToStorage(chatId);

    console.log(`Created new chat ${chatId}`);
    return chatId;
  };

  // Switch to an existing chat
  const switchChat = (chatId: string) => {
    try {
      // Don't switch if it's the same chat
      if (chatId === currentChatId) {
        console.log(`Already on chat ${chatId}, not switching`);
        setChatHistoryVisible(false);
        return;
      }

      // First, ensure current chat's messages are saved correctly before switching
      if (currentChatId && messages.length > 0) {
        // Find the current chat in the array
        const currentChatIndex = chats.findIndex(
          (c) => c && c.id === currentChatId
        );

        if (currentChatIndex >= 0) {
          // Important: Always save the complete current messages state
          // This ensures we don't lose any messages with tool calls
          console.log(
            `Saving ${messages.length} messages to chat ${currentChatId} before switching`
          );
          
          const updatedChats = [...chats];
          const currentChat = { ...updatedChats[currentChatIndex] };
          
          // Always update with complete messages array to ensure we don't lose any messages
          currentChat.messages = [...messages];
          updatedChats[currentChatIndex] = currentChat;
          setChats(updatedChats);
          saveChatsToStorage(updatedChats);
        }
      }

      // Find the chat with the given ID
      const chat = chats.find((c) => c && c.id === chatId);

      if (chat) {
        // Ensure messages is an array
        const chatMessages = Array.isArray(chat.messages) ? chat.messages : [];

        // Update UI immediately for responsiveness
        setMessages(chatMessages);
        setCurrentChatId(chatId);

        // Save to AsyncStorage
        saveCurrentChatIdToStorage(chatId);

        // Close the chat history drawer
        setChatHistoryVisible(false);

        console.log(
          `Switched to chat ${chatId} with ${chatMessages.length} messages`
        );
      } else {
        console.error(`Chat with ID ${chatId} not found`);
      }
    } catch (error) {
      console.error("Error switching chat:", error);
    }
  };

  // Initial setup - create a default chat if none exists
  useEffect(() => {
    // Only run this effect after the app has fully loaded and only if messages array is empty
    // This prevents overwriting current UI messages during normal operation
    if (isLoading || messages.length > 0) return;

    console.log(
      "Chat initialization - messages array is empty, loading from chat history"
    );

    try {
      // Check if we have valid chats data
      const validChats =
        Array.isArray(chats) &&
        chats.length > 0 &&
        chats.every((chat) => chat && typeof chat === "object");

      if (!validChats) {
        console.log("No valid chats found, creating first chat");
        createNewChat();
        return;
      }

      // If we have chats but no current chat ID selected
      if (!currentChatId) {
        console.log(
          "No current chat ID but we have chats, selecting most recent"
        );
        // Try to sort the chats by timestamp (newest first)
        try {
          const validChatsArray = chats.filter(
            (chat) => chat && typeof chat === "object"
          );
          const sortedChats = [...validChatsArray].sort((a, b) => {
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeB - timeA;
          });

          const mostRecentChat = sortedChats[0];

          if (mostRecentChat && mostRecentChat.id) {
            console.log("Selected most recent chat:", mostRecentChat.id);
            setCurrentChatId(mostRecentChat.id);
            if (messages.length === 0) {
              // Only set messages if array is empty
              setMessages(
                Array.isArray(mostRecentChat.messages)
                  ? mostRecentChat.messages
                  : []
              );
            }
            saveCurrentChatIdToStorage(mostRecentChat.id);
          } else {
            // Fallback to first chat if sorting fails
            console.log("Sorting failed, using first chat");
            const firstValidChat = validChatsArray[0];
            setCurrentChatId(firstValidChat.id);
            if (messages.length === 0) {
              // Only set messages if array is empty
              setMessages(
                Array.isArray(firstValidChat.messages)
                  ? firstValidChat.messages
                  : []
              );
            }
            saveCurrentChatIdToStorage(firstValidChat.id);
          }
        } catch (error) {
          console.error("Error selecting chat:", error);
          createNewChat();
        }
      } else {
        // We have a current chat ID, try to load its messages
        console.log("Using current chat ID:", currentChatId);
        const currentChat = chats.find(
          (chat) => chat && chat.id === currentChatId
        );

        if (currentChat && Array.isArray(currentChat.messages)) {
          console.log(
            "Found current chat with",
            currentChat.messages.length,
            "messages"
          );
          if (messages.length === 0) {
            // Only set messages if array is empty
            setMessages(currentChat.messages);
          }
        } else if (chats.length > 0) {
          // Current chat not found or invalid, use first chat
          console.log("Current chat not found, using first chat");
          const firstValidChat = chats.find(
            (chat) => chat && typeof chat === "object"
          );

          if (firstValidChat) {
            setCurrentChatId(firstValidChat.id);
            if (messages.length === 0) {
              // Only set messages if array is empty
              setMessages(
                Array.isArray(firstValidChat.messages)
                  ? firstValidChat.messages
                  : []
              );
            }
            saveCurrentChatIdToStorage(firstValidChat.id);
          } else {
            createNewChat();
          }
        } else {
          createNewChat();
        }
      }
    } catch (error) {
      console.error("Error in chat initialization useEffect:", error);
      if (messages.length === 0) {
        // Only create new chat if messages array is empty
        createNewChat();
      }
    }
  }, [chats, currentChatId, isLoading, messages.length]);

  // Add message to current chat
  const addMessage = (
    content: string | MessageContent[],
    role: "user" | "assistant" | "system"
  ) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      role,
      content:
        typeof content === "string"
          ? [{ type: "text", text: content }]
          : content,
      timestamp: new Date(),
    };

    console.log(`Adding message - role: ${role}, type: ${typeof content}`);

    // First, immediately update the local messages for UI responsiveness
    // This ensures the message shows immediately in the chat
    setMessages((prevMessages) => {
      const updatedMessages = [...prevMessages, newMessage];
      
      // Store updated messages in the current chat
      try {
        if (currentChatId && chats && chats.length > 0) {
          const currentChatIndex = chats.findIndex(
            (chat) => chat && chat.id === currentChatId
          );
          
          if (currentChatIndex >= 0) {
            const updatedChats = [...chats];
            const currentChat = { ...updatedChats[currentChatIndex] };
            
            // Important: Update with the complete messages array including the new message
            currentChat.messages = updatedMessages;
            updatedChats[currentChatIndex] = currentChat;
            
            // Update state and storage
            setChats(updatedChats);
            saveChatsToStorage(updatedChats);
            console.log(
              `Updated chat ${currentChatId} with all messages, now has ${updatedMessages.length} messages`
            );
          }
        }
      } catch (error) {
        console.error("Error syncing updated messages to chat:", error);
      }
      
      return updatedMessages;
    });

    try {
      // Handle chat persistence
      if (!currentChatId || !chats || chats.length === 0) {
        // If there's no current chat, create one with this message
        const now = new Date();
        const chatId = `chat-${now.getTime()}`;
        const chatName = `Chat ${getFormattedDate()}`;

        const newChat: Chat = {
          id: chatId,
          name: chatName,
          messages: [newMessage],
          timestamp: now,
        };

        const updatedChats = [...(chats || []), newChat];
        setChats(updatedChats);
        setCurrentChatId(chatId);

        // Save to storage
        saveChatsToStorage(updatedChats);
        saveCurrentChatIdToStorage(chatId);
        console.log(`Created new chat ${chatId} with 1 message`);
        return;
      }

      // Find current chat and update it
      const currentChatIndex = chats.findIndex(
        (chat) => chat && chat.id === currentChatId
      );

      if (currentChatIndex >= 0) {
        // Make a copy of chats array to avoid direct state mutation
        const updatedChats = [...chats];
        const currentChat = { ...updatedChats[currentChatIndex] };

        // Ensure messages array exists
        if (!currentChat.messages) {
          currentChat.messages = [];
        }

        // Add the new message
        currentChat.messages = [...currentChat.messages, newMessage];
        updatedChats[currentChatIndex] = currentChat;

        // Update state and storage
        setChats(updatedChats);
        saveChatsToStorage(updatedChats);
        console.log(
          `Updated chat ${currentChatId} with new message, now has ${currentChat.messages.length} messages`
        );
      } else {
        // Current chat ID not found, create a new chat
        console.log(`Chat ID ${currentChatId} not found, creating new chat`);
        const now = new Date();
        const chatId = `chat-${now.getTime()}`;
        const chatName = `Chat ${getFormattedDate()}`;

        const newChat: Chat = {
          id: chatId,
          name: chatName,
          messages: [newMessage],
          timestamp: now,
        };

        const updatedChats = [...chats, newChat];
        setChats(updatedChats);
        setCurrentChatId(chatId);

        // Save to storage
        saveChatsToStorage(updatedChats);
        saveCurrentChatIdToStorage(chatId);
        console.log(`Created new chat ${chatId}`);
      }
    } catch (error) {
      console.error("Error saving message to chat history:", error);
    }
  };

  // Clear messages by creating a new chat
  const clearMessages = () => {
    createNewChat();
  };

  // Helper function to create a fetch with retry functionality
  const fetchWithRetry = async (
    url: string,
    options: RequestInit = {},
    maxRetries = 2,
    timeout = 2000
  ) => {
    let retries = 0;

    // Get auth token if needed
    const needsAuth = Constants.authEndpoints
      ? !Constants.authEndpoints.some((endpoint) => url.includes(endpoint))
      : true;

    if (needsAuth) {
      try {
        const token = await AsyncStorage.getItem("auth_token");
        if (token) {
          // Ensure headers object exists in options
          if (!options.headers) {
            options.headers = {};
          }

          // Add authorization header with token
          (options.headers as Record<string, string>)[
            "Authorization"
          ] = `Bearer: ${token}`;
        }
      } catch (error) {
        console.error("Error getting auth token:", error);
      }
    }

    while (retries <= maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return await response.json();
        } else if (response.status === 401) {
          // Token might be expired - attempt to refresh token or redirect to login
          console.warn("Authentication error - token may have expired");

          // Notify user about authentication issue
          const authErrorEvent = new CustomEvent("auth_error", {
            detail: {
              message: "Your session has expired. Please log in again.",
            },
          });
          document.dispatchEvent(authErrorEvent);

          throw new Error("Authentication failed");
        } else {
          console.warn(
            `Attempt ${retries + 1}/${maxRetries + 1} failed with status: ${
              response.status
            }`
          );
        }
      } catch (error) {
        console.warn(
          `Fetch attempt ${retries + 1}/${maxRetries + 1} failed:`,
          error
        );
      }

      // If we're going to retry, wait a bit (with exponential backoff)
      if (retries < maxRetries) {
        const delay = Math.pow(2, retries) * 500; // 500ms, 1000ms, etc.
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      retries++;
    }

    throw new Error("All fetch attempts failed");
  };

  // Function to check for pending errors from the server
  const updatePendingErrorCount = async (): Promise<number> => {
    try {
      // Use the serverPort from Constants rather than the port from context
      const serverPort = Constants.serverPort;

      // Use the hostname from context
      const serverHost = hostname;

      // Ensure we bypass any cache
      const timestamp = new Date().getTime();
      const url = `http://${serverHost}:${serverPort}/errors?_t=${timestamp}`;

      console.log(`Checking for errors at: ${url}`);

      // Use our fetchWithRetry implementation
      const data = await fetchWithRetry(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      const count = data.count || 0;

      if (count !== pendingErrorCount) {
        console.log(`Error count changed: ${pendingErrorCount} -> ${count}`);
        setPendingErrorCount(count);
      }

      return count;
    } catch (error) {
      console.error("Error checking for pending errors after retries:", error);
      return pendingErrorCount;
    }
  };

  // Function to manually clear errors from the server
  const clearPendingErrors = async (): Promise<void> => {
    try {
      // Update local state immediately for responsive UI
      setPendingErrorCount(0);

      const serverPort = Constants.serverPort;
      const serverHost = hostname;
      const url = `http://${serverHost}:${serverPort}/clear-errors`;

      console.log(`Clearing errors via: ${url}`);

      // Use a timeout to make sure we don't wait too long for the server
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 second timeout

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ action: "clear" }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          console.log("All errors cleared successfully on server");
        } else {
          console.warn("Server returned non-OK response when clearing errors");
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.warn("Error sending clear request to server:", fetchError);
        // Even if server clear fails, we've already updated local state
      }
    } catch (error) {
      console.error("Error in clearPendingErrors:", error);
      // If something goes wrong, ensure local state is still updated
      setPendingErrorCount(0);
    }
  };

  // Get the authentication status from localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication on load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem("auth_token");
        setIsAuthenticated(!!token);
      } catch (error) {
        console.error("Failed to check authentication status:", error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  // Poll for errors, but less frequently and with better error handling
  useEffect(() => {
    // Don't check for errors if not authenticated or if error monitoring is disabled
    if (!isAuthenticated || !isErrorMonitoringEnabled) {
      clearPendingErrors().catch(console.error);
      return;
    }

    // Initial check on load
    updatePendingErrorCount();

    // Use a less frequent interval to reduce server load and network traffic
    const INTERVAL_MS = 300000; // 5 min == 300 seconds
    const intervalId = setInterval(updatePendingErrorCount, INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [hostname, isErrorMonitoringEnabled, isAuthenticated]);

  // Custom setter for theme preference that also saves to AsyncStorage
  const updateThemePreference = async (newTheme: ThemePreference) => {
    try {
      await AsyncStorage.setItem(THEME_PREFERENCE_KEY, newTheme);
      setThemePreferenceState(newTheme);
    } catch (error) {
      console.error("Failed to save theme preference:", error);
    }
  };

  const value = {
    hostname,
    setHostname: updateHostname,
    port,
    setPort: updatePort,
    webCommand,
    setWebCommand,
    messages,
    addMessage,
    clearMessages,
    isResponseLoading,
    setIsResponseLoading,
    settingsVisible,
    setSettingsVisible,
    isTogglingCollapsible,
    setIsTogglingCollapsible,
    pendingErrorCount,
    setPendingErrorCount,
    updatePendingErrorCount,
    clearPendingErrors,
    isErrorMonitoringEnabled,
    themePreference,
    setThemePreference: updateThemePreference,
    currentDirectory,
    setCurrentDirectory,
    chats,
    setChats,
    currentChatId,
    switchChat,
    chatHistoryVisible,
    setChatHistoryVisible,
  };

  // Show a loading screen or return null while loading
  if (isLoading) {
    return null;
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
