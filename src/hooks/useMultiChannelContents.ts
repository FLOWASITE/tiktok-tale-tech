import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { MultiChannelContent, MultiChannelFormData, Channel, ContentGoal, ContentStatus, ChannelImage, ChannelImages, ChannelStatuses, calculateMasterStatus, CONTENT_STATUSES } from '@/types/multichannel';
import { toast } from '@/hooks/use-toast';
import { normalizeMarkdownText } from '@/utils/normalizeMarkdownText';
import { invokeWithTimeout } from '@/lib/invokeEdgeFunctionWithTimeout';
import { useQueryClient } from '@tanstack/react-query';
import { GEO_SCORING_ENABLED } from '@/lib/featureFlags';

// Helper to normalize content field - ensures string or null
const normalizeContentField = (value: unknown): string | null => {
  const normalized = normalizeMarkdownText(value);
  return normalized || null;
};

// Helper to transform database data to MultiChannelContent
const transformContent = (data: any): MultiChannelContent => ({
  id: data.id,
  title: data.title,
  topic: data.topic,
  industry: data.industry,
  content_goal: data.content_goal as ContentGoal,
  selected_channels: Array.isArray(data.selected_channels) ? data.selected_channels : [],
  brand_template_id: data.brand_template_id,
  brand_name: data.brand_name,
  brand_guideline: data.brand_guideline,
  primary_color: data.primary_color,
  // Normalize all content fields to prevent react-markdown crashes
  website_content: normalizeContentField(data.website_content),
  blogger_content: normalizeContentField((data as any).blogger_content),
  wordpress_content: normalizeContentField((data as any).wordpress_content),
  shopify_content: normalizeContentField((data as any).shopify_content),
  shopify_post_id: (data as any).shopify_post_id ?? null,
  shopify_post_url: (data as any).shopify_post_url ?? null,
  shopify_seo_data: (data as any).shopify_seo_data ?? null,
  wix_content: normalizeContentField((data as any).wix_content),
  wix_post_id: (data as any).wix_post_id ?? null,
  wix_post_url: (data as any).wix_post_url ?? null,
  wix_seo_data: (data as any).wix_seo_data ?? null,
  medium_content: normalizeContentField((data as any).medium_content),
  medium_post_id: (data as any).medium_post_id ?? null,
  medium_post_url: (data as any).medium_post_url ?? null,
  medium_seo_data: (data as any).medium_seo_data ?? null,
  facebook_content: normalizeContentField(data.facebook_content),
  instagram_content: normalizeContentField(data.instagram_content),
  twitter_content: normalizeContentField(data.twitter_content),
  google_maps_content: normalizeContentField(data.google_maps_content),
  linkedin_content: normalizeContentField(data.linkedin_content),
  email_content: normalizeContentField(data.email_content),
  youtube_content: normalizeContentField(data.youtube_content),
  zalo_oa_content: normalizeContentField(data.zalo_oa_content),
  telegram_content: normalizeContentField(data.telegram_content),
  tiktok_content: normalizeContentField(data.tiktok_content),
  threads_content: normalizeContentField(data.threads_content),
  pinterest_content: normalizeContentField(data.pinterest_content),
  bluesky_content: normalizeContentField(data.bluesky_content),
  pinterest_title: data.pinterest_title ?? null,
  pinterest_pin_type: (data as any).pinterest_pin_type ?? null,
  pinterest_post_id: (data as any).pinterest_post_id ?? null,
  pinterest_post_url: (data as any).pinterest_post_url ?? null,
  channel_images:
    data.channel_images && typeof data.channel_images === 'object' && !Array.isArray(data.channel_images)
      ? (data.channel_images as ChannelImages)
      : ({} as ChannelImages),
  channel_statuses:
    data.channel_statuses && typeof data.channel_statuses === 'object' && !Array.isArray(data.channel_statuses)
      ? (data.channel_statuses as ChannelStatuses)
      : ({} as ChannelStatuses),
  tags: Array.isArray(data.tags) ? data.tags : [],
  status: (data.status || 'draft') as ContentStatus,
  priority: data.priority,
  deadline: data.deadline,
  campaign_id: (data as any).campaign_id || null,
  user_id: data.user_id,
  industry_template_version: data.industry_template_version || null,
  core_content_id: data.core_content_id || null,
  content_role: data.content_role || null,
  content_angle: data.content_angle || null,
  critique_score: data.critique_score ?? null,
  critique_details: data.critique_details ?? null,
  was_refined: data.was_refined ?? null,
  refinement_count: data.refinement_count ?? null,
  // Map hook data for text overlay auto-fill
  selected_hooks: Array.isArray(data.selected_hooks) ? data.selected_hooks : null,
  global_hook: data.global_hook && typeof data.global_hook === 'object' ? data.global_hook : null,
  // SEO fields (used by SeoInsightsSheet)
  target_keyword_ids: Array.isArray((data as any).target_keyword_ids) ? (data as any).target_keyword_ids : null,
  cluster_id: (data as any).cluster_id ?? null,
  pillar_id: (data as any).pillar_id ?? null,
  created_at: data.created_at,
  updated_at: data.updated_at,
} as any);

export function useMultiChannelContents() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const [contents, setContents] = useState<MultiChannelContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regeneratingChannel, setRegeneratingChannel] = useState<string | null>(null);
  const [aiEditingChannel, setAiEditingChannel] = useState<string | null>(null);
  const [approvingContent, setApprovingContent] = useState(false);

  /**
   * Auto-trigger GEO scoring for a content item.
   * Scores ALL channels that have content, not just one channel.
   * Fire-and-forget — errors are silently logged.
   */
  const triggerAutoGEOScore = useCallback((contentItem: MultiChannelContent) => {
    if (!GEO_SCORING_ENABLED) return;
    if (!currentOrganization?.id) return;

    // Collect all channel texts into one combined text for overall GEO scoring
    const channelFields: Channel[] = [
      'website', 'facebook', 'instagram', 'twitter', 'linkedin',
      'email', 'youtube', 'zalo_oa', 'telegram', 'tiktok', 'threads', 'google_maps',
    ];
    
    const allTexts: string[] = [];
    for (const ch of channelFields) {
      const fieldKey = `${ch}_content` as keyof MultiChannelContent;
      const text = contentItem[fieldKey];
      if (typeof text === 'string' && text.trim().length > 30) {
        allTexts.push(text.trim());
      }
    }

    // Need at least some content to score
    const combinedText = allTexts.join('\n\n---\n\n');
    if (combinedText.length < 50) return;

    console.log(`[geo] Auto-scoring content ${contentItem.id} (${combinedText.length} chars across ${allTexts.length} channels)`);

    invokeWithTimeout('geo-score-content', {
      body: {
        contentId: contentItem.id,
        contentType: 'multi_channel',
        contentText: combinedText.substring(0, 6000), // Limit to avoid token overflow
        organizationId: currentOrganization.id,
      },
      timeoutMs: 60_000,
    }).then((result) => {
      if (result.error) {
        console.warn('[geo] Auto-score error:', result.error.message);
        return;
      }
      console.log('[geo] Auto-score completed for', contentItem.id, result.data);
      // Invalidate queries so UI updates
      queryClient.invalidateQueries({ queryKey: ['geo-content-score', contentItem.id] });
      queryClient.invalidateQueries({ queryKey: ['geo-content-scores'] });
    }).catch(err => console.warn('[geo] Auto-score failed:', err));
  }, [currentOrganization?.id, queryClient]);

  // Lightweight column set for list view — excludes ALL heavy text fields:
  // *_content (markdown bodies, ~5-15KB each), content_embedding (vector),
  // critique_details, *_seo_data, hook_evaluations / global_hook / selected_hooks.
  // List/Card/Filter views only need metadata. Full row is hydrated on demand
  // via fetchContentDetail when a user opens a single content item.
  const LIST_COLUMNS = [
    'id','title','topic','industry','content_goal','selected_channels',
    'brand_template_id','brand_name','brand_guideline','primary_color',
    'pinterest_title','pinterest_pin_type','pinterest_post_id','pinterest_post_url',
    'website_post_url','website_post_id','blogger_post_url','blogger_post_id',
    'wordpress_post_url','wordpress_post_id','flowa_blog_post_url','flowa_blog_post_id',
    'shopify_post_url','shopify_post_id','wix_post_url','wix_post_id',
    'medium_post_url','medium_post_id','bluesky_post_url','bluesky_post_id',
    'channel_images','channel_statuses','tags','status','priority','deadline',
    'user_id','organization_id',
    'industry_template_version','core_content_id','content_role',
    'critique_score','was_refined','refinement_count',
    'target_keyword_ids','cluster_id',
    'created_at','updated_at',
  ].join(',');


  const fetchContents = async () => {
    if (!user || !currentOrganization) {
      setContents([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('multi_channel_contents')
        .select(LIST_COLUMNS)
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const transformedData = (data || []).map(transformContent);
      setContents(transformedData);
    } catch (error: any) {
      console.error('Error fetching contents:', error);
      const isTimeout = error?.code === '57014' || /timeout|canceling statement/i.test(error?.message || '');
      toast({
        title: isTimeout ? '⏱️ Tải quá lâu' : 'Lỗi tải danh sách',
        description: isTimeout
          ? 'Danh sách nội dung quá lớn. Vui lòng thử lại hoặc lọc theo brand/chiến dịch.'
          : (error?.message || 'Không thể tải danh sách nội dung'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Hydrate a single content with full row (heavy fields included)
  const fetchContentDetail = async (id: string): Promise<MultiChannelContent | null> => {
    try {
      const { data, error } = await supabase
        .from('multi_channel_contents')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const full = transformContent(data);
      setContents(prev => prev.map(c => c.id === id ? { ...c, ...full } : c));
      return full;
    } catch (error) {
      console.error('Error fetching content detail:', error);
      return null;
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
        body: { 
          ...formData, 
          user_id: user.id,
          organization_id: currentOrganization?.id,
          brandVoiceVariantId: formData.brandVoiceVariantId,
          // Map journeyStage to backend's targetJourneyStage
          targetJourneyStage: formData.journeyStage,
          targetProductId: formData.productId,
          targetPersonaId: formData.personaId,
          product_profile_ids: formData.product_profile_ids,
        },
      });

      if (error) {
        throw new Error(error.message || 'Lỗi khi tạo nội dung');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const newContent = transformContent(data);
      setContents(prev => [newContent, ...prev]);
      
      // Auto-trigger GEO scoring after content generation
      triggerAutoGEOScore(newContent);

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

  const regenerateChannel = async (
    contentId: string, 
    channel: Channel,
    options?: { stream?: boolean; enableCritique?: boolean }
  ): Promise<MultiChannelContent | null> => {
    setRegeneratingChannel(channel);
    try {
      const { data, error } = await supabase.functions.invoke('generate-multichannel', {
        body: { 
          action: 'regenerate',
          contentId, 
          channel,
          stream: options?.stream ?? false,
          enableCritique: options?.enableCritique ?? false,
        },
      });

      if (error) {
        throw new Error(error.message || 'Lỗi khi tạo lại nội dung');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const updatedContent = transformContent(data);
      setContents(prev => prev.map(c => c.id === contentId ? updatedContent : c));
      
      // Auto-trigger GEO scoring after regeneration
      triggerAutoGEOScore(updatedContent);

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
        blogger: 'blogger_content',
        wordpress: 'wordpress_content',
        shopify: 'shopify_content',
        wix: 'wix_content',
        medium: 'medium_content',
        facebook: 'facebook_content',
        instagram: 'instagram_content',
        pinterest: 'pinterest_content',
        twitter: 'twitter_content',
        google_maps: 'google_maps_content',
        linkedin: 'linkedin_content',
        email: 'email_content',
        youtube: 'youtube_content',
        zalo_oa: 'zalo_oa_content',
        telegram: 'telegram_content',
        tiktok: 'tiktok_content',
        threads: 'threads_content',
        bluesky: 'bluesky_content',
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
      
      // Auto-trigger GEO scoring after content update
      triggerAutoGEOScore(updatedContent);

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

  // Submit content for review
  const submitForReview = async (contentId: string, notes?: string): Promise<MultiChannelContent | null> => {
    setApprovingContent(true);
    try {
      const { data, error } = await supabase
        .from('multi_channel_contents')
        .update({ status: 'review' })
        .eq('id', contentId)
        .select()
        .single();

      if (error) throw error;

      const updatedContent = transformContent(data);
      setContents(prev => prev.map(c => c.id === contentId ? updatedContent : c));

      // Log the approval action
      if (currentOrganization && user) {
        await supabase.from('approval_logs').insert({
          content_id: contentId,
          organization_id: currentOrganization.id,
          action: 'submitted',
          performed_by: user.id,
          notes: notes || null,
        });

        // Create notification for admins/owners
        const { data: admins } = await supabase
          .from('organization_members')
          .select('user_id')
          .eq('organization_id', currentOrganization.id)
          .in('role', ['owner', 'admin']);

        if (admins && admins.length > 0) {
          const notifications = admins
            .filter(a => a.user_id !== user.id)
            .map(admin => ({
              user_id: admin.user_id,
              organization_id: currentOrganization.id,
              type: 'content_submitted',
              title: 'Nội dung mới chờ duyệt',
              message: `"${updatedContent.title}" đã được gửi duyệt${notes ? `: ${notes}` : ''}`,
              data: { content_id: contentId },
            }));

          if (notifications.length > 0) {
            await supabase.from('notifications').insert(notifications);
          }
        }
      }
      
      toast({
        title: '📤 Đã gửi duyệt',
        description: 'Nội dung đã được gửi đến quản trị viên',
        className: 'animate-success',
      });

      return updatedContent;
    } catch (error) {
      console.error('Error submitting for review:', error);
      toast({
        title: '❌ Lỗi gửi duyệt',
        description: 'Không thể gửi nội dung để duyệt. Vui lòng thử lại.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setApprovingContent(false);
    }
  };

  // Approve content
  const approveContent = async (contentId: string, notes?: string): Promise<MultiChannelContent | null> => {
    setApprovingContent(true);
    try {
      const contentToApprove = contents.find(c => c.id === contentId);
      
      const { data, error } = await supabase
        .from('multi_channel_contents')
        .update({ status: 'approved' })
        .eq('id', contentId)
        .select()
        .single();

      if (error) throw error;

      const updatedContent = transformContent(data);
      setContents(prev => prev.map(c => c.id === contentId ? updatedContent : c));

      // Log the approval action
      if (currentOrganization && user) {
        await supabase.from('approval_logs').insert({
          content_id: contentId,
          organization_id: currentOrganization.id,
          action: 'approved',
          performed_by: user.id,
          notes: notes || null,
        });
      }

      // Notify content creator
      if (currentOrganization && contentToApprove?.user_id && contentToApprove.user_id !== user?.id) {
        await supabase.from('notifications').insert({
          user_id: contentToApprove.user_id,
          organization_id: currentOrganization.id,
          type: 'content_approved',
          title: '✅ Nội dung đã được duyệt',
          message: `"${updatedContent.title}" đã được phê duyệt${notes ? `. Ghi chú: ${notes}` : ''}`,
          data: { content_id: contentId },
        });
      }
      
      toast({
        title: '✅ Đã phê duyệt',
        description: 'Nội dung đã được duyệt thành công',
        className: 'animate-success',
      });

      return updatedContent;
    } catch (error) {
      console.error('Error approving content:', error);
      toast({
        title: '❌ Lỗi phê duyệt',
        description: 'Không thể phê duyệt nội dung. Vui lòng thử lại.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setApprovingContent(false);
    }
  };

  // Reject content
  const rejectContent = async (contentId: string, reason: string): Promise<MultiChannelContent | null> => {
    setApprovingContent(true);
    try {
      const contentToReject = contents.find(c => c.id === contentId);
      
      const { data, error } = await supabase
        .from('multi_channel_contents')
        .update({ status: 'draft' })
        .eq('id', contentId)
        .select()
        .single();

      if (error) throw error;

      const updatedContent = transformContent(data);
      setContents(prev => prev.map(c => c.id === contentId ? updatedContent : c));

      // Log the rejection action
      if (currentOrganization && user) {
        await supabase.from('approval_logs').insert({
          content_id: contentId,
          organization_id: currentOrganization.id,
          action: 'rejected',
          performed_by: user.id,
          notes: reason,
        });
      }

      // Notify content creator with rejection reason
      if (currentOrganization && contentToReject?.user_id && contentToReject.user_id !== user?.id) {
        await supabase.from('notifications').insert({
          user_id: contentToReject.user_id,
          organization_id: currentOrganization.id,
          type: 'content_rejected',
          title: '❌ Nội dung bị từ chối',
          message: `"${updatedContent.title}" đã bị từ chối. Lý do: ${reason}`,
          data: { content_id: contentId, reason },
        });
      }
      
      toast({
        title: '📝 Đã từ chối',
        description: 'Nội dung đã được chuyển về nháp để chỉnh sửa',
        className: 'animate-success',
      });

      return updatedContent;
    } catch (error) {
      console.error('Error rejecting content:', error);
      toast({
        title: '❌ Lỗi từ chối',
        description: 'Không thể từ chối nội dung. Vui lòng thử lại.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setApprovingContent(false);
    }
  };

  // Bulk submit for review
  const bulkSubmitForReview = async (contentIds: string[], notes?: string): Promise<void> => {
    setApprovingContent(true);
    try {
      const { error } = await supabase
        .from('multi_channel_contents')
        .update({ status: 'review' })
        .in('id', contentIds);

      if (error) throw error;

      // Update local state
      setContents(prev => prev.map(c => 
        contentIds.includes(c.id) ? { ...c, status: 'review' as ContentStatus } : c
      ));

      // Create notifications for admins/owners
      if (currentOrganization && user) {
        const { data: admins } = await supabase
          .from('organization_members')
          .select('user_id')
          .eq('organization_id', currentOrganization.id)
          .in('role', ['owner', 'admin']);

        if (admins && admins.length > 0) {
          const notifications = admins
            .filter(a => a.user_id !== user.id)
            .map(admin => ({
              user_id: admin.user_id,
              organization_id: currentOrganization.id,
              type: 'bulk_content_submitted',
              title: 'Nhiều nội dung chờ duyệt',
              message: `${contentIds.length} nội dung đã được gửi duyệt${notes ? `: ${notes}` : ''}`,
              data: { content_ids: contentIds },
            }));

          if (notifications.length > 0) {
            await supabase.from('notifications').insert(notifications);
          }
        }
      }
      
      toast({
        title: '📤 Đã gửi duyệt',
        description: `${contentIds.length} nội dung đã được gửi đến quản trị viên`,
        className: 'animate-success',
      });
    } catch (error) {
      console.error('Error bulk submitting for review:', error);
      toast({
        title: '❌ Lỗi gửi duyệt',
        description: 'Không thể gửi nội dung để duyệt. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setApprovingContent(false);
    }
  };

  // Bulk approve content
  const bulkApproveContent = async (contentIds: string[], notes?: string): Promise<void> => {
    setApprovingContent(true);
    try {
      const contentsToApprove = contents.filter(c => contentIds.includes(c.id));
      
      const { error } = await supabase
        .from('multi_channel_contents')
        .update({ status: 'approved' })
        .in('id', contentIds);

      if (error) throw error;

      // Update local state
      setContents(prev => prev.map(c => 
        contentIds.includes(c.id) ? { ...c, status: 'approved' as ContentStatus } : c
      ));

      // Notify content creators
      if (currentOrganization && user) {
        const creatorIds = [...new Set(contentsToApprove.map(c => c.user_id).filter(id => id && id !== user.id))];
        
        const notifications = creatorIds.map(creatorId => ({
          user_id: creatorId!,
          organization_id: currentOrganization.id,
          type: 'bulk_content_approved',
          title: '✅ Nội dung đã được duyệt',
          message: `${contentsToApprove.filter(c => c.user_id === creatorId).length} nội dung của bạn đã được phê duyệt${notes ? `. Ghi chú: ${notes}` : ''}`,
          data: { content_ids: contentIds },
        }));

        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications);
        }
      }
      
      toast({
        title: '✅ Đã phê duyệt',
        description: `${contentIds.length} nội dung đã được duyệt thành công`,
        className: 'animate-success',
      });
    } catch (error) {
      console.error('Error bulk approving content:', error);
      toast({
        title: '❌ Lỗi phê duyệt',
        description: 'Không thể phê duyệt nội dung. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setApprovingContent(false);
    }
  };

  // Bulk reject content
  const bulkRejectContent = async (contentIds: string[], reason: string): Promise<void> => {
    setApprovingContent(true);
    try {
      const contentsToReject = contents.filter(c => contentIds.includes(c.id));
      
      const { error } = await supabase
        .from('multi_channel_contents')
        .update({ status: 'draft' })
        .in('id', contentIds);

      if (error) throw error;

      // Update local state
      setContents(prev => prev.map(c => 
        contentIds.includes(c.id) ? { ...c, status: 'draft' as ContentStatus } : c
      ));

      // Notify content creators with rejection reason
      if (currentOrganization && user) {
        const creatorIds = [...new Set(contentsToReject.map(c => c.user_id).filter(id => id && id !== user.id))];
        
        const notifications = creatorIds.map(creatorId => ({
          user_id: creatorId!,
          organization_id: currentOrganization.id,
          type: 'bulk_content_rejected',
          title: '❌ Nội dung bị từ chối',
          message: `${contentsToReject.filter(c => c.user_id === creatorId).length} nội dung đã bị từ chối. Lý do: ${reason}`,
          data: { content_ids: contentIds, reason },
        }));

        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications);
        }
      }
      
      toast({
        title: '📝 Đã từ chối',
        description: `${contentIds.length} nội dung đã được chuyển về nháp để chỉnh sửa`,
        className: 'animate-success',
      });
    } catch (error) {
      console.error('Error bulk rejecting content:', error);
      toast({
        title: '❌ Lỗi từ chối',
        description: 'Không thể từ chối nội dung. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setApprovingContent(false);
    }
  };

  useEffect(() => {
    fetchContents();
  }, [user, currentOrganization?.id]);

  // Expand channels - add new channels to existing content
  const [expandingChannels, setExpandingChannels] = useState(false);

  const expandChannels = async (contentId: string, newChannels: Channel[]): Promise<MultiChannelContent | null> => {
    setExpandingChannels(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-multichannel', {
        body: { action: 'expand', contentId, newChannels },
      });

      if (error) {
        throw new Error(error.message || 'Lỗi khi mở rộng kênh');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const updatedContent = transformContent(data);
      setContents(prev => prev.map(c => c.id === contentId ? updatedContent : c));
      
      toast({
        title: '✨ Đã thêm kênh mới',
        description: `Đã tạo nội dung cho ${newChannels.length} kênh mới`,
        className: 'animate-success',
      });

      return updatedContent;
    } catch (error) {
      console.error('Error expanding channels:', error);
      toast({
        title: '❌ Lỗi mở rộng kênh',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại sau',
        variant: 'destructive',
        className: 'animate-error-shake',
      });
      return null;
    } finally {
      setExpandingChannels(false);
    }
  };

  return {
    contents,
    loading,
    generating,
    regeneratingChannel,
    aiEditingChannel,
    approvingContent,
    expandingChannels,
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
    submitForReview,
    approveContent,
    rejectContent,
    bulkSubmitForReview,
    bulkApproveContent,
    bulkRejectContent,
    expandChannels,
    refetch: fetchContents,
    fetchContentDetail,
  };
}
