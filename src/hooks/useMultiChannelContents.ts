import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MultiChannelContent, MultiChannelFormData, Channel, ContentGoal, ContentStatus, ChannelImage, ChannelImages, ChannelStatuses, calculateMasterStatus } from '@/types/multichannel';
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
  telegram_content: data.telegram_content,
  channel_images: (data.channel_images || {}) as ChannelImages,
  channel_statuses: (data.channel_statuses || {}) as ChannelStatuses,
  tags: data.tags || [],
  status: (data.status || 'draft') as ContentStatus,
  created_at: data.created_at,
  updated_at: data.updated_at,
});

export function useMultiChannelContents() {
  const { user } = useAuth();
  const [contents, setContents] = useState<MultiChannelContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regeneratingChannel, setRegeneratingChannel] = useState<string | null>(null);
  const [aiEditingChannel, setAiEditingChannel] = useState<string | null>(null);

  const fetchContents = async () => {
    if (!user) {
      setContents([]);
      setLoading(false);
      return;
    }

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
    if (!user) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng đăng nhập để tạo nội dung',
        variant: 'destructive',
      });
      return null;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-multichannel', {
        body: { ...formData, user_id: user.id },
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
        title: '✨ Tạo nội dung thành công!',
        description: `Đã tạo ${data.selected_channels?.length || 0} kênh cho "${data.title}"`,
        className: 'success-highlight animate-success',
      });

      return newContent;
    } catch (error) {
      console.error('Error generating content:', error);
      // Refetch to check if content was created despite error (timeout issue)
      await fetchContents();
      toast({
        title: '⚠️ Lỗi kết nối',
        description: 'Có thể nội dung đã được tạo. Vui lòng kiểm tra danh sách.',
        variant: 'destructive',
        className: 'animate-error-shake',
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
        title: '🔄 Đã tạo lại nội dung',
        description: `Kênh đã được cập nhật với nội dung mới`,
        className: 'animate-success',
      });

      return updatedContent;
    } catch (error) {
      console.error('Error regenerating channel:', error);
      toast({
        title: '❌ Không thể tạo lại',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại sau',
        variant: 'destructive',
        className: 'animate-error-shake',
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
        telegram: 'telegram_content',
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
        title: '💾 Đã lưu thành công',
        description: 'Nội dung đã được cập nhật',
        className: 'animate-success',
      });

      return updatedContent;
    } catch (error) {
      console.error('Error updating channel content:', error);
      toast({
        title: '❌ Lỗi lưu nội dung',
        description: 'Không thể lưu. Vui lòng thử lại.',
        variant: 'destructive',
        className: 'animate-error-shake',
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
        title: '🗑️ Đã xóa',
        description: 'Nội dung đã được xóa thành công',
      });
    } catch (error) {
      console.error('Error deleting content:', error);
      toast({
        title: '❌ Không thể xóa',
        description: 'Vui lòng thử lại sau',
        variant: 'destructive',
        className: 'animate-error-shake',
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
        title: '🤖 AI đã chỉnh sửa',
        description: 'Xem trước kết quả và lưu nếu hài lòng',
        className: 'animate-success',
      });

      return data.editedContent;
    } catch (error) {
      console.error('Error AI editing channel:', error);
      toast({
        title: '❌ Lỗi AI',
        description: error instanceof Error ? error.message : 'Không thể chỉnh sửa với AI',
        variant: 'destructive',
        className: 'animate-error-shake',
      });
      return null;
    } finally {
      setAiEditingChannel(null);
    }
  };

  // Save channel image to database
  const saveChannelImage = async (contentId: string, channel: Channel, imageData: ChannelImage): Promise<MultiChannelContent | null> => {
    try {
      // Get current content to merge images
      const currentContent = contents.find(c => c.id === contentId);
      const currentImages = currentContent?.channel_images || {};
      
      const updatedImages: ChannelImages = {
        ...currentImages,
        [channel]: imageData,
      };

      const { data, error } = await supabase
        .from('multi_channel_contents')
        .update({ channel_images: JSON.parse(JSON.stringify(updatedImages)) })
        .eq('id', contentId)
        .select()
        .single();

      if (error) throw error;

      const updatedContent = transformContent(data);
      setContents(prev => prev.map(c => c.id === contentId ? updatedContent : c));
      
      toast({
        title: '🖼️ Đã lưu ảnh',
        description: 'Ảnh đã được lưu vào nội dung',
        className: 'animate-success',
      });

      return updatedContent;
    } catch (error) {
      console.error('Error saving channel image:', error);
      toast({
        title: '❌ Lỗi lưu ảnh',
        description: 'Không thể lưu ảnh. Vui lòng thử lại.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Update title and topic
  const updateTitleTopic = async (contentId: string, title: string, topic: string): Promise<MultiChannelContent | null> => {
    try {
      const { data, error } = await supabase
        .from('multi_channel_contents')
        .update({ title, topic })
        .eq('id', contentId)
        .select()
        .single();

      if (error) throw error;

      const updatedContent = transformContent(data);
      setContents(prev => prev.map(c => c.id === contentId ? updatedContent : c));
      
      toast({
        title: '✏️ Đã cập nhật',
        description: 'Tiêu đề và chủ đề đã được lưu',
        className: 'animate-success',
      });

      return updatedContent;
    } catch (error) {
      console.error('Error updating title/topic:', error);
      toast({
        title: '❌ Lỗi cập nhật',
        description: 'Không thể cập nhật. Vui lòng thử lại.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Update tags
  const updateTags = async (contentId: string, tags: string[]): Promise<MultiChannelContent | null> => {
    try {
      const { data, error } = await supabase
        .from('multi_channel_contents')
        .update({ tags })
        .eq('id', contentId)
        .select()
        .single();

      if (error) throw error;

      const updatedContent = transformContent(data);
      setContents(prev => prev.map(c => c.id === contentId ? updatedContent : c));
      
      toast({
        title: '🏷️ Đã cập nhật tags',
        description: `Đã lưu ${tags.length} tags`,
        className: 'animate-success',
      });

      return updatedContent;
    } catch (error) {
      console.error('Error updating tags:', error);
      toast({
        title: '❌ Lỗi cập nhật tags',
        description: 'Không thể cập nhật tags. Vui lòng thử lại.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Update master status
  const updateStatus = async (contentId: string, status: ContentStatus): Promise<MultiChannelContent | null> => {
    try {
      const { data, error } = await supabase
        .from('multi_channel_contents')
        .update({ status })
        .eq('id', contentId)
        .select()
        .single();

      if (error) throw error;

      const updatedContent = transformContent(data);
      setContents(prev => prev.map(c => c.id === contentId ? updatedContent : c));
      
      toast({
        title: '✅ Đã cập nhật trạng thái',
        description: `Chuyển sang "${status}"`,
        className: 'animate-success',
      });

      return updatedContent;
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: '❌ Lỗi cập nhật trạng thái',
        description: 'Không thể cập nhật trạng thái. Vui lòng thử lại.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Update channel-specific status
  const updateChannelStatus = async (contentId: string, channel: Channel, status: ContentStatus): Promise<MultiChannelContent | null> => {
    try {
      // Get current content to merge statuses
      const currentContent = contents.find(c => c.id === contentId);
      const currentStatuses = currentContent?.channel_statuses || {};
      const selectedChannels = currentContent?.selected_channels || [];
      
      const updatedStatuses: ChannelStatuses = {
        ...currentStatuses,
        [channel]: status,
      };

      // Calculate new master status
      const newMasterStatus = calculateMasterStatus(updatedStatuses, selectedChannels);

      const { data, error } = await supabase
        .from('multi_channel_contents')
        .update({ 
          channel_statuses: JSON.parse(JSON.stringify(updatedStatuses)),
          status: newMasterStatus 
        })
        .eq('id', contentId)
        .select()
        .single();

      if (error) throw error;

      const updatedContent = transformContent(data);
      setContents(prev => prev.map(c => c.id === contentId ? updatedContent : c));
      
      toast({
        title: '✅ Đã cập nhật trạng thái kênh',
        description: `${channel} → "${status}"`,
        className: 'animate-success',
      });

      return updatedContent;
    } catch (error) {
      console.error('Error updating channel status:', error);
      toast({
        title: '❌ Lỗi cập nhật trạng thái',
        description: 'Không thể cập nhật trạng thái kênh. Vui lòng thử lại.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Delete channel image
  const deleteChannelImage = async (contentId: string, channel: Channel): Promise<MultiChannelContent | null> => {
    try {
      const currentContent = contents.find(c => c.id === contentId);
      const currentImages = { ...currentContent?.channel_images };
      delete currentImages[channel];

      const { data, error } = await supabase
        .from('multi_channel_contents')
        .update({ channel_images: JSON.parse(JSON.stringify(currentImages)) })
        .eq('id', contentId)
        .select()
        .single();

      if (error) throw error;

      const updatedContent = transformContent(data);
      setContents(prev => prev.map(c => c.id === contentId ? updatedContent : c));
      
      toast({
        title: '🗑️ Đã xóa ảnh',
        description: 'Ảnh đã được xóa khỏi nội dung',
      });

      return updatedContent;
    } catch (error) {
      console.error('Error deleting channel image:', error);
      toast({
        title: '❌ Lỗi xóa ảnh',
        description: 'Không thể xóa ảnh. Vui lòng thử lại.',
        variant: 'destructive',
      });
      return null;
    }
  };

  useEffect(() => {
    fetchContents();
  }, [user]);

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
    saveChannelImage,
    updateTitleTopic,
    updateTags,
    updateStatus,
    updateChannelStatus,
    deleteChannelImage,
    refetch: fetchContents,
  };
}
