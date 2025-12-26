import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface TopicContentLink {
  id: string;
  topicHistoryId: string;
  contentId: string;
  contentType: 'multichannel' | 'script' | 'carousel';
  contentTitle: string | null;
  contentStatus: string | null;
  createdAt: string;
}

interface UseTopicContentLinksOptions {
  topicHistoryId?: string;
  enabled?: boolean;
}

export function useTopicContentLinks(options: UseTopicContentLinksOptions = {}) {
  const { topicHistoryId, enabled = true } = options;
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  
  const [links, setLinks] = useState<TopicContentLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    if (!user || !enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('topic_content_links')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (topicHistoryId) {
        query = query.eq('topic_history_id', topicHistoryId);
      }
      
      if (currentOrganization?.id) {
        query = query.eq('organization_id', currentOrganization.id);
      } else {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      setLinks((data || []).map(item => ({
        id: item.id,
        topicHistoryId: item.topic_history_id,
        contentId: item.content_id,
        contentType: item.content_type as 'multichannel' | 'script' | 'carousel',
        contentTitle: item.content_title,
        contentStatus: item.content_status,
        createdAt: item.created_at,
      })));
    } catch (err) {
      console.error('Error fetching topic content links:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [user, currentOrganization?.id, topicHistoryId, enabled]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  // Create a new link
  const createLink = useCallback(async (
    topicHistoryId: string,
    contentId: string,
    contentType: 'multichannel' | 'script' | 'carousel',
    contentTitle?: string,
    contentStatus?: string
  ) => {
    if (!user) return null;
    
    try {
      const { data, error: insertError } = await supabase
        .from('topic_content_links')
        .insert({
          topic_history_id: topicHistoryId,
          content_id: contentId,
          content_type: contentType,
          content_title: contentTitle || null,
          content_status: contentStatus || 'draft',
          organization_id: currentOrganization?.id || null,
          user_id: user.id,
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      const newLink: TopicContentLink = {
        id: data.id,
        topicHistoryId: data.topic_history_id,
        contentId: data.content_id,
        contentType: data.content_type as 'multichannel' | 'script' | 'carousel',
        contentTitle: data.content_title,
        contentStatus: data.content_status,
        createdAt: data.created_at,
      };
      
      setLinks(prev => [newLink, ...prev]);
      
      // Also update the topic_history to mark as used
      await supabase
        .from('topic_history')
        .update({
          was_used: true,
          used_at: new Date().toISOString(),
          usage_status: 'created',
          content_id: contentId,
          content_type: contentType,
        })
        .eq('id', topicHistoryId);
      
      return newLink;
    } catch (err) {
      console.error('Error creating topic content link:', err);
      throw err;
    }
  }, [user, currentOrganization?.id]);

  // Update link status
  const updateLinkStatus = useCallback(async (
    linkId: string,
    contentStatus: string
  ) => {
    try {
      const { error: updateError } = await supabase
        .from('topic_content_links')
        .update({ content_status: contentStatus })
        .eq('id', linkId);
      
      if (updateError) throw updateError;
      
      setLinks(prev => prev.map(link => 
        link.id === linkId ? { ...link, contentStatus } : link
      ));
    } catch (err) {
      console.error('Error updating topic content link:', err);
      throw err;
    }
  }, []);

  // Delete a link
  const deleteLink = useCallback(async (linkId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('topic_content_links')
        .delete()
        .eq('id', linkId);
      
      if (deleteError) throw deleteError;
      
      setLinks(prev => prev.filter(link => link.id !== linkId));
    } catch (err) {
      console.error('Error deleting topic content link:', err);
      throw err;
    }
  }, []);

  // Get links by topic
  const getLinksByTopic = useCallback(async (topicId: string): Promise<TopicContentLink[]> => {
    if (!user) return [];
    
    try {
      let query = supabase
        .from('topic_content_links')
        .select('*')
        .eq('topic_history_id', topicId)
        .order('created_at', { ascending: false });
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      return (data || []).map(item => ({
        id: item.id,
        topicHistoryId: item.topic_history_id,
        contentId: item.content_id,
        contentType: item.content_type as 'multichannel' | 'script' | 'carousel',
        contentTitle: item.content_title,
        contentStatus: item.content_status,
        createdAt: item.created_at,
      }));
    } catch (err) {
      console.error('Error fetching links by topic:', err);
      return [];
    }
  }, [user]);

  // Get content type stats
  const contentStats = useMemo(() => {
    const stats = {
      multichannel: 0,
      script: 0,
      carousel: 0,
      total: links.length,
    };
    
    links.forEach(link => {
      stats[link.contentType]++;
    });
    
    return stats;
  }, [links]);

  return {
    links,
    isLoading,
    error,
    createLink,
    updateLinkStatus,
    deleteLink,
    getLinksByTopic,
    contentStats,
    refetch: fetchLinks,
  };
}
