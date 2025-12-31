// ============================================
// useChatArtifacts Hook
// Manages artifacts panel state and topic collection
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ExtractedTopic } from '@/components/topic/chatbot/types';
import type { ArtifactTopic } from '@/components/topic/chatbot/ArtifactsPanel';
import { getArtifactsStorageKey, TOPIC_CATEGORY_MAP } from '@/components/topic/chatbot/constants';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UseChatArtifactsOptions {
  brandTemplateId?: string;
  allExtractedTopics: ExtractedTopic[];
  userId?: string;
  organizationId?: string;
}

interface UseChatArtifactsReturn {
  showArtifactsPanel: boolean;
  setShowArtifactsPanel: (show: boolean) => void;
  artifactTopics: ArtifactTopic[];
  setArtifactTopics: React.Dispatch<React.SetStateAction<ArtifactTopic[]>>;
  isSavingToBank: boolean;
  addToArtifacts: (topic: ExtractedTopic) => void;
  removeFromArtifacts: (topicId: string) => void;
  saveToBank: (topic: ArtifactTopic) => Promise<void>;
  saveAllToBank: () => Promise<void>;
  clearArtifacts: () => void;
}

export function useChatArtifacts(options: UseChatArtifactsOptions): UseChatArtifactsReturn {
  const { brandTemplateId, allExtractedTopics, userId, organizationId } = options;
  
  const [showArtifactsPanel, setShowArtifactsPanel] = useState(false);
  const [artifactTopics, setArtifactTopics] = useState<ArtifactTopic[]>([]);
  const [isSavingToBank, setIsSavingToBank] = useState(false);
  
  // Load artifacts from localStorage on mount
  useEffect(() => {
    const storageKey = getArtifactsStorageKey(brandTemplateId);
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setArtifactTopics(parsed);
      } catch (e) {
        console.error('Failed to parse saved artifacts:', e);
      }
    }
  }, [brandTemplateId]);
  
  // Save artifacts to localStorage whenever they change
  useEffect(() => {
    if (artifactTopics.length === 0) return;
    
    const storageKey = getArtifactsStorageKey(brandTemplateId);
    try {
      localStorage.setItem(storageKey, JSON.stringify(artifactTopics));
    } catch (e) {
      console.error('Failed to save artifacts:', e);
    }
  }, [artifactTopics, brandTemplateId]);
  
  // Sync extracted topics to artifacts
  useEffect(() => {
    if (allExtractedTopics.length === 0) return;
    
    setArtifactTopics(prev => {
      const existingTopicTexts = new Set(prev.map(t => t.topic.toLowerCase()));
      const newTopics: ArtifactTopic[] = [];
      
      for (const extracted of allExtractedTopics) {
        if (!existingTopicTexts.has(extracted.topic.toLowerCase())) {
      newTopics.push({
        id: `topic-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        topic: extracted.topic,
        reason: extracted.reason,
        format: extracted.format,
        isSaved: false,
      });
          existingTopicTexts.add(extracted.topic.toLowerCase());
        }
      }
      
      if (newTopics.length === 0) return prev;
      return [...prev, ...newTopics];
    });
  }, [allExtractedTopics]);
  
  // Add a topic to artifacts
  const addToArtifacts = useCallback((topic: ExtractedTopic) => {
    setArtifactTopics(prev => {
      const exists = prev.some(t => t.topic.toLowerCase() === topic.topic.toLowerCase());
      if (exists) return prev;
      
      return [...prev, {
        id: `topic-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        topic: topic.topic,
        reason: topic.reason,
        format: topic.format,
        isSaved: false,
      }];
    });
  }, []);
  
  // Remove a topic from artifacts
  const removeFromArtifacts = useCallback((topicId: string) => {
    setArtifactTopics(prev => prev.filter(t => t.id !== topicId));
  }, []);
  
  // Save a single topic to the database
  const saveToBank = useCallback(async (topic: ArtifactTopic) => {
    if (!userId) {
      toast({
        title: 'Cần đăng nhập',
        description: 'Vui lòng đăng nhập để lưu topic vào bank.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSavingToBank(true);
    
    try {
      const category = topic.tag 
        ? TOPIC_CATEGORY_MAP[topic.tag] || 'general'
        : 'general';
      
      const { error } = await supabase.from('topic_history').insert({
        brand_template_id: brandTemplateId || null,
        topic: topic.topic,
        topic_reason: topic.reason || null,
        category,
        format: 'multichannel',
        content_goal: 'engagement',
        status: 'draft',
        source: 'ai_chat',
      });
      
      if (error) throw error;
      
      // Mark as saved
      setArtifactTopics(prev => 
        prev.map(t => t.id === topic.id ? { ...t, isSaved: true } : t)
      );
      
      toast({
        title: '✅ Đã lưu topic',
        description: `"${topic.topic.slice(0, 50)}..." đã được lưu vào Topic Bank.`,
      });
      
    } catch (error) {
      console.error('Failed to save topic:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu topic. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingToBank(false);
    }
  }, [userId, organizationId, brandTemplateId]);
  
  // Save all unsaved topics to the database
  const saveAllToBank = useCallback(async () => {
    if (!userId) {
      toast({
        title: 'Cần đăng nhập',
        description: 'Vui lòng đăng nhập để lưu topics.',
        variant: 'destructive',
      });
      return;
    }
    
    const unsavedTopics = artifactTopics.filter(t => !t.isSaved);
    if (unsavedTopics.length === 0) {
      toast({
        title: 'Không có topic mới',
        description: 'Tất cả topics đã được lưu.',
      });
      return;
    }
    
    setIsSavingToBank(true);
    
    try {
      const inserts = unsavedTopics.map(topic => ({
        brand_template_id: brandTemplateId || null,
        topic: topic.topic,
        topic_reason: topic.reason || null,
        category: topic.tag ? TOPIC_CATEGORY_MAP[topic.tag] || 'general' : 'general',
        format: 'multichannel',
        content_goal: 'engagement',
        status: 'draft',
        source: 'ai_chat',
      }));
      
      const { error } = await supabase.from('topic_history').insert(inserts);
      
      if (error) throw error;
      
      // Mark all as saved
      setArtifactTopics(prev => 
        prev.map(t => ({ ...t, isSaved: true }))
      );
      
      toast({
        title: '✅ Đã lưu tất cả',
        description: `${unsavedTopics.length} topics đã được lưu vào Topic Bank.`,
      });
      
    } catch (error) {
      console.error('Failed to save topics:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu topics. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingToBank(false);
    }
  }, [userId, organizationId, brandTemplateId, artifactTopics]);
  
  // Clear all artifacts
  const clearArtifacts = useCallback(() => {
    const storageKey = getArtifactsStorageKey(brandTemplateId);
    localStorage.removeItem(storageKey);
    setArtifactTopics([]);
    setShowArtifactsPanel(false);
  }, [brandTemplateId]);
  
  return {
    showArtifactsPanel,
    setShowArtifactsPanel,
    artifactTopics,
    setArtifactTopics,
    isSavingToBank,
    addToArtifacts,
    removeFromArtifacts,
    saveToBank,
    saveAllToBank,
    clearArtifacts,
  };
}
