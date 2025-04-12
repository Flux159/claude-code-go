import React, { createContext, ReactNode, useContext, useState } from 'react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface AppContextType {
  hostname: string;
  setHostname: (hostname: string) => void;
  messages: Message[];
  addMessage: (text: string, sender: 'user' | 'assistant') => void;
  clearMessages: () => void;
}

const defaultContext: AppContextType = {
  hostname: 'macbook.local',
  setHostname: () => {},
  messages: [],
  addMessage: () => {},
  clearMessages: () => {},
};

const AppContext = createContext<AppContextType>(defaultContext);

export function useAppContext() {
  return useContext(AppContext);
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [hostname, setHostname] = useState('macbook.local');
  const [messages, setMessages] = useState<Message[]>([]);

  const addMessage = (text: string, sender: 'user' | 'assistant') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, newMessage]);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const value = {
    hostname,
    setHostname,
    messages,
    addMessage,
    clearMessages,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
