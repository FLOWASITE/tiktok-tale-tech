import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, 
  TrendingUp, 
  Eye, 
  Zap, 
  Target, 
  BarChart3,
  AlertCircle,
  Lightbulb,
  RefreshCw,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Wand2,
  Check,
  X as XIcon,
} from 'lucide-react';
import { Script } from '@/types/script';
import { useScriptAnalysis, ScriptAnalysis } from '@/hooks/useScriptAnalysis';
import { useScriptImprovement } from '@/hooks/useScriptImprovement';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ScriptAnalyzerProps {
  script: Script;
  initialAnalysis?: ScriptAnalysis | null;
  onScriptUpdate?: (updatedScript: Script) => void;
  className?: string;
}

/* ───────── Score Ring ───────── */
const ScoreRing = ({ score, label, description, icon: Icon, size = 64 }: { 
  score: number; 
  label: string;
  description?: string;
  icon: React.ElementType;
  size?: number;
}) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return 'hsl(var(--primary))';
    if (s >= 60) return 'hsl(var(--secondary))';
    if (s >= 40) return 'hsl(38, 92%, 50%)';
    return 'hsl(var(--destructive))';
  };

  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-card/50 border border-border/40 hover:border-border/80 transition-colors">
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={3}
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={getColor(score)}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold text-foreground tabular-nums">{score}</span>
        </div>
      </div>
      <div className="text-center space-y-0.5">
        <div className="flex items-center justify-center gap-1 text-[11px] text-foreground/80 font-medium tracking-wide">
          <Icon className="w-3 h-3 text-muted-foreground" />
          {label}
        </div>
        {description && (
          <p className="text-[9px] text-muted-foreground leading-tight">{description}</p>
        )}
      </div>
    </div>
  );
};

/* ───────── Emotional Arc Chart ───────── */
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
    <div className="w-full h-44">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="arcGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="prompt" 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '10px' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            domain={[0, 100]} 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '10px' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '12px',
              fontSize: '12px',
              boxShadow: '0 4px 20px -4px hsl(var(--foreground) / 0.08)',
            }}
            formatter={(value: number, _name: string, props: any) => [
              `${value}% — ${props.payload.emotion}`,
              'Cảm xúc'
            ]}
            labelFormatter={(label) => `Prompt ${String(label).replace('P', '')}`}
          />
          <Area
            type="monotone"
            dataKey="intensity"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#arcGradient)"
            dot={{ fill: 'hsl(var(--primary))', r: 3.5, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ───────── Suggestion Card ───────── */
const SuggestionCard = ({ suggestion }: { 
  suggestion: ScriptAnalysis['suggestions'][0] 
}) => {
  const priorityConfig: Record<string, { bg: string; border: string; dot: string; label: string }> = {
    high: { bg: 'bg-destructive/[0.04]', border: 'border-destructive/20', dot: 'bg-destructive', label: 'Quan trọng' },
    medium: { bg: 'bg-secondary/[0.04]', border: 'border-secondary/20', dot: 'bg-secondary', label: 'Nên làm' },
    low: { bg: 'bg-muted/50', border: 'border-border', dot: 'bg-muted-foreground', label: 'Gợi ý' },
  };

  const typeIcons: Record<string, React.ElementType> = {
    hook: Eye,
    clarity: Target,
    pacing: Zap,
    cta: BarChart3,
    engagement: TrendingUp,
  };

  const defaultConfig = { bg: 'bg-muted/50', border: 'border-border', dot: 'bg-muted-foreground', label: suggestion.priority || 'Gợi ý' };
  const config = priorityConfig[suggestion.priority] || defaultConfig;
  const TypeIcon = typeIcons[suggestion.type] || Lightbulb;

  return (
    <div className={cn(
      "p-4 rounded-2xl border transition-colors",
      config.bg, config.border
    )}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/50 shrink-0">
          <TypeIcon className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              {config.label}
            </span>
            {suggestion.promptNumber && (
              <span className="text-[10px] text-muted-foreground/60">
                · P{suggestion.promptNumber}
              </span>
            )}
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {suggestion.message}
          </p>
        </div>
      </div>
    </div>
  );
};

/* ───────── Main Component ───────── */
export function ScriptAnalyzer({ script, initialAnalysis, className }: ScriptAnalyzerProps) {
  const { analysis, isAnalyzing, error, analyzeScript, setInitialAnalysis, clearAnalysis } = useScriptAnalysis();
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  useEffect(() => {
    if (initialAnalysis && !analysis) {
      setInitialAnalysis(initialAnalysis);
      setHasAnalyzed(true);
    }
  }, [initialAnalysis]);

  const handleAnalyze = async () => {
    await analyzeScript(script);
    setHasAnalyzed(true);
  };

  const getOverallGrade = (score: number) => {
    if (score >= 90) return { grade: 'A+', label: 'Xuất sắc', color: 'text-primary' };
    if (score >= 80) return { grade: 'A', label: 'Rất tốt', color: 'text-primary' };
    if (score >= 70) return { grade: 'B+', label: 'Tốt', color: 'text-secondary' };
    if (score >= 60) return { grade: 'B', label: 'Khá', color: 'text-secondary' };
    if (score >= 50) return { grade: 'C', label: 'Trung bình', color: 'text-muted-foreground' };
    return { grade: 'D', label: 'Cần cải thiện', color: 'text-destructive' };
  };

  /* ── Empty State ── */
  if (!hasAnalyzed && !analysis) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 gap-8", className)}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative"
        >
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-primary/70" />
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
            <BarChart3 className="w-3.5 h-3.5 text-secondary" />
          </div>
        </motion.div>
        
        <div className="text-center space-y-2">
          <h3 className="font-semibold text-base text-foreground">
            Phân tích kịch bản
          </h3>
          <p className="text-sm text-muted-foreground max-w-[260px] leading-relaxed">
            AI đánh giá chất lượng hook, nhịp điệu, CTA và đưa ra gợi ý cải thiện
          </p>
        </div>
        
        <Button 
          onClick={handleAnalyze} 
          disabled={isAnalyzing}
          className="rounded-xl gap-2 px-6 h-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Đang phân tích…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Phân tích ngay
            </>
          )}
        </Button>
      </div>
    );
  }

  /* ── Loading State ── */
  if (isAnalyzing) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-16 gap-6", className)}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 flex items-center justify-center"
        >
          <Sparkles className="w-8 h-8 text-primary" />
        </motion.div>
        <div className="text-center space-y-1.5">
          <p className="text-base font-medium text-foreground">
            Đang phân tích…
          </p>
          <p className="text-sm text-muted-foreground">AI đang đánh giá kịch bản</p>
        </div>
      </div>
    );
  }

  /* ── Error State ── */
  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 gap-5", className)}>
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-destructive" />
        </div>
        <div className="text-center space-y-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={handleAnalyze} className="rounded-xl gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
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

  const grade = getOverallGrade(a.overallScore);

  /* ── Results ── */
  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="space-y-6 p-1">
        {/* Overall Score Hero */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/[0.06] via-background to-secondary/[0.06] border border-border/50 p-6"
        >
          {/* Decorative radial */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-primary/[0.08] to-transparent rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
                Điểm tổng thể
              </p>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold text-foreground tabular-nums leading-none">
                  {a.overallScore}
                </span>
                <div className="flex flex-col">
                  <span className={cn("text-xl font-bold leading-none", grade.color)}>
                    {grade.grade}
                  </span>
                  <span className={cn("text-xs mt-0.5", grade.color)}>
                    {grade.label}
                  </span>
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="rounded-xl text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isAnalyzing && "animate-spin")} />
              Phân tích lại
            </Button>
          </div>
        </motion.div>

        {/* Score Grid — 3 + 2 layout */}
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <ScoreRing score={a.hookScore} label="Hook" description="3s đầu tiên" icon={Eye} size={64} />
            <ScoreRing score={a.clarityScore} label="Clarity" description="Rõ ràng" icon={Target} size={64} />
            <ScoreRing score={a.viralPotential} label="Viral" description="Tiềm năng" icon={TrendingUp} size={64} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ScoreRing score={a.pacingScore} label="Pace" description="Nhịp điệu" icon={Zap} size={64} />
            <ScoreRing score={a.ctaEffectiveness} label="CTA" description="Kêu gọi hành động" icon={BarChart3} size={64} />
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="space-y-3">
          {a.strengths.length > 0 && (
            <div className="rounded-2xl bg-primary/[0.03] border border-primary/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ArrowUpRight className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Điểm mạnh
                </span>
              </div>
              <div className="space-y-2.5">
                {a.strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-foreground/80 leading-relaxed">
                    <ChevronRight className="w-3.5 h-3.5 text-primary/40 mt-0.5 shrink-0" />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {a.weaknesses.length > 0 && (
            <div className="rounded-2xl bg-destructive/[0.03] border border-destructive/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ArrowDownRight className="w-4 h-4 text-destructive/70" />
                <span className="text-xs font-semibold uppercase tracking-widest text-destructive/70">
                  Cần cải thiện
                </span>
              </div>
              <div className="space-y-2.5">
                {a.weaknesses.map((w, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-foreground/80 leading-relaxed">
                    <ChevronRight className="w-3.5 h-3.5 text-destructive/30 mt-0.5 shrink-0" />
                    {w}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Emotional Arc */}
        {a.emotionalArc.length > 0 && (
          <div className="rounded-2xl border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Cung cảm xúc
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground/70 mb-3">
              Biểu đồ thể hiện cường độ cảm xúc qua từng prompt
            </p>
            <EmotionalArcChart items={a.emotionalArc} />
            {/* Emotion pills */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {a.emotionalArc.map((item, i) => (
                <div 
                  key={i} 
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 text-[11px] text-muted-foreground"
                >
                  <span className="font-semibold">P{item.prompt}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{item.emotion}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {a.suggestions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-4 h-4 text-secondary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Gợi ý cải thiện
              </span>
              <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 ml-auto rounded-full">
                {a.suggestions.length}
              </Badge>
            </div>
            <div className="space-y-2.5">
              {a.suggestions.map((suggestion, i) => (
                <SuggestionCard key={i} suggestion={suggestion} />
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
