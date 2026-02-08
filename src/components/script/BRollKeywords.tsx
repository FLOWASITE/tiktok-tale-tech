import { useState } from 'react';
import { StoryboardScene } from '@/types/storyboard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2, RefreshCw, Film, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BRollKeyword {
  keyword: string;
  category: 'stock_footage' | 'animation' | 'text_overlay' | 'effect' | 'music';
  searchTerm: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

interface BRollKeywordsProps {
  scene: StoryboardScene;
}

const categoryIcons: Record<string, string> = {
  stock_footage: '📹',
  animation: '✨',
  text_overlay: '📝',
  effect: '⚡',
  music: '🎵',
};

const categoryLabels: Record<string, string> = {
  stock_footage: 'Stock',
  animation: 'Animation',
  text_overlay: 'Text',
  effect: 'Effect',
  music: 'Music',
};

const categoryColors: Record<string, string> = {
  stock_footage: 'bg-blue-500/10 text-blue-700 border-blue-200',
  animation: 'bg-purple-500/10 text-purple-700 border-purple-200',
  text_overlay: 'bg-orange-500/10 text-orange-700 border-orange-200',
  effect: 'bg-pink-500/10 text-pink-700 border-pink-200',
  music: 'bg-green-500/10 text-green-700 border-green-200',
};

export function BRollKeywords({ scene }: BRollKeywordsProps) {
  const [keywords, setKeywords] = useState<BRollKeyword[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const extractKeywords = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'extract-broll-keywords',
        {
          body: { scene },
        }
      );

      if (functionError) {
        console.error('Function error:', functionError);
        
        if (functionError.message?.includes('429')) {
          setError('Giới hạn API. Vui lòng thử lại sau.');
        } else if (functionError.message?.includes('402')) {
          setError('Không đủ credits.');
        } else {
          setError(functionError.message || 'Không thể trích xuất keywords');
        }
        return;
      }

      if (data?.keywords) {
        setKeywords(data.keywords);
        setHasLoaded(true);
      }
    } catch (err) {
      console.error('Error extracting keywords:', err);
      setError('Lỗi không xác định');
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasLoaded) {
    return (
      <Card className="p-3 bg-muted/50 border-0 cursor-pointer hover:bg-muted/70 transition-colors group" onClick={extractKeywords}>
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Gợi ý B-Roll & Keywords
          </span>
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
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={extractKeywords}
              disabled={isLoading}
              className="mt-2 h-7 text-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Đang tìm...
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

  if (isLoading) {
    return (
      <Card className="p-3 bg-muted/50 border-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Đang tìm B-Roll suggestions...
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 bg-muted/50 border-0 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">B-Roll & Keywords</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={extractKeywords}
          disabled={isLoading}
          className="h-6 px-2 text-[10px]"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-2">
        {keywords.map((kw, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-start gap-2">
              <Badge
                variant="outline"
                className={`text-[10px] ${categoryColors[kw.category]} border`}
              >
                {categoryIcons[kw.category]} {categoryLabels[kw.category]}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{kw.keyword}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{kw.description}</p>
              </div>
              <a
                href={`https://www.pexels.com/search/${encodeURIComponent(kw.searchTerm)}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex-shrink-0 ml-1"
              >
                <Search className="h-3 w-3" />
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 text-xs text-muted-foreground pt-2 border-t">
        <a
          href="https://www.pexels.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Pexels
        </a>
        <span>•</span>
        <a
          href="https://pixabay.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Pixabay
        </a>
        <span>•</span>
        <a
          href="https://www.youtube.com/audiolibrary"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          YouTube Audio
        </a>
      </div>
    </Card>
  );
}
