import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MultiChannelContent, MultiChannelFormData, Channel, ContentGoal } from '@/types/multichannel';
import { toast } from '@/hooks/use-toast';

// Helper to transform database data to MultiChannelContent
const transformContent = (data: any): MultiChannelContent => ({
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
  linkedin_content: data.linkedin_content,
  email_content: data.email_content,
  youtube_content: data.youtube_content,
  zalo_oa_content: data.zalo_oa_content,
  created_at: data.created_at,
  updated_at: data.updated_at,
});

export function useMultiChannelContents() {
  const [contents, setContents] = useState<MultiChannelContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regeneratingChannel, setRegeneratingChannel] = useState<string | null>(null);
  const [aiEditingChannel, setAiEditingChannel] = useState<string | null>(null);

  const fetchContents = async () => {
    try {
      const { data, error } = await supabase
        .from('multi_channel_contents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const transformedData = (data || []).map(transformContent);
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

      const newContent = transformContent(data);
      setContents(prev => [newContent, ...prev]);
      
      toast({
        title: 'Thành công',
        description: 'Đã tạo nội dung đa kênh',
      });

      return newContent;
    } catch (error) {
      console.error('Error generating content:', error);
      // Refetch to check if content was created despite error (timeout issue)
      await fetchContents();
      toast({
        title: 'Lỗi kết nối',
        description: 'Có thể nội dung đã được tạo. Vui lòng kiểm tra danh sách.',
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

      const updatedContent = transformContent(data);
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

  const updateChannelContent = async (contentId: string, channel: Channel, newContent: string): Promise<MultiChannelContent | null> => {
    try {
      const fieldMap: Record<Channel, string> = {
        website: 'website_content',
        facebook: 'facebook_content',
        instagram: 'instagram_content',
        twitter: 'twitter_content',
        google_maps: 'google_maps_content',
        linkedin: 'linkedin_content',
        email: 'email_content',
        youtube: 'youtube_content',
        zalo_oa: 'zalo_oa_content',
      };

      const updateField = fieldMap[channel];
      
      const { data, error } = await supabase
        .from('multi_channel_contents')
        .update({ [updateField]: newContent })
        .eq('id', contentId)
        .select()
        .single();

      if (error) throw error;

      const updatedContent = transformContent(data);
      setContents(prev => prev.map(c => c.id === contentId ? updatedContent : c));
      
      toast({
        title: 'Đã lưu',
        description: 'Nội dung đã được cập nhật',
      });

      return updatedContent;
    } catch (error) {
      console.error('Error updating channel content:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu nội dung',
        variant: 'destructive',
      });
      return null;
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

  const aiEditChannel = async (contentId: string, channel: Channel, instruction: string, currentContent: string): Promise<string | null> => {
    setAiEditingChannel(channel);
    try {
      const { data, error } = await supabase.functions.invoke('ai-edit-channel', {
        body: { contentId, channel, instruction, currentContent },
      });

      if (error) {
        throw new Error(error.message || 'Lỗi khi chỉnh sửa với AI');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'AI đã chỉnh sửa',
        description: 'Xem trước và lưu nếu hài lòng',
      });

      return data.editedContent;
    } catch (error) {
      console.error('Error AI editing channel:', error);
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể chỉnh sửa với AI',
        variant: 'destructive',
      });
      return null;
    } finally {
      setAiEditingChannel(null);
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
    aiEditingChannel,
    generateContent,
    regenerateChannel,
    updateChannelContent,
    aiEditChannel,
    deleteContent,
    refetch: fetchContents,
  };
}
