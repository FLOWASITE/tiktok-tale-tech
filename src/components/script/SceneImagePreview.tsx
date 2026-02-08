import { useState } from 'react';
import { StoryboardScene } from '@/types/storyboard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Loader2, RefreshCw, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SceneImagePreviewProps {
  scene: StoryboardScene;
  onImageGenerated?: (imageUrl: string) => void;
}

export function SceneImagePreview({ scene, onImageGenerated }: SceneImagePreviewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateSceneImage = async () => {
    setIsGenerating(true);
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'generate-scene-thumbnail',
        {
          body: { scene },
        }
      );

      if (functionError) {
        console.error('Function error:', functionError);
        
        if (functionError.message?.includes('429')) {
          setError('Giới hạn API. Vui lòng thử lại sau.');
        } else if (functionError.message?.includes('402')) {
          setError('Không đủ credits. Vui lòng nạp thêm.');
        } else {
          setError(functionError.message || 'Không thể tạo ảnh');
        }
        return;
      }

      if (data?.imageUrl) {
        setImageUrl(data.imageUrl);
        onImageGenerated?.(data.imageUrl);
      } else {
        setError('Không nhận được ảnh từ AI');
      }
    } catch (err) {
      console.error('Error generating scene image:', err);
      setError('Lỗi không xác định');
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  };

  if (imageUrl) {
    return (
      <Card className="overflow-hidden bg-muted/50 border-0">
        <div className="relative aspect-video bg-black overflow-hidden rounded-lg">
          <img
            src={imageUrl}
            alt={`Scene ${scene.sceneNumber} preview`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          
          {/* Scene info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-3 text-white space-y-1">
            <Badge variant="secondary" className="bg-black/50">
              Scene {scene.sceneNumber}
            </Badge>
            <p className="text-xs line-clamp-2 text-white/90">{scene.emotionalTone}</p>
          </div>

          {/* Regenerate button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={generateSceneImage}
            disabled={isGenerating}
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
          >
            {isGenerating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-3 bg-destructive/10 border-destructive/20">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-destructive font-medium">Lỗi</p>
            <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={generateSceneImage}
              disabled={isGenerating}
              className="mt-2 h-7 text-xs"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Thử lại
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <button
      onClick={generateSceneImage}
      disabled={isGenerating}
      className="w-full aspect-video bg-gradient-to-br from-muted/50 to-muted/30 border border-dashed rounded-lg cursor-pointer hover:bg-muted/40 transition-colors flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex flex-col items-center justify-center gap-2">
        {isLoading ? (
          <>
            <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
            <p className="text-xs text-muted-foreground">Đang tạo ảnh...</p>
          </>
        ) : (
          <>
            <Image className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
            <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors text-center px-2">
              Tạo AI Scene Thumbnail
            </p>
          </>
        )}
      </div>
    </button>
  );
}
