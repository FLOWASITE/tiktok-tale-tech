import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type BackgroundEditType = 'remove' | 'solid_color' | 'gradient' | 'custom_scene' | 'refine_text';
export type GradientDirection = 'vertical' | 'horizontal' | 'diagonal';

export interface BackgroundEditParams {
  imageUrl: string;
  editType: BackgroundEditType;
  solidColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientDirection?: GradientDirection;
  customScenePrompt?: string;
  refineTextInstruction?: string;
  contentId?: string;
  channel?: string;
  organizationId?: string;
}

export interface BackgroundEditResult {
  success: boolean;
  imageUrl?: string;
  editType?: BackgroundEditType;
  message?: string;
  error?: string;
  errorCode?: string;
}

export function useBackgroundEditor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const editBackground = useCallback(async (params: BackgroundEditParams): Promise<BackgroundEditResult> => {
    setIsProcessing(true);
    setError(null);
    setPreviewUrl(null);

    try {
      console.log('[useBackgroundEditor] Starting edit:', params.editType);

      const { data, error: fnError } = await supabase.functions.invoke<BackgroundEditResult>(
        'edit-image-background',
        { body: params }
      );

      if (fnError) {
        console.error('[useBackgroundEditor] Function error:', fnError);
        const errorMessage = fnError.message || 'Không thể xử lý ảnh';
        setError(errorMessage);
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }

      if (!data?.success) {
        const errorMessage = data?.error || 'Xử lý ảnh thất bại';
        console.error('[useBackgroundEditor] Processing failed:', errorMessage);
        setError(errorMessage);
        
        // Show appropriate toast based on error code
        if (data?.errorCode === 'RATE_LIMIT') {
          toast.error('Đã vượt giới hạn. Vui lòng thử lại sau 1 phút.');
        } else if (data?.errorCode === 'PAYMENT_REQUIRED') {
          toast.error('Cần nạp thêm credits để tiếp tục.');
        } else {
          toast.error(errorMessage);
        }
        
        return { success: false, error: errorMessage, errorCode: data?.errorCode };
      }

      if (data.imageUrl) {
        setPreviewUrl(data.imageUrl);
        console.log('[useBackgroundEditor] Success:', data.editType);
        return { 
          success: true, 
          imageUrl: data.imageUrl,
          editType: data.editType,
          message: data.message
        };
      }

      setError('Không nhận được ảnh từ AI');
      return { success: false, error: 'Không nhận được ảnh từ AI' };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
      console.error('[useBackgroundEditor] Exception:', err);
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsProcessing(false);
    setError(null);
    setPreviewUrl(null);
  }, []);

  const clearPreview = useCallback(() => {
    setPreviewUrl(null);
  }, []);

  return {
    editBackground,
    isProcessing,
    error,
    previewUrl,
    reset,
    clearPreview,
    setPreviewUrl,
  };
}
