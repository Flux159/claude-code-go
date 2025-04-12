import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface MessageContent {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: any;
  content?: string;
  tool_use_id?: string;
}

interface Message {
  id: string;
  type?: string;
  role: 'user' | 'assistant' | 'system';
  model?: string;
  content: MessageContent[];
  timestamp: Date;
}

interface AppContextType {
  hostname: string;
  setHostname: (hostname: string) => void;
  port: number;
  setPort: (port: number) => void;
  messages: Message[];
  addMessage: (content: string | MessageContent[], role: 'user' | 'assistant' | 'system') => void;
  clearMessages: () => void;
  isResponseLoading: boolean;
  setIsResponseLoading: (isLoading: boolean) => void;
  settingsVisible: boolean;
  setSettingsVisible: (visible: boolean) => void;
  isTogglingCollapsible: boolean;
  setIsTogglingCollapsible: (isToggling: boolean) => void;
}

const defaultContext: AppContextType = {
  hostname: '',
  setHostname: () => { },
  port: 3000,
  setPort: () => { },
  messages: [],
  addMessage: () => { },
  clearMessages: () => { },
  isResponseLoading: false,
  setIsResponseLoading: () => { },
  settingsVisible: false,
  setSettingsVisible: () => { },
  isTogglingCollapsible: false,
  setIsTogglingCollapsible: () => { },
};

const AppContext = createContext<AppContextType>(defaultContext);

export function useAppContext() {
  return useContext(AppContext);
}

interface AppProviderProps {
  children: ReactNode;
}

const HOSTNAME_STORAGE_KEY = 'app_hostname';
const PORT_STORAGE_KEY = 'app_port';

export function AppProvider({ children }: AppProviderProps) {
  const [hostname, setHostname] = useState('suyogs-macbook-pro.local');
  const [port, setPort] = useState(3000);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResponseLoading, setIsResponseLoading] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [isTogglingCollapsible, setIsTogglingCollapsible] = useState(false);

  // Load saved hostname and port when app starts
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
      } catch (error) {
        console.error('Failed to load settings:', error);
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
      console.error('Failed to save hostname:', error);
    }
  };

  const updatePort = async (newPort: number) => {
    try {
      await AsyncStorage.setItem(PORT_STORAGE_KEY, newPort.toString());
      setPort(newPort);
    } catch (error) {
      console.error('Failed to save port:', error);
    }
  };

  const addMessage = (content: string | MessageContent[], role: 'user' | 'assistant' | 'system') => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      role,
      content: typeof content === 'string'
        ? [{ type: 'text', text: content }]
        : content,
      timestamp: new Date()
    };
    setMessages((prevMessages) => [...prevMessages, newMessage]);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const value = {
    hostname,
    setHostname: updateHostname,
    port,
    setPort: updatePort,
    messages,
    addMessage,
    clearMessages,
    isResponseLoading,
    setIsResponseLoading,
    settingsVisible,
    setSettingsVisible,
    isTogglingCollapsible,
    setIsTogglingCollapsible,
  };

  // Show a loading screen or return null while loading
  if (isLoading) {
    return null;
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
