// ============================================
// useChatMessages Hook
// Manages message state, localStorage persistence, CRUD operations
// Includes personalized welcome message support
// Syncs with DB conversation messages when provided
// ============================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ChatMessage, ExtractedTopic } from '@/components/topic/chatbot/types';
import type { ChatConversationMessage } from '@/hooks/useChatConversations';
import { getStorageKey } from '@/components/topic/chatbot/constants';
import { extractTopicsFromMessage } from '@/components/topic/chatbot/utils';
import { usePersonalizedWelcome, type PersonalizedWelcomeData } from './usePersonalizedWelcome';

interface UseChatMessagesOptions {
  brandTemplateId?: string;
  autoLoad?: boolean;
  /** DB conversation messages from shared ConversationState */
  conversationMessages?: ChatConversationMessage[];
  /** Current conversation ID — when it changes, sync messages from DB */
  currentConversationId?: string;
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

/** Convert DB messages to ChatMessage format */
function dbMessagesToChatMessages(dbMessages: ChatConversationMessage[]): ChatMessage[] {
  return dbMessages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      timestamp: new Date(m.created_at),
      conversationId: m.conversation_id,
      ...(m.metadata?.extractedTopics && { extractedTopics: m.metadata.extractedTopics }),
      ...(m.metadata?.contextBadges && { contextBadges: m.metadata.contextBadges }),
      ...(m.metadata?.suggestedFollowUps && { suggestedFollowUps: m.metadata.suggestedFollowUps }),
      ...(m.metadata?.reviewScores && { reviewScores: m.metadata.reviewScores }),
      ...(m.metadata?.toolResults && { toolResults: m.metadata.toolResults }),
    }));
}

export function useChatMessages(options: UseChatMessagesOptions = {}): UseChatMessagesReturn {
  const { brandTemplateId, autoLoad = true, conversationMessages, currentConversationId } = options;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [animatingMessageId, setAnimatingMessageId] = useState<string | null>(null);
  const prevConversationIdRef = useRef<string | undefined>(undefined);
  
  // Get personalized welcome data
  const personalizedWelcome = usePersonalizedWelcome({ brandTemplateId });
  
  // Initialize with welcome message
  const initializeWithWelcome = useCallback(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: '__PERSONALIZED_WELCOME__',
      timestamp: new Date(),
    }]);
  }, []);

  // Sync with DB conversation messages when conversation changes
  useEffect(() => {
    if (currentConversationId !== prevConversationIdRef.current) {
      prevConversationIdRef.current = currentConversationId;
      
      if (!currentConversationId) {
        // Cleared conversation — show welcome
        initializeWithWelcome();
        return;
      }
      
      if (conversationMessages && conversationMessages.length > 0) {
        const chatMsgs = dbMessagesToChatMessages(conversationMessages);
        setMessages(chatMsgs.length > 0 ? chatMsgs : []);
      }
    }
  }, [currentConversationId, conversationMessages, initializeWithWelcome]);

  // When conversationMessages update for the SAME conversation (new messages added), sync
  useEffect(() => {
    if (currentConversationId && conversationMessages && conversationMessages.length > 0 
        && currentConversationId === prevConversationIdRef.current) {
      const chatMsgs = dbMessagesToChatMessages(conversationMessages);
      if (chatMsgs.length > 0) {
        // Only update if DB has more messages than local (avoid overwriting streaming state)
        setMessages(prev => {
          const localNonWelcome = prev.filter(m => m.id !== 'welcome');
          if (chatMsgs.length > localNonWelcome.length) {
            return chatMsgs;
          }
          return prev;
        });
      }
    }
  }, [conversationMessages, currentConversationId]);
  
  // Load messages from localStorage on mount (only if no DB conversation)
  useEffect(() => {
    if (!autoLoad || currentConversationId) return;
    
    const storageKey = getStorageKey(brandTemplateId);
    const savedMessages = localStorage.getItem(storageKey);
    
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
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
  }, [brandTemplateId, autoLoad, currentConversationId]);
  
  // Save messages to localStorage whenever they change (only if no DB conversation)
  useEffect(() => {
    if (messages.length === 0 || currentConversationId) return;
    
    const storageKey = getStorageKey(brandTemplateId);
    if (messages.length === 1 && messages[0].id === 'welcome') return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save messages:', e);
    }
  }, [messages, brandTemplateId, currentConversationId]);
  
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
