import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Sparkles, 
  TrendingUp, 
  Eye, 
  Zap, 
  Target, 
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  RefreshCw
} from 'lucide-react';
import { Script } from '@/types/script';
import { useScriptAnalysis, ScriptAnalysis } from '@/hooks/useScriptAnalysis';
import { cn } from '@/lib/utils';

interface ScriptAnalyzerProps {
  script: Script;
  className?: string;
}

const ScoreCircle = ({ score, label, icon: Icon, color }: { 
  score: number; 
  label: string; 
  icon: React.ElementType;
  color: string;
}) => {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-500';
    if (s >= 60) return 'text-yellow-500';
    if (s >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={cn(
        "relative w-14 h-14 rounded-full flex items-center justify-center",
        "bg-gradient-to-br from-muted/50 to-muted border border-border"
      )}>
        <Icon className={cn("w-4 h-4 absolute top-1 right-1", color)} />
        <span className={cn("text-lg font-bold", getScoreColor(score))}>
          {score}
        </span>
      </div>
      <span className="text-xs text-muted-foreground text-center leading-tight">
        {label}
      </span>
    </div>
  );
};

const EmotionalArcItem = ({ item }: { 
  item: { prompt: number; emotion: string; intensity: number } 
}) => (
  <div className="flex items-center gap-2 text-xs">
    <Badge variant="outline" className="w-8 justify-center text-[10px]">
      P{item.prompt}
    </Badge>
    <span className="flex-1 text-muted-foreground">{item.emotion}</span>
    <div className="w-16">
      <Progress value={item.intensity} className="h-1.5" />
    </div>
    <span className="w-8 text-right text-muted-foreground">{item.intensity}%</span>
  </div>
);

const SuggestionItem = ({ suggestion }: { 
  suggestion: ScriptAnalysis['suggestions'][0] 
}) => {
  const priorityColors = {
    high: 'border-red-500/50 bg-red-500/5',
    medium: 'border-yellow-500/50 bg-yellow-500/5',
    low: 'border-blue-500/50 bg-blue-500/5',
  };

  const priorityLabels = {
    high: 'Quan trọng',
    medium: 'Nên làm',
    low: 'Gợi ý',
  };

  const typeLabels = {
    hook: 'Hook',
    clarity: 'Rõ ràng',
    pacing: 'Nhịp điệu',
    cta: 'CTA',
    engagement: 'Tương tác',
  };

  return (
    <div className={cn(
      "p-2.5 rounded-lg border",
      priorityColors[suggestion.priority]
    )}>
      <div className="flex items-center gap-2 mb-1.5">
        <Badge variant="outline" className="text-[10px]">
          {typeLabels[suggestion.type]}
        </Badge>
        {suggestion.promptNumber && (
          <Badge variant="secondary" className="text-[10px]">
            Prompt {suggestion.promptNumber}
          </Badge>
        )}
        <Badge 
          variant={suggestion.priority === 'high' ? 'destructive' : 'secondary'}
          className="text-[10px] ml-auto"
        >
          {priorityLabels[suggestion.priority]}
        </Badge>
      </div>
      <p className="text-xs text-foreground leading-relaxed">
        {suggestion.message}
      </p>
    </div>
  );
};

export function ScriptAnalyzer({ script, className }: ScriptAnalyzerProps) {
  const { analysis, isAnalyzing, error, analyzeScript, clearAnalysis } = useScriptAnalysis();
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const handleAnalyze = async () => {
    await analyzeScript(script);
    setHasAnalyzed(true);
  };

  const getOverallScoreLabel = (score: number) => {
    if (score >= 80) return { label: 'Xuất sắc', color: 'text-green-500' };
    if (score >= 70) return { label: 'Tốt', color: 'text-emerald-500' };
    if (score >= 60) return { label: 'Khá', color: 'text-yellow-500' };
    if (score >= 50) return { label: 'Trung bình', color: 'text-orange-500' };
    return { label: 'Cần cải thiện', color: 'text-red-500' };
  };

  if (!hasAnalyzed && !analysis) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8 gap-4", className)}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">AI Script Analyzer</h3>
          <p className="text-xs text-muted-foreground max-w-[200px]">
            Phân tích kịch bản với AI để nhận điểm số và gợi ý cải thiện
          </p>
        </div>
        <Button 
          onClick={handleAnalyze} 
          disabled={isAnalyzing}
          className="gradient-primary"
          size="sm"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Đang phân tích...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Phân tích ngay
            </>
          )}
        </Button>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8 gap-4", className)}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center animate-pulse">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Đang phân tích kịch bản...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8 gap-4", className)}>
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <div className="text-center">
          <p className="text-sm text-destructive mb-2">{error}</p>
          <Button variant="outline" size="sm" onClick={handleAnalyze}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const overallLabel = getOverallScoreLabel(analysis.overallScore);

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="space-y-4 p-1">
        {/* Overall Score */}
        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border border-border">
          <div className="text-4xl font-bold text-gradient mb-1">
            {analysis.overallScore}
          </div>
          <div className={cn("text-sm font-medium", overallLabel.color)}>
            {overallLabel.label}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleAnalyze}
            className="mt-2 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Phân tích lại
          </Button>
        </div>

        {/* Score Grid */}
        <div className="grid grid-cols-3 gap-2">
          <ScoreCircle 
            score={analysis.hookScore} 
            label="Hook" 
            icon={Eye}
            color="text-purple-500"
          />
          <ScoreCircle 
            score={analysis.clarityScore} 
            label="Rõ ràng" 
            icon={Target}
            color="text-blue-500"
          />
          <ScoreCircle 
            score={analysis.viralPotential} 
            label="Viral" 
            icon={TrendingUp}
            color="text-pink-500"
          />
          <ScoreCircle 
            score={analysis.pacingScore} 
            label="Nhịp điệu" 
            icon={Zap}
            color="text-yellow-500"
          />
          <ScoreCircle 
            score={analysis.ctaEffectiveness} 
            label="CTA" 
            icon={BarChart3}
            color="text-green-500"
          />
        </div>

        <Separator />

        {/* Strengths & Weaknesses */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium">Điểm mạnh</span>
            </div>
            <div className="space-y-1.5">
              {analysis.strengths.map((strength, i) => (
                <div key={i} className="text-xs text-muted-foreground pl-6 flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  {strength}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-medium">Cần cải thiện</span>
            </div>
            <div className="space-y-1.5">
              {analysis.weaknesses.map((weakness, i) => (
                <div key={i} className="text-xs text-muted-foreground pl-6 flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  {weakness}
                </div>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Emotional Arc */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium">Biểu đồ cảm xúc</span>
          </div>
          <div className="space-y-2">
            {analysis.emotionalArc.map((item, i) => (
              <EmotionalArcItem key={i} item={item} />
            ))}
          </div>
        </div>

        <Separator />

        {/* Suggestions */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            <span className="text-xs font-medium">Gợi ý cải thiện</span>
          </div>
          <div className="space-y-2">
            {analysis.suggestions.map((suggestion, i) => (
              <SuggestionItem key={i} suggestion={suggestion} />
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
