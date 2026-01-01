// ============================================
// useChatMessages Hook
// Manages message state, localStorage persistence, CRUD operations
// Includes personalized welcome message support
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ChatMessage, ExtractedTopic } from '@/components/topic/chatbot/types';
import { getStorageKey } from '@/components/topic/chatbot/constants';
import { extractTopicsFromMessage } from '@/components/topic/chatbot/utils';
import { usePersonalizedWelcome, type PersonalizedWelcomeData } from './usePersonalizedWelcome';

interface UseChatMessagesOptions {
  brandTemplateId?: string;
  autoLoad?: boolean;
}

interface UseChatMessagesReturn {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  removeMessage: (id: string) => void;
  resetMessages: () => void;
  allExtractedTopics: ExtractedTopic[];
  animatingMessageId: string | null;
  setAnimatingMessageId: (id: string | null) => void;
  // Personalized welcome data
  personalizedWelcome: PersonalizedWelcomeData;
}

export function useChatMessages(options: UseChatMessagesOptions = {}): UseChatMessagesReturn {
  const { brandTemplateId, autoLoad = true } = options;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [animatingMessageId, setAnimatingMessageId] = useState<string | null>(null);
  
  // Get personalized welcome data
  const personalizedWelcome = usePersonalizedWelcome({ brandTemplateId });
  
  // Load messages from localStorage on mount
  useEffect(() => {
    if (!autoLoad) return;
    
    const storageKey = getStorageKey(brandTemplateId);
    const savedMessages = localStorage.getItem(storageKey);
    
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        // Restore Date objects
        const restored = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setMessages(restored);
      } catch (e) {
        console.error('Failed to parse saved messages:', e);
        initializeWithWelcome();
      }
    } else {
      initializeWithWelcome();
    }
  }, [brandTemplateId, autoLoad]);
  
  // Initialize with personalized welcome message
  // Content is rendered via PersonalizedWelcome component, so we just set a marker
  const initializeWithWelcome = useCallback(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: '__PERSONALIZED_WELCOME__', // Marker for PersonalizedWelcome component
      timestamp: new Date(),
    }]);
  }, []);
  
  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length === 0) return;
    
    const storageKey = getStorageKey(brandTemplateId);
    // Don't save if only welcome message
    if (messages.length === 1 && messages[0].id === 'welcome') return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save messages:', e);
    }
  }, [messages, brandTemplateId]);
  
  // Add a new message
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
    setAnimatingMessageId(message.id);
    setTimeout(() => setAnimatingMessageId(null), 500);
  }, []);
  
  // Update an existing message
  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(m => 
      m.id === id ? { ...m, ...updates } : m
    ));
  }, []);
  
  // Remove a message
  const removeMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);
  
  // Reset to welcome message
  const resetMessages = useCallback(() => {
    const storageKey = getStorageKey(brandTemplateId);
    localStorage.removeItem(storageKey);
    initializeWithWelcome();
  }, [brandTemplateId, initializeWithWelcome]);
  
  // Extract all topics from all assistant messages
  const allExtractedTopics = useMemo(() => {
    const topics: ExtractedTopic[] = [];
    
    messages.forEach(message => {
      if (message.role === 'assistant' && message.id !== 'welcome') {
        const extracted = message.extractedTopics || extractTopicsFromMessage(message.content);
        topics.push(...extracted);
      }
    });
    
    return topics;
  }, [messages]);
  
  return {
    messages,
    setMessages,
    addMessage,
    updateMessage,
    removeMessage,
    resetMessages,
    allExtractedTopics,
    animatingMessageId,
    setAnimatingMessageId,
    personalizedWelcome,
  };
}
