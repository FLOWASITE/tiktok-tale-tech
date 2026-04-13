import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from './use-toast';

export interface ChatConversation {
  id: string;
  title: string | null;
  summary: string | null;
  message_count: number;
  last_message_at: string | null;
  content_goal: string | null;
  brand_template_id: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatConversationMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, any>;
  created_at: string;
}

interface UseChatConversationsOptions {
  brandTemplateId?: string;
  organizationId?: string;
  autoLoad?: boolean;
}

const CONVERSATIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-conversations`;

export function useChatConversations(options: UseChatConversationsOptions = {}) {
  const { brandTemplateId, organizationId, autoLoad = true } = options;
  const { user, session } = useAuth();
  
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Helper to make authenticated requests
  const apiRequest = useCallback(async (body: Record<string, any>) => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(CONVERSATIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }, [session?.access_token]);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const result = await apiRequest({
        action: 'list',
        brandTemplateId,
        organizationId,
        limit: 20,
      });
      setConversations(result.conversations || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, brandTemplateId, organizationId, apiRequest]);

  // Create new conversation
  const createConversation = useCallback(async (contentGoal?: string): Promise<ChatConversation | null> => {
    if (!user) return null;

    setIsSaving(true);
    try {
      const result = await apiRequest({
        action: 'create',
        brandTemplateId,
        organizationId,
        contentGoal,
      });
      
      const newConversation = result.conversation;
      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversation(newConversation);
      setMessages([]);
      
      return newConversation;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể tạo cuộc hội thoại mới.',
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [user, brandTemplateId, organizationId, apiRequest]);

  // Load a specific conversation with messages
  const loadConversation = useCallback(async (conversationId: string) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const [convResult, msgResult] = await Promise.all([
        apiRequest({ action: 'get', conversationId }),
        apiRequest({ action: 'get_messages', conversationId }),
      ]);
      
      setCurrentConversation(convResult.conversation);
      setMessages(msgResult.messages || []);
    } catch (error) {
      console.error('Failed to load conversation:', error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể tải cuộc hội thoại.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, apiRequest]);

  // Add message to current conversation
  const addMessage = useCallback(async (
    role: 'user' | 'assistant',
    content: string,
    metadata?: Record<string, any>,
    conversationId?: string
  ): Promise<ChatConversationMessage | null> => {
    const targetId = conversationId || currentConversation?.id;
    if (!targetId) return null;

    setIsSaving(true);
    try {
      const result = await apiRequest({
        action: 'add_message',
        conversationId: targetId,
        message: { role, content, metadata },
      });
      
      const newMessage = result.message;
      setMessages(prev => [...prev, newMessage]);
      
      // Determine new title (first user message becomes title)
      const isFirstUserMessage = role === 'user';
      const currentTitle = currentConversation?.title || conversations.find(c => c.id === targetId)?.title;
      const newTitle = !currentTitle ? (isFirstUserMessage ? content.slice(0, 100) : null) : currentTitle;
      
      // Update currentConversation
      setCurrentConversation(prev => prev && prev.id === targetId ? {
        ...prev,
        message_count: prev.message_count + 1,
        last_message_at: newMessage.created_at,
        title: newTitle || prev.title,
      } : prev);
      
      // Sync title + metadata into conversations list (sidebar reads this)
      setConversations(prev => prev.map(c => 
        c.id === targetId 
          ? { 
              ...c, 
              message_count: c.message_count + 1, 
              last_message_at: newMessage.created_at,
              title: newTitle || c.title,
            }
          : c
      ));
      
      // Persist title to DB if it was just set
      if (newTitle && !currentTitle) {
        apiRequest({
          action: 'update',
          conversationId: targetId,
          title: newTitle,
        }).catch(err => console.error('Failed to persist title:', err));
      }
      
      return newMessage;
    } catch (error) {
      console.error('Failed to add message:', error);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [currentConversation, conversations, apiRequest]);

  // Update conversation (title, archive)
  const updateConversation = useCallback(async (
    conversationId: string,
    updates: { title?: string; summary?: string; isArchived?: boolean }
  ) => {
    try {
      const result = await apiRequest({
        action: 'update',
        conversationId,
        ...updates,
      });
      
      const updated = result.conversation;
      setConversations(prev => prev.map(c => c.id === conversationId ? updated : c));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(updated);
      }
      
      return updated;
    } catch (error) {
      console.error('Failed to update conversation:', error);
      return null;
    }
  }, [currentConversation, apiRequest]);

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      await apiRequest({ action: 'delete', conversationId });
      
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
      
      toast({
        title: 'Đã xóa',
        description: 'Cuộc hội thoại đã được xóa.',
      });
      
      return true;
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể xóa cuộc hội thoại.',
      });
      return false;
    }
  }, [currentConversation, apiRequest]);

  // Archive conversation
  const archiveConversation = useCallback(async (conversationId: string) => {
    const result = await updateConversation(conversationId, { isArchived: true });
    if (result) {
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
      toast({
        title: 'Đã lưu trữ',
        description: 'Cuộc hội thoại đã được lưu trữ.',
      });
    }
  }, [currentConversation, updateConversation]);

  // Clear current conversation (start new)
  const clearCurrentConversation = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
  }, []);

  // Summarize conversation
  const summarizeConversation = useCallback(async (conversationId: string, force = false) => {
    if (!session?.access_token) return null;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/summarize-conversation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ conversationId, force }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to summarize');
      }

      const result = await response.json();
      
      if (result.summary && !result.skipped) {
        // Update local state with new summary
        setConversations(prev => prev.map(c => 
          c.id === conversationId 
            ? { ...c, summary: result.summary, title: result.title || c.title }
            : c
        ));
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(prev => prev ? {
            ...prev,
            summary: result.summary,
            title: result.title || prev.title,
          } : null);
        }
      }

      return result;
    } catch (error) {
      console.error('Failed to summarize conversation:', error);
      return null;
    }
  }, [session?.access_token, currentConversation]);

  // Auto-load conversations on mount
  useEffect(() => {
    if (autoLoad && user) {
      loadConversations();
    }
  }, [autoLoad, user, loadConversations]);

  return {
    // State
    conversations,
    currentConversation,
    messages,
    isLoading,
    isSaving,
    
    // Actions
    loadConversations,
    createConversation,
    loadConversation,
    addMessage,
    updateConversation,
    deleteConversation,
    archiveConversation,
    clearCurrentConversation,
    summarizeConversation,
    
    // Direct setters for optimistic updates
    setCurrentConversation,
    setMessages,
  };
}
