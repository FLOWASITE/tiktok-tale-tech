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
        throw new Error(response.error.message || 'Failed to publish');
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
      toast({
        title: 'Đăng bài thất bại',
        description: error.message,
        variant: 'destructive',
      });
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
