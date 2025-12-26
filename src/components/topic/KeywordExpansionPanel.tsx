import { useState } from 'react';
import { 
  Hash, RefreshCw, Sparkles, TrendingUp, Search,
  Flame, Target, Users, Copy, Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTopicIntelligence, KeywordExpansion } from '@/hooks/useTopicIntelligence';
import { TopicCreditsAlert } from './TopicCreditsAlert';
import { ContentGoal } from '@/types/multichannel';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface KeywordExpansionPanelProps {
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  onSelectKeyword: (keyword: string) => void;
}

const keywordCategories = [
  { key: 'lsiKeywords', label: 'LSI', icon: Search, description: 'Từ khóa liên quan ngữ nghĩa' },
  { key: 'trendingKeywords', label: 'Trending', icon: Flame, description: 'Đang hot trong ngành' },
  { key: 'longTailKeywords', label: 'Long-tail', icon: Target, description: 'Cụm từ dài, ít cạnh tranh' },
  { key: 'competitorKeywords', label: 'Competitor', icon: Users, description: 'Đối thủ có thể đang dùng' },
] as const;

export function KeywordExpansionPanel({
  brandTemplateId,
  contentGoal,
  onSelectKeyword,
}: KeywordExpansionPanelProps) {
  const [activeTab, setActiveTab] = useState<string>('lsiKeywords');
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);
  
  const { 
    keywords, 
    expandKeywords, 
    isLoading,
    error,
    errorCode,
  } = useTopicIntelligence({ brandTemplateId, contentGoal });

  const handleExpand = async () => {
    await expandKeywords();
  };

  const handleCopyKeyword = async (keyword: string) => {
    try {
      await navigator.clipboard.writeText(keyword);
      setCopiedKeyword(keyword);
      toast.success('Đã copy keyword');
      setTimeout(() => setCopiedKeyword(null), 2000);
    } catch {
      toast.error('Không thể copy');
    }
  };

  const getKeywordsByCategory = (category: string): string[] => {
    if (!keywords) return [];
    return keywords[category as keyof KeywordExpansion] as string[] || [];
  };

  const totalKeywords = keywords 
    ? keywordCategories.reduce((sum, cat) => sum + getKeywordsByCategory(cat.key).length, 0)
    : 0;

  const showCreditsError = errorCode === 'CREDITS_EXHAUSTED' || errorCode === 'RATE_LIMIT';

  return (
    <Card className="gradient-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <Hash className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Keyword Expansion</CardTitle>
              <CardDescription className="text-xs">
                Mở rộng từ khóa cho content
              </CardDescription>
            </div>
          </div>
          <Button 
            onClick={handleExpand} 
            disabled={isLoading}
            size="sm"
            className="gap-2"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {keywords ? 'Mở rộng lại' : 'Mở rộng'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10" />
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          </div>
        ) : showCreditsError ? (
          <TopicCreditsAlert 
            errorCode={errorCode || undefined} 
            errorMessage={error || undefined}
            onRetry={errorCode === 'RATE_LIMIT' ? handleExpand : undefined}
          />
        ) : !keywords ? (
          <div className="text-center py-8">
            <Hash className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              Mở rộng từ khóa dựa trên topics
            </p>
            <p className="text-xs text-muted-foreground">
              AI sẽ đề xuất LSI, trending, long-tail keywords
            </p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <span className="text-sm">Tổng keywords đề xuất</span>
              <Badge className="bg-emerald-500">{totalKeywords}</Badge>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-4 h-auto gap-1 bg-muted/50 p-1">
                {keywordCategories.map(cat => {
                  const Icon = cat.icon;
                  const count = getKeywordsByCategory(cat.key).length;
                  return (
                    <TabsTrigger 
                      key={cat.key} 
                      value={cat.key}
                      className="text-xs py-1.5 px-2 flex items-center gap-1"
                    >
                      <Icon className="w-3 h-3" />
                      <span className="hidden sm:inline">{cat.label}</span>
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-auto">
                        {count}
                      </Badge>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {keywordCategories.map(cat => (
                <TabsContent key={cat.key} value={cat.key} className="mt-3">
                  <p className="text-xs text-muted-foreground mb-3">
                    {cat.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {getKeywordsByCategory(cat.key).map((keyword, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className={cn(
                          'text-xs py-1 px-2 cursor-pointer transition-all',
                          'hover:bg-primary hover:text-primary-foreground hover:border-primary',
                          'group flex items-center gap-1.5'
                        )}
                        onClick={() => onSelectKeyword(keyword)}
                      >
                        {keyword}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyKeyword(keyword);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {copiedKeyword === keyword ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </Badge>
                    ))}
                    {getKeywordsByCategory(cat.key).length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Không có keywords trong danh mục này
                      </p>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {/* Keyword Clusters */}
            {keywords.keywordClusters && keywords.keywordClusters.length > 0 && (
              <div className="pt-3 border-t border-border/50">
                <p className="text-xs font-medium mb-2 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Keyword Clusters
                </p>
                <div className="space-y-2">
                  {keywords.keywordClusters.map((cluster, i) => (
                    <div key={i} className="p-2 rounded-lg bg-muted/30">
                      <p className="text-xs font-medium mb-1">{cluster.theme}</p>
                      <div className="flex flex-wrap gap-1">
                        {cluster.keywords.map((kw, j) => (
                          <Badge 
                            key={j} 
                            variant="secondary" 
                            className="text-[10px] cursor-pointer hover:bg-primary/20"
                            onClick={() => onSelectKeyword(kw)}
                          >
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
