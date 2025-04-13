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
    setMessages((prevMessages) => [...prevMessages, newMessage]);
  };

  const clearMessages = () => {
    const newChatMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      role: "system",
      content: [{ type: "text", text: "New conversation started." }],
      timestamp: new Date(),
    };
    setMessages([newChatMessage]);
  };

  // Helper function to create a fetch with retry functionality
  const fetchWithRetry = async (
    url: string,
    options: RequestInit = {},
    maxRetries = 2,
    timeout = 2000
  ) => {
    let retries = 0;

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

  // Poll for errors, but less frequently and with better error handling
  useEffect(() => {
    // If error monitoring is disabled, clear any existing errors
    if (!isErrorMonitoringEnabled) {
      clearPendingErrors().catch(console.error);
      return;
    }

    // Initial check on load
    updatePendingErrorCount();

    // Use a less frequent interval to reduce server load and network traffic
    const INTERVAL_MS = 300000; // 5 min == 300 seconds
    const intervalId = setInterval(updatePendingErrorCount, INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [hostname, isErrorMonitoringEnabled]);

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
  };

  // Show a loading screen or return null while loading
  if (isLoading) {
    return null;
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
