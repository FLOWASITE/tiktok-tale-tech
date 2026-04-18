import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invokeWithTimeout } from '@/lib/invokeEdgeFunctionWithTimeout';
import { toast } from 'sonner';

export interface GeneratedImage {
  slideNumber: number;
  imageUrl: string;
  generatedAt: string;
}

export interface GenerateImageResult {
  imageUrl: string;
  sceneDescription?: string | null;
  modelUsed?: string | null;
}

export function useImageGeneration() {
  const [generating, setGenerating] = useState<number | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  const generateImage = useCallback(async (
    prompt: string,
    carouselId: string,
    slideNumber: number,
    options?: {
      textContent?: unknown;
      platform?: string;
      brandColors?: { textColor?: string; backgroundColor?: string };
      carouselStyle?: string;
      totalSlides?: number;
      slideObjective?: string;
      visualPreset?: string;
      carouselTopic?: string;
      previousImageUrl?: string | null;
      seamlessContext?: {
        colorPalette: string[] | null;
        previousSceneDescription: string | null;
        siblingSlidesSummary?: string | null;
        sequencePosition: number;
        totalInSequence: number;
      };
    }
  ): Promise<GenerateImageResult | null> => {
    setGenerating(slideNumber);
    
    try {
      // Use carouselId as the trace correlation key — propagates across
      // generate-carousel → generate-carousel-image so a 7-slide carousel
      // becomes 1 traceable session in logs.
      const { data, error: invokeError } = await invokeWithTimeout<any>('generate-carousel-image', {
        body: {
          prompt,
          carouselId,
          slideNumber,
          textContent: options?.textContent,
          platform: options?.platform,
          brandColors: options?.brandColors,
          carouselStyle: options?.carouselStyle,
          totalSlides: options?.totalSlides,
          slideObjective: options?.slideObjective,
          visualPreset: options?.visualPreset,
          carouselTopic: options?.carouselTopic,
          previousImageUrl: options?.previousImageUrl ?? null,
          seamlessContext: options?.seamlessContext,
          traceId: carouselId,
        },
        timeoutMs: 150_000,
      });
      const error = invokeError;

      if (error) {
        console.error('Error generating image:', error);
        // Try to extract embedded CREDITS_EXHAUSTED from the 402 body the
        // edge function returns (supabase-js packs it into error.context.body).
        let embeddedCode: string | undefined;
        let embeddedMsg: string | undefined;
        try {
          const ctxBody = (error as any)?.context?.body;
          if (typeof ctxBody === 'string' && ctxBody.trim()) {
            const parsed = JSON.parse(ctxBody);
            embeddedCode = parsed?.errorCode;
            embeddedMsg = parsed?.error;
          }
        } catch { /* ignore non-JSON */ }

        if (embeddedCode === 'CREDITS_EXHAUSTED' || error.message?.includes('CREDITS_EXHAUSTED')) {
          toast.error(embeddedMsg || 'Provider ảnh hết credits. Vui lòng nạp thêm hoặc thử lại sau.');
        } else if (error.message?.includes('429')) {
          toast.error('Đã vượt giới hạn API. Vui lòng thử lại sau.');
        } else if (error.message?.includes('CONNECTION_ERROR') || error.message?.includes('502')) {
          toast.error('Kết nối AI bị gián đoạn. Hệ thống sẽ tự retry.');
        } else {
          toast.error('Không thể tạo ảnh: ' + (embeddedMsg || error.message));
        }
        return null;
      }

      if (data?.error) {
        if (data?.errorCode === 'CREDITS_EXHAUSTED') {
          toast.error('Provider ảnh hết credits. Vui lòng nạp thêm hoặc thử lại sau.');
        } else {
          toast.error(data.error);
        }
        return null;
      }

      const newImage: GeneratedImage = {
        slideNumber,
        imageUrl: data.imageUrl,
        generatedAt: new Date().toISOString(),
      };

      setGeneratedImages((prev) => {
        const filtered = prev.filter((img) => img.slideNumber !== slideNumber);
        return [...filtered, newImage].sort((a, b) => a.slideNumber - b.slideNumber);
      });

      toast.success(`Đã tạo ảnh slide ${slideNumber}!`);
      return { imageUrl: data.imageUrl, sceneDescription: data.sceneDescription || null, modelUsed: data.modelUsed || null };
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Lỗi không xác định khi tạo ảnh');
      return null;
    } finally {
      setGenerating(null);
    }
  }, []);

  const setImages = (images: GeneratedImage[]) => {
    setGeneratedImages(images);
  };

  const clearImages = () => {
    setGeneratedImages([]);
  };

  const getImageForSlide = (slideNumber: number): GeneratedImage | undefined => {
    return generatedImages.find((img) => img.slideNumber === slideNumber);
  };

  const deleteImage = async (
    slideNumber: number,
    carouselId: string
  ): Promise<boolean> => {
    const image = getImageForSlide(slideNumber);
    if (!image) {
      toast.error('Không tìm thấy ảnh để xóa');
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('delete-carousel-image', {
        body: {
          imageUrl: image.imageUrl,
          carouselId,
          slideNumber,
        },
      });

      if (error) {
        console.error('Error deleting image:', error);
        toast.error('Không thể xóa ảnh: ' + error.message);
        return false;
      }

      if (data?.error) {
        toast.error(data.error);
        return false;
      }

      // Remove from local state
      setGeneratedImages((prev) =>
        prev.filter((img) => img.slideNumber !== slideNumber)
      );

      toast.success(`Đã xóa ảnh slide ${slideNumber}`);
      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Lỗi không xác định khi xóa ảnh');
      return false;
    }
  };

  return {
    generating,
    generatedImages,
    generateImage,
    setImages,
    clearImages,
    getImageForSlide,
    deleteImage,
  };
}
