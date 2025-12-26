import { useState } from 'react';
import { 
  Wand2, RefreshCw, Sparkles, ArrowRight, 
  Target, Star, Check, Copy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useTopicIntelligence, TopicRefinement } from '@/hooks/useTopicIntelligence';
import { ContentGoal } from '@/types/multichannel';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TopicRefinerProps {
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  initialTopic?: string;
  onSelectRefinedTopic: (topic: string) => void;
}

export function TopicRefiner({
  brandTemplateId,
  contentGoal,
  initialTopic = '',
  onSelectRefinedTopic,
}: TopicRefinerProps) {
  const [topicInput, setTopicInput] = useState(initialTopic);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  
  const { 
    refinement, 
    refineTopic, 
    isLoading 
  } = useTopicIntelligence({ brandTemplateId, contentGoal });

  const handleRefine = async () => {
    if (!topicInput.trim()) {
      toast.error('Vui lòng nhập topic cần tinh chỉnh');
      return;
    }
    await refineTopic(topicInput);
  };

  const handleSelectVersion = (topic: string) => {
    setSelectedVersion(topic);
    onSelectRefinedTopic(topic);
  };

  const handleCopyTopic = async (topic: string) => {
    try {
      await navigator.clipboard.writeText(topic);
      toast.success('Đã copy topic');
    } catch {
      toast.error('Không thể copy');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <Card className="gradient-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-base">Topic Refiner</CardTitle>
            <CardDescription className="text-xs">
              Tinh chỉnh & cải thiện topic với AI
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Nhập topic cần tinh chỉnh..."
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRefine();
            }}
          />
          <Button 
            onClick={handleRefine} 
            disabled={isLoading || !topicInput.trim()}
            className="gap-2"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Tinh chỉnh
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : refinement ? (
          <>
            {/* Original Topic */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Topic gốc:</p>
              <p className="text-sm font-medium">{refinement.original}</p>
            </div>

            {/* Refined Versions */}
            <div className="space-y-3">
              <p className="text-xs font-medium flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                Phiên bản cải thiện
              </p>
              
              {refinement.refinedVersions.map((version, index) => {
                const isSelected = selectedVersion === version.topic;
                const isBestChoice = version.topic === refinement.bestChoice;
                
                return (
                  <div
                    key={index}
                    className={cn(
                      'p-3 rounded-lg border transition-all cursor-pointer group',
                      'hover:border-primary/50 hover:bg-primary/5',
                      isSelected && 'border-primary bg-primary/10 ring-1 ring-primary/20',
                      isBestChoice && !isSelected && 'border-amber-500/50 bg-amber-500/5'
                    )}
                    onClick={() => handleSelectVersion(version.topic)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
                        isSelected ? 'bg-primary text-primary-foreground' :
                        isBestChoice ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
                      )}>
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : index + 1}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{version.topic}</p>
                          {isBestChoice && (
                            <Badge className="bg-amber-500 text-white text-[10px] shrink-0">
                              Best
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">Cải thiện:</span> {version.improvement}
                        </p>
                        
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span className="font-medium">Góc nhìn:</span> {version.angle}
                        </p>

                        {/* Brand Fit Score */}
                        <div className="flex items-center gap-2 mt-2">
                          <Target className="w-3.5 h-3.5 text-muted-foreground" />
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={cn('h-full rounded-full', getScoreBarColor(version.brandFitScore))}
                              style={{ width: `${version.brandFitScore}%` }}
                            />
                          </div>
                          <span className={cn('text-xs font-medium', getScoreColor(version.brandFitScore))}>
                            {version.brandFitScore}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyTopic(version.topic);
                        }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reasoning */}
            {refinement.reasoning && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Lý do chọn
                </p>
                <p className="text-sm">{refinement.reasoning}</p>
              </div>
            )}

            {/* Use Button */}
            {selectedVersion && (
              <Button 
                className="w-full gap-2"
                onClick={() => onSelectRefinedTopic(selectedVersion)}
              >
                Sử dụng topic đã chọn
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <Wand2 className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Nhập topic để AI đề xuất phiên bản tốt hơn
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
