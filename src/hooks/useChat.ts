import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  organization_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  reply_to_id: string | null;
  sender_profile?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export function useChat() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!currentOrganization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      // Fetch sender profiles
      const senderIds = [...new Set(data?.map(m => m.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const messagesWithProfiles = (data || []).map(msg => ({
        ...msg,
        sender_profile: profileMap.get(msg.sender_id) || undefined,
      }));

      setMessages(messagesWithProfiles);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!currentOrganization?.id) return;

    fetchMessages();

    const channel = supabase
      .channel(`chat:${currentOrganization.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `organization_id=eq.${currentOrganization.id}`,
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          // Fetch sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url')
            .eq('id', newMessage.sender_id)
            .single();

          setMessages(prev => [...prev, {
            ...newMessage,
            sender_profile: profile || undefined,
          }]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `organization_id=eq.${currentOrganization.id}`,
        },
        (payload) => {
          const updatedMessage = payload.new as ChatMessage;
          setMessages(prev => prev.map(msg => 
            msg.id === updatedMessage.id 
              ? { ...msg, ...updatedMessage, is_edited: true }
              : msg
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `organization_id=eq.${currentOrganization.id}`,
        },
        (payload) => {
          const deletedMessage = payload.old as { id: string };
          setMessages(prev => prev.filter(msg => msg.id !== deletedMessage.id));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrganization?.id, fetchMessages]);

  const sendMessage = useCallback(async (content: string, replyToId?: string) => {
    if (!user?.id || !currentOrganization?.id || !content.trim()) return false;

    setSending(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          organization_id: currentOrganization.id,
          sender_id: user.id,
          content: content.trim(),
          reply_to_id: replyToId || null,
        });

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Không thể gửi tin nhắn');
      return false;
    } finally {
      setSending(false);
    }
  }, [user?.id, currentOrganization?.id]);

  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!newContent.trim()) return false;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ content: newContent.trim(), is_edited: true })
        .eq('id', messageId);

      if (error) throw error;
      toast.success('Đã sửa tin nhắn');
      return true;
    } catch (error: any) {
      console.error('Error editing message:', error);
      toast.error('Không thể sửa tin nhắn');
      return false;
    }
  }, []);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      toast.success('Đã xóa tin nhắn');
      return true;
    } catch (error: any) {
      console.error('Error deleting message:', error);
      toast.error('Không thể xóa tin nhắn');
      return false;
    }
  }, []);

  return {
    messages,
    loading,
    sending,
    sendMessage,
    editMessage,
    deleteMessage,
    refreshMessages: fetchMessages,
  };
}
