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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ScriptAnalyzerProps {
  script: Script;
  initialAnalysis?: ScriptAnalysis | null;
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

const EmotionalArcChart = ({ items }: { 
  items: { prompt: number; emotion: string; intensity: number }[] 
}) => {
  const safeItems = Array.isArray(items) ? items : [];

  const chartData = safeItems.map((item) => ({
    prompt: `P${item.prompt}`,
    intensity: item.intensity,
    emotion: item.emotion,
  }));

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="prompt" 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '11px' }}
          />
          <YAxis 
            domain={[0, 100]} 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '11px' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
            formatter={(value: number) => [`${value}%`, 'Intensity']}
            labelFormatter={(label) => `Prompt ${String(label).replace('P', '')}`}
          />
          <Line 
            type="monotone" 
            dataKey="intensity" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', r: 4 }}
            activeDot={{ r: 6 }}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
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
      <div className={cn("flex flex-col items-center justify-center py-6 gap-5", className)}>
        {/* IMPRESSIVE AI Analyzer Icon - Large & Eye-catching */}
        <div className="relative group cursor-pointer" onClick={handleAnalyze}>
          {/* Outer pulsing rings */}
          <div className="absolute inset-[-12px] rounded-full bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-cyan-500/20 blur-xl animate-pulse" />
          <div className="absolute inset-[-6px] rounded-full bg-gradient-to-r from-fuchsia-500/30 via-violet-500/30 to-cyan-500/30 blur-lg animate-pulse" style={{ animationDelay: '0.5s' }} />
          
          {/* Rotating gradient border */}
          <div className="absolute inset-[-3px] rounded-3xl bg-gradient-conic from-violet-600 via-fuchsia-500 via-cyan-400 via-violet-500 to-violet-600 animate-spin" style={{ animationDuration: '4s' }} />
          
          {/* Main icon container - LARGER */}
          <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-500 p-[3px] shadow-2xl shadow-fuchsia-500/40">
            <div className="w-full h-full rounded-3xl bg-gradient-to-br from-background via-background/98 to-background/95 backdrop-blur-xl flex items-center justify-center overflow-hidden">
              {/* Inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10" />
              
              {/* Central brain-like AI icon composition */}
              <div className="relative z-10">
                {/* Main sparkle - center */}
                <Sparkles className="w-12 h-12 text-fuchsia-500 drop-shadow-[0_0_12px_rgba(217,70,239,0.6)]" />
                
                {/* Orbiting elements */}
                <div className="absolute -top-3 -left-3 animate-bounce" style={{ animationDuration: '2s' }}>
                  <BarChart3 className="w-6 h-6 text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                </div>
                <div className="absolute -bottom-2 -right-3 animate-bounce" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }}>
                  <Zap className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                </div>
                <div className="absolute -top-2 -right-4 animate-bounce" style={{ animationDuration: '1.8s', animationDelay: '0.6s' }}>
                  <Target className="w-4 h-4 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Floating orbs */}
          <div className="absolute -top-3 -right-2 w-4 h-4 rounded-full bg-gradient-to-br from-fuchsia-400 to-violet-500 shadow-lg shadow-fuchsia-500/50 animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="absolute -bottom-2 -left-3 w-3 h-3 rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 shadow-lg shadow-cyan-500/50 animate-bounce" style={{ animationDelay: '0.4s' }} />
          <div className="absolute top-1/2 -right-4 w-2 h-2 rounded-full bg-gradient-to-br from-violet-400 to-cyan-400 shadow-lg animate-bounce" style={{ animationDelay: '0.7s' }} />
          
          {/* Hover effect overlay */}
          <div className="absolute inset-0 rounded-3xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        
        <div className="text-center space-y-2">
          <h3 className="font-bold text-lg bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
            AI Script Analyzer
          </h3>
          <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">
            Phân tích kịch bản với AI để nhận điểm số và gợi ý cải thiện chuyên sâu
          </p>
        </div>
        
        <Button 
          onClick={handleAnalyze} 
          disabled={isAnalyzing}
          className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 hover:from-violet-500 hover:via-fuchsia-400 hover:to-cyan-400 text-white shadow-lg shadow-fuchsia-500/30 hover:shadow-fuchsia-500/50 transition-all duration-300 hover:scale-105"
          size="default"
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
      <div className={cn("flex flex-col items-center justify-center py-6 gap-5", className)}>
        {/* Analyzing state - Large impressive icon */}
        <div className="relative">
          {/* Pulsing outer rings */}
          <div className="absolute inset-[-12px] rounded-full bg-gradient-to-r from-violet-500/30 via-fuchsia-500/30 to-cyan-500/30 blur-xl animate-pulse" />
          <div className="absolute inset-[-6px] rounded-full bg-gradient-to-r from-fuchsia-500/40 via-violet-500/40 to-cyan-500/40 blur-lg animate-pulse" style={{ animationDelay: '0.3s' }} />
          
          {/* Rotating border */}
          <div className="absolute inset-[-3px] rounded-3xl bg-gradient-conic from-violet-600 via-fuchsia-500 via-cyan-400 via-violet-500 to-violet-600 animate-spin" style={{ animationDuration: '2s' }} />
          
          {/* Main container */}
          <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-500 p-[3px] shadow-2xl shadow-fuchsia-500/50 animate-pulse">
            <div className="w-full h-full rounded-3xl bg-gradient-to-br from-background via-background/98 to-background/95 backdrop-blur-xl flex items-center justify-center">
              <RefreshCw className="w-12 h-12 text-fuchsia-500 animate-spin drop-shadow-[0_0_15px_rgba(217,70,239,0.7)]" />
            </div>
          </div>
          
          {/* Orbiting particles */}
          <div className="absolute -top-3 -right-2 w-4 h-4 rounded-full bg-gradient-to-br from-fuchsia-400 to-violet-500 shadow-lg shadow-fuchsia-500/50 animate-bounce" />
          <div className="absolute -bottom-2 -left-3 w-3 h-3 rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 shadow-lg shadow-cyan-500/50 animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
        
        <div className="text-center space-y-1">
          <p className="font-semibold bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent animate-pulse">
            Đang phân tích kịch bản...
          </p>
          <p className="text-xs text-muted-foreground">AI đang đánh giá nội dung của bạn</p>
        </div>
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

  const a: ScriptAnalysis = {
    ...analysis,
    strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
    weaknesses: Array.isArray(analysis.weaknesses) ? analysis.weaknesses : [],
    emotionalArc: Array.isArray(analysis.emotionalArc) ? analysis.emotionalArc : [],
    suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions : [],
  };

  const overallLabel = getOverallScoreLabel(a.overallScore);

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="space-y-4 p-1">
        {/* Overall Score */}
        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border border-border">
          <div className="text-4xl font-bold text-gradient mb-1">
            {a.overallScore}
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
            score={a.hookScore} 
            label="Hook" 
            icon={Eye}
            color="text-purple-500"
          />
          <ScoreCircle 
            score={a.clarityScore} 
            label="Rõ ràng" 
            icon={Target}
            color="text-blue-500"
          />
          <ScoreCircle 
            score={a.viralPotential} 
            label="Viral" 
            icon={TrendingUp}
            color="text-pink-500"
          />
          <ScoreCircle 
            score={a.pacingScore} 
            label="Nhịp điệu" 
            icon={Zap}
            color="text-yellow-500"
          />
          <ScoreCircle 
            score={a.ctaEffectiveness} 
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
              {a.strengths.map((strength, i) => (
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
              {a.weaknesses.map((weakness, i) => (
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
          
          {/* Visual Chart */}
          <div className="mb-3 bg-muted/30 rounded-lg p-2">
            <EmotionalArcChart items={a.emotionalArc} />
          </div>

          {/* Detail List */}
          <div className="space-y-2">
            {a.emotionalArc.map((item, i) => (
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
            {a.suggestions.map((suggestion, i) => (
              <SuggestionItem key={i} suggestion={suggestion} />
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
