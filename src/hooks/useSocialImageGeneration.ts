import { useState, useCallback } from 'react';
import { Channel } from '@/types/multichannel';
import { invokeWithTimeout } from '@/lib/invokeEdgeFunctionWithTimeout';
import { IMAGE_GENERATION_TIMEOUT_MS } from '@/lib/imageGenerationConfig';
import { toast } from 'sonner';
import { CHANNEL_IMAGE_CONFIG } from '@/config/channelImageConfig';

export interface GeneratedChannelImage {
  channel: Channel;
  imageUrl: string;
  prompt: string;
  generatedAt: string;
  modelUsed?: string;
}

// Re-export types from image-prompt-builder for frontend use
export type ImageStylePreset = 'photorealistic' | 'illustration' | 'minimalist' | '3d_render' | 'flat_design' | 'watercolor' | 'cinematic' | 'abstract' | 'geometric' | 'isometric' | 'gradient' | 'product_only';

export const IMAGE_STYLE_PRESETS: Record<ImageStylePreset, {
  label: string;
  description: string;
}> = {
  photorealistic: {
    label: 'Ảnh thực',
    description: 'Chất lượng DSLR, ánh sáng tự nhiên',
  },
  illustration: {
    label: 'Minh họa',
    description: 'Digital illustration với màu sắc sống động',
  },
  minimalist: {
    label: 'Tối giản',
    description: 'Thiết kế sạch sẽ, đơn giản',
  },
  '3d_render': {
    label: '3D Render',
    description: 'Đồ họa 3D với chiều sâu',
  },
  flat_design: {
    label: 'Flat Design',
    description: 'Thiết kế phẳng với màu đơn sắc',
  },
  watercolor: {
    label: 'Màu nước',
    description: 'Phong cách tranh màu nước nghệ thuật',
  },
  cinematic: {
    label: 'Điện ảnh',
    description: 'Phong cách phim với ánh sáng dramatic',
  },
  abstract: {
    label: 'Trừu tượng',
    description: 'Nghệ thuật trừu tượng, hình khối sáng tạo',
  },
  geometric: {
    label: 'Hình học',
    description: 'Đồ họa hình học, shapes hiện đại',
  },
  isometric: {
    label: 'Isometric',
    description: 'Góc nhìn 3D isometric, phong cách tech',
  },
  gradient: {
    label: 'Gradient',
    description: 'Dải màu gradient mềm mại',
  },
  product_only: {
    label: 'Sản phẩm',
    description: 'Focus sản phẩm, không có người',
  },
};

export type LogoPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

// Content Role types (aligned with coreContent.ts)
export type ContentRole = 'seed' | 'sprout' | 'harvest';

// Prompt Mode for 3-layer architecture
export type PromptMode = 'full' | 'brand_only' | 'raw';

// Content Angle types
export type ContentAngle = 
  | 'educational' 
  | 'storytelling' 
  | 'promotional' 
  | 'social_proof' 
  | 'behind_the_scenes' 
  | 'qa_faq';

// NEW: Image Content Type - background only vs with text
export type ImageContentType = 'background_only' | 'with_text';

// NEW: Text positioning options
export type TextPosition = 'center' | 'top' | 'bottom' | 'top-left' | 'bottom-right';

// NEW: Typography style options
// With background: modern, classic, bold, minimal
// Without background (text-shadow only): clean, outline, glow
export type TypographyStyle = 'modern' | 'classic' | 'bold' | 'minimal' | 'clean' | 'outline' | 'glow';

interface GenerateImageParams {
  prompt: string;
  contentId?: string;
  channel?: Channel;
  aspectRatio?: string;
  organizationId?: string;
  // Enhanced params for generate-brand-image
  brandTemplateId: string;
  imageStylePreset?: ImageStylePreset;
  negativePrompt?: string;
  includeLogo?: boolean;
  logoPosition?: LogoPosition;
  // New: Strategic content params
  contentRole?: ContentRole;
  contentAngle?: ContentAngle;
  hookMessage?: string;
  hookType?: string;
  // NEW: Text-in-image params for Social Graphics
  imageContentType?: ImageContentType;
  textToInclude?: string;
  textPosition?: TextPosition;
  typographyStyle?: TypographyStyle;
  // Canvas fallback for 100% text accuracy
  useCanvasFallback?: boolean;
  // Prompt mode: full | brand_only | raw
  promptMode?: PromptMode;
}

export function useSocialImageGeneration() {
  const [generating, setGenerating] = useState<Channel | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<Channel, GeneratedChannelImage | null>>({} as Record<Channel, GeneratedChannelImage | null>);

  const generateImage = useCallback(async ({
    prompt,
    contentId,
    channel,
    aspectRatio = '1:1',
    brandTemplateId,
    imageStylePreset,
    negativePrompt,
    contentRole,
    contentAngle,
    hookMessage,
    hookType,
    // NEW: Text-in-image params
    imageContentType,
    textToInclude,
    textPosition,
    typographyStyle,
    useCanvasFallback,
    // Prompt mode
    promptMode,
  }: GenerateImageParams): Promise<string | null> => {
    if (channel) {
      setGenerating(channel);
    }

    try {
      console.log(`[useSocialImageGeneration] Generating for ${channel || 'generic'} via generate-brand-image`);
      console.log(`[useSocialImageGeneration] Image content type: ${imageContentType || 'background_only'}`);
      console.log(`[useSocialImageGeneration] Canvas fallback: ${useCanvasFallback}`);

      // Determine the effective image content type for AI generation
      // If useCanvasFallback is enabled with text, we generate background_only first
      const effectiveImageContentType = (useCanvasFallback && imageContentType === 'with_text') 
        ? 'background_only' 
        : imageContentType;

      // Call generate-brand-image with enhanced params
      const { data, error } = await invokeWithTimeout<any>('generate-brand-image', {
        body: {
          contentId,
          channel,
          contentSummary: prompt,
          brandTemplateId,
          aspectRatio,
          imageStylePreset,
          negativePrompt,
          contentRole,
          contentAngle,
          hookMessage,
          hookType,
          imageContentType: effectiveImageContentType,
          textToInclude: effectiveImageContentType === 'with_text' ? textToInclude : undefined,
          textPosition: effectiveImageContentType === 'with_text' ? textPosition : undefined,
          typographyStyle: effectiveImageContentType === 'with_text' ? typographyStyle : undefined,
          promptMode,
        },
        timeoutMs: IMAGE_GENERATION_TIMEOUT_MS,
      });

      if (error) {
        console.error('[useSocialImageGeneration] Function error:', error);
        
        if (error.message?.includes('429')) {
          toast.error('Đã vượt giới hạn API. Vui lòng thử lại sau.');
        } else if (error.message?.includes('402')) {
          toast.error('Hết credits. Vui lòng nạp thêm tại Settings → Workspace → Usage.');
        } else {
          toast.error(`Lỗi tạo ảnh: ${error.message}`);
        }
        return null;
      }

      if (!data?.success || !data?.imageUrl) {
        console.error('[useSocialImageGeneration] Generation failed:', data?.error);
        toast.error(data?.error || 'Không thể tạo ảnh');
        return null;
      }

      let imageUrl = data.imageUrl;
      const modelUsed: string = data.modelUsed || '';

      // Detect fallback and show warning toast
      if (modelUsed.includes('(fallback from')) {
        const fallbackMatch = modelUsed.match(/^(.+?)\s*\(fallback from (.+?)\)$/);
        if (fallbackMatch) {
          toast.warning(`Model "${fallbackMatch[2]}" thất bại`, {
            description: `Đã dùng "${fallbackMatch[1]}" thay thế`,
            duration: 8000,
          });
        }
      }

      // Step 2: Apply Canvas text overlay if enabled
      if (useCanvasFallback && imageContentType === 'with_text' && textToInclude) {
        console.log('[useSocialImageGeneration] Applying Canvas text overlay...');
        
        // Get dimensions from channel config
        const channelConfig = channel ? CHANNEL_IMAGE_CONFIG[channel] : null;
        const [widthStr, heightStr] = (channelConfig?.size || '1200x630').split('x');
        const imageWidth = parseInt(widthStr, 10) || 1200;
        const imageHeight = parseInt(heightStr, 10) || 630;

        const { data: overlayData, error: overlayError } = await invokeWithTimeout<any>('overlay-text-canvas', {
          body: {
            baseImageUrl: imageUrl,
            text: textToInclude,
            position: textPosition || 'center',
            typographyStyle: typographyStyle || 'modern',
            textColor: '#FFFFFF',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            contentId,
            channel,
            imageWidth,
            imageHeight,
          },
          timeoutMs: 30_000,
        });

        if (overlayError) {
          console.error('[useSocialImageGeneration] Canvas overlay error:', overlayError);
          // Continue with base image if overlay fails
          toast.warning('Text overlay failed, using base image');
        } else if (overlayData?.success && overlayData?.imageUrl) {
          console.log('[useSocialImageGeneration] Canvas overlay success!');
          imageUrl = overlayData.imageUrl;
        }
      }
      
      // Store generated image info
      if (channel) {
        setGeneratedImages(prev => ({
          ...prev,
          [channel]: {
            channel,
            imageUrl,
            prompt: data.prompt || prompt,
            generatedAt: new Date().toISOString(),
            modelUsed,
          },
        }));
      }

      toast.success('Đã tạo ảnh thành công!');
      return imageUrl;
    } catch (err) {
      console.error('[useSocialImageGeneration] Unexpected error:', err);
      toast.error('Lỗi không xác định khi tạo ảnh');
      return null;
    } finally {
      setGenerating(null);
    }
  }, []);

  const getImageForChannel = useCallback((channel: Channel): GeneratedChannelImage | null => {
    return generatedImages[channel] || null;
  }, [generatedImages]);

  const clearImageForChannel = useCallback((channel: Channel) => {
    setGeneratedImages(prev => {
      const newImages = { ...prev };
      delete newImages[channel];
      return newImages;
    });
  }, []);

  const clearAllImages = useCallback(() => {
    setGeneratedImages({} as Record<Channel, GeneratedChannelImage | null>);
  }, []);

  return {
    generating,
    generatedImages,
    generateImage,
    getImageForChannel,
    clearImageForChannel,
    clearAllImages,
  };
}
