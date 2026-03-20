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
          seamlessContext: options?.seamlessContext,
        },
        timeoutMs: 150_000,
      });
      const error = invokeError;

      if (error) {
        console.error('Error generating image:', error);
        if (error.message?.includes('429')) {
          toast.error('Đã vượt giới hạn API. Vui lòng thử lại sau.');
        } else if (error.message?.includes('CREDITS_EXHAUSTED')) {
          toast.error('Đã hết credits AI. Vui lòng nâng cấp hoặc chờ reset.');
        } else if (error.message?.includes('CONNECTION_ERROR') || error.message?.includes('502')) {
          toast.error('Kết nối AI bị gián đoạn. Hệ thống sẽ tự retry.');
        } else {
          toast.error('Không thể tạo ảnh: ' + error.message);
        }
        return null;
      }

      if (data?.error) {
        toast.error(data.error);
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
