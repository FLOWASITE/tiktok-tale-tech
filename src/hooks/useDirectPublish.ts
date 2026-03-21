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
      // Map platform names to actual edge function names
      const PLATFORM_FUNCTION_MAP: Record<string, string> = {
        'zalo_oa': 'publish-zalo',
      };
      const functionName = PLATFORM_FUNCTION_MAP[platform] || `publish-${platform}`;
      
      console.log(`Publishing to ${platform}...`, options);

      const response = await supabase.functions.invoke(functionName, {
        body: options,
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
      
      if (isMediaProcessing) {
        toast({
          title: 'Zalo đang xử lý ảnh',
          description: 'Ảnh bìa đang được xử lý. Vui lòng thử lại sau 1-2 phút.',
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

  const publishToInstagram = async (_options: PublishOptions) => {
    toast({
      title: 'Chưa hỗ trợ',
      description: 'Instagram sẽ được hỗ trợ trong phiên bản tiếp theo',
      variant: 'destructive',
    });
    throw new Error('Instagram not yet supported');
  };

  const publishToZaloOA = async (options: PublishOptions) => {
    return publishMutation.mutateAsync({
      platform: 'zalo_oa',
      options,
    });
  };

  return {
    publishToTwitter,
    publishToFacebook,
    publishToInstagram,
    publishToZaloOA,
    isPublishing: publishMutation.isPending,
    publishResult: publishMutation.data,
    publishError: publishMutation.error,
  };
}
