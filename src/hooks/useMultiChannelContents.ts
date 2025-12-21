import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MultiChannelContent, MultiChannelFormData, Channel, ContentGoal } from '@/types/multichannel';
import { toast } from '@/hooks/use-toast';

export function useMultiChannelContents() {
  const [contents, setContents] = useState<MultiChannelContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regeneratingChannel, setRegeneratingChannel] = useState<string | null>(null);

  const fetchContents = async () => {
    try {
      const { data, error } = await supabase
        .from('multi_channel_contents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our TypeScript interface
      const transformedData: MultiChannelContent[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        topic: item.topic,
        industry: item.industry,
        content_goal: item.content_goal as ContentGoal,
        selected_channels: item.selected_channels as Channel[],
        brand_template_id: item.brand_template_id,
        brand_name: item.brand_name,
        brand_guideline: item.brand_guideline,
        primary_color: item.primary_color,
        website_content: item.website_content,
        facebook_content: item.facebook_content,
        instagram_content: item.instagram_content,
        twitter_content: item.twitter_content,
        google_maps_content: item.google_maps_content,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));

      setContents(transformedData);
    } catch (error) {
      console.error('Error fetching contents:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách nội dung',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateContent = async (formData: MultiChannelFormData): Promise<MultiChannelContent | null> => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-multichannel', {
        body: formData,
      });

      if (error) {
        throw new Error(error.message || 'Lỗi khi tạo nội dung');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const newContent: MultiChannelContent = {
        id: data.id,
        title: data.title,
        topic: data.topic,
        industry: data.industry,
        content_goal: data.content_goal as ContentGoal,
        selected_channels: data.selected_channels as Channel[],
        brand_template_id: data.brand_template_id,
        brand_name: data.brand_name,
        brand_guideline: data.brand_guideline,
        primary_color: data.primary_color,
        website_content: data.website_content,
        facebook_content: data.facebook_content,
        instagram_content: data.instagram_content,
        twitter_content: data.twitter_content,
        google_maps_content: data.google_maps_content,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      setContents(prev => [newContent, ...prev]);
      
      toast({
        title: 'Thành công',
        description: 'Đã tạo nội dung đa kênh',
      });

      return newContent;
    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể tạo nội dung',
        variant: 'destructive',
      });
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const regenerateChannel = async (contentId: string, channel: Channel): Promise<MultiChannelContent | null> => {
    setRegeneratingChannel(channel);
    try {
      const { data, error } = await supabase.functions.invoke('regenerate-channel', {
        body: { contentId, channel },
      });

      if (error) {
        throw new Error(error.message || 'Lỗi khi tạo lại nội dung');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const updatedContent: MultiChannelContent = {
        id: data.id,
        title: data.title,
        topic: data.topic,
        industry: data.industry,
        content_goal: data.content_goal as ContentGoal,
        selected_channels: data.selected_channels as Channel[],
        brand_template_id: data.brand_template_id,
        brand_name: data.brand_name,
        brand_guideline: data.brand_guideline,
        primary_color: data.primary_color,
        website_content: data.website_content,
        facebook_content: data.facebook_content,
        instagram_content: data.instagram_content,
        twitter_content: data.twitter_content,
        google_maps_content: data.google_maps_content,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      // Update the content in the list
      setContents(prev => prev.map(c => c.id === contentId ? updatedContent : c));
      
      toast({
        title: 'Thành công',
        description: `Đã tạo lại nội dung cho kênh`,
      });

      return updatedContent;
    } catch (error) {
      console.error('Error regenerating channel:', error);
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể tạo lại nội dung',
        variant: 'destructive',
      });
      return null;
    } finally {
      setRegeneratingChannel(null);
    }
  };

  const deleteContent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('multi_channel_contents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setContents(prev => prev.filter(c => c.id !== id));
      
      toast({
        title: 'Đã xóa',
        description: 'Đã xóa nội dung thành công',
      });
    } catch (error) {
      console.error('Error deleting content:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể xóa nội dung',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchContents();
  }, []);

  return {
    contents,
    loading,
    generating,
    regeneratingChannel,
    generateContent,
    regenerateChannel,
    deleteContent,
    refetch: fetchContents,
  };
}
