import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GeneratedImage {
  slideNumber: number;
  imageUrl: string;
  generatedAt: string;
}

export function useImageGeneration() {
  const [generating, setGenerating] = useState<number | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  const generateImage = async (
    prompt: string,
    geminiApiKey: string,
    carouselId: string,
    slideNumber: number
  ): Promise<string | null> => {
    setGenerating(slideNumber);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-carousel-image', {
        body: {
          prompt,
          geminiApiKey,
          carouselId,
          slideNumber,
        },
      });

      if (error) {
        console.error('Error generating image:', error);
        if (error.message?.includes('429')) {
          toast.error('Đã vượt giới hạn API. Vui lòng thử lại sau.');
        } else if (error.message?.includes('401') || error.message?.includes('403')) {
          toast.error('API key không hợp lệ. Vui lòng kiểm tra lại.');
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
      return data.imageUrl;
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Lỗi không xác định khi tạo ảnh');
      return null;
    } finally {
      setGenerating(null);
    }
  };

  const setImages = (images: GeneratedImage[]) => {
    setGeneratedImages(images);
  };

  const clearImages = () => {
    setGeneratedImages([]);
  };

  const getImageForSlide = (slideNumber: number): GeneratedImage | undefined => {
    return generatedImages.find((img) => img.slideNumber === slideNumber);
  };

  return {
    generating,
    generatedImages,
    generateImage,
    setImages,
    clearImages,
    getImageForSlide,
  };
}
