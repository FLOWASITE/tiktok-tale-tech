import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SocialPlatform } from './useSocialConnections';

interface PublishResult {
  success: boolean;
  platform: SocialPlatform;
  postId?: string;
  postUrl?: string;
  error?: string;
}

export interface PublishOptions {
  connectionId: string;
  contentId?: string;
  content: string;
  mediaUrls?: string[];
  linkUrl?: string;
  scheduleId?: string;
  articleData?: {
    title: string;
    description: string;
    coverUrl?: string;
  };
  blogData?: {
    title: string;
    excerpt?: string;
    slug?: string;
    category?: string;
    tags?: string[];
    isPublic?: boolean;
  };
}

export function useDirectPublish() {
  const { toast } = useToast();

  const publishMutation = useMutation({
    mutationFn: async ({
      platform,
      options,
    }: {
      platform: SocialPlatform;
      options: PublishOptions;
    }): Promise<PublishResult> => {
      // Map platform to channel-publisher action
      const PLATFORM_ACTION_MAP: Record<string, string> = {
        'zalo_oa': 'zalo',
        'google_business': 'google-business',
        'tiktok': 'tiktok',
      };
      const action = PLATFORM_ACTION_MAP[platform] || platform;
      
      console.log(`Publishing to ${platform} via channel-publisher...`, options);

      const response = await supabase.functions.invoke('channel-publisher', {
        body: { action, ...options },
      });

      if (response.error) {
        let errorMessage = response.error.message || 'Failed to publish';
        let errorCode: string | undefined;

        const maybeContext = (response.error as { context?: Response } | null)?.context;
        if (maybeContext instanceof Response) {
          try {
            const payload = await maybeContext.clone().json();
            if (payload?.error) {
              errorMessage = String(payload.error);
            }
            if (payload?.errorCode) {
              errorCode = String(payload.errorCode);
            }
          } catch {
            // Keep fallback message from response.error.message
          }
        }

        const err = new Error(errorMessage);
        if (errorCode) {
          (err as any).errorCode = errorCode;
        }
        throw err;
      }

      if (!response.data?.success) {
        const err = new Error(response.data?.error || 'Failed to publish');
        (err as any).errorCode = response.data?.errorCode;
        throw err;
      }

      // Support both nested (data.data.postId) and flat (data.postId) response formats
      const resultData = response.data.data || response.data;

      return {
        success: true,
        platform,
        postId: resultData.tweetId || resultData.postId,
        postUrl: resultData.tweetUrl || resultData.postUrl,
      };
    },
    onSuccess: (result) => {
      const message = result.postUrl 
        ? `Đã đăng lên ${result.platform}. Xem bài đăng tại ${result.postUrl}`
        : `Đã đăng lên ${result.platform}`;
      
      toast({
        title: 'Đăng bài thành công! 🎉',
        description: message,
      });
    },
    onError: (error: Error) => {
      const errorCode = (error as any).errorCode;
      const isOaTierLimited = errorCode === 'OA_TIER_LIMITED' || error.message?.includes('upgrade OA Tier');
      const isMissingCover = errorCode === 'MISSING_COVER_IMAGE';
      const isMediaProcessing = errorCode === 'MEDIA_PROCESSING';
      const isTikTokUnauditedPrivateOnly =
        errorCode === 'TIKTOK_UNAUDITED_PRIVATE_ONLY' ||
        error.message?.includes('unaudited_client_can_only_post_to_private_accounts');
      
      if (isMediaProcessing) {
        toast({
          title: 'Zalo đang xử lý ảnh',
          description: 'Ảnh bìa đang được xử lý. Vui lòng thử lại sau 1-2 phút.',
          variant: 'destructive',
        });
      } else if (isTikTokUnauditedPrivateOnly) {
        toast({
          title: 'TikTok chưa cho đăng công khai',
          description: 'Ứng dụng TikTok hiện chỉ được đăng lên tài khoản riêng tư. Hãy chuyển tài khoản sang private hoặc hoàn tất TikTok app review.',
          variant: 'destructive',
        });
      } else if (isMissingCover) {
        toast({
          title: 'Zalo OA: Thiếu ảnh bìa',
          description: 'Zalo OA yêu cầu ảnh bìa để đăng bài viết. Vui lòng thêm ảnh cho bài viết.',
          variant: 'destructive',
        });
      } else if (isOaTierLimited) {
        toast({
          title: 'Zalo OA: Gói cơ bản không hỗ trợ',
          description: 'Zalo OA đang dùng gói Cơ bản, không hỗ trợ đăng bài qua API. Nâng cấp tại oa.zalo.me/home/pricing',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Đăng bài thất bại',
          description: error.message,
          variant: 'destructive',
        });
      }
    },
  });

  const publishToTwitter = async (options: PublishOptions) => {
    return publishMutation.mutateAsync({
      platform: 'twitter',
      options,
    });
  };

  const publishToFacebook = async (options: PublishOptions) => {
    return publishMutation.mutateAsync({
      platform: 'facebook',
      options,
    });
  };

  const publishToInstagram = async (options: PublishOptions) => {
    return publishMutation.mutateAsync({
      platform: 'instagram',
      options,
    });
  };

  const publishToZaloOA = async (options: PublishOptions) => {
    return publishMutation.mutateAsync({
      platform: 'zalo_oa',
      options,
    });
  };

  const publishToLinkedIn = async (options: PublishOptions) => {
    return publishMutation.mutateAsync({
      platform: 'linkedin',
      options,
    });
  };

  const publishToTikTok = async (options: PublishOptions) => {
    return publishMutation.mutateAsync({
      platform: 'tiktok',
      options,
    });
  };

  const publishToBlog = async (options: PublishOptions & { isPublic?: boolean }) => {
    const action = options.isPublic ? 'flowa_blog' : 'blog';
    const response = await supabase.functions.invoke('channel-publisher', {
      body: {
        action,
        connectionId: options.connectionId,
        contentId: options.contentId,
        content: options.content,
        title: options.blogData?.title || 'Bài viết mới',
        excerpt: options.blogData?.excerpt,
        slug: options.blogData?.slug,
        category: options.blogData?.category,
        tags: options.blogData?.tags,
        cover_image: options.mediaUrls?.[0] || null,
        mediaUrls: options.mediaUrls,
        status: 'published',
        is_public: !!options.isPublic,
      },
    });

    if (response.error) {
      const maybeContext = (response.error as { context?: Response } | null)?.context;
      let errorMessage = response.error.message || 'Failed to publish blog';
      if (maybeContext instanceof Response) {
        try {
          const payload = await maybeContext.clone().json();
          if (payload?.error) errorMessage = String(payload.error);
        } catch { /* keep fallback */ }
      }
      throw new Error(errorMessage);
    }

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Failed to publish blog');
    }

    const resultData = response.data.data || response.data;

    toast({
      title: 'Đăng blog thành công! 🎉',
      description: options.isPublic 
        ? 'Bài viết đã xuất hiện trên flowa.vn/blog'
        : 'Bài viết đã được lưu vào blog nội bộ',
    });

    return {
      success: true,
      platform: 'website' as SocialPlatform,
      postId: resultData.postId || resultData.id,
      postUrl: resultData.postUrl || (resultData.slug ? `/blog/${resultData.slug}` : undefined),
    };
  };

  return {
    publishToTwitter,
    publishToFacebook,
    publishToInstagram,
    publishToZaloOA,
    publishToLinkedIn,
    publishToTikTok,
    publishToBlog,
    isPublishing: publishMutation.isPending,
    publishResult: publishMutation.data,
    publishError: publishMutation.error,
  };
}
