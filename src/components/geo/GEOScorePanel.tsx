import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GEOIssuesList } from './GEOIssuesList';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { parseEdgeFunctionError } from '@/lib/edgeFunctionErrors';
import { TopicCreditsAlert } from '@/components/topic/TopicCreditsAlert';

interface GEOScorePanelProps {
  contentId?: string;
  contentType?: string;
  contentText: string;
  organizationId: string;
}

interface FactorScore {
  key: string;
  label: string;
  score: number;
  weight: number;
}

interface GEOIssue {
  severity: 'critical' | 'important' | 'improvement';
  factor: string;
  title: string;
  description: string;
  suggestion: string;
}

const FACTOR_LABELS: Record<string, string> = {
  answer_first: 'Answer-First',
  citation_signals: 'Citation Signals',
  structured_data: 'Structured Data',
  entity_clarity: 'Entity Clarity',
  heading_hierarchy: 'Heading Hierarchy',
  content_depth: 'Content Depth',
  freshness: 'Freshness',
  extractability: 'Extractability',
};

const FACTOR_WEIGHTS: Record<string, number> = {
  answer_first: 15, citation_signals: 15, structured_data: 12, entity_clarity: 13,
  heading_hierarchy: 10, content_depth: 15, freshness: 8, extractability: 12,
};

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  if (score >= 40) return 'text-orange-500';
  return 'text-destructive';
}

function getScoreGrade(score: number): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  if (score >= 90) return { label: 'A+', variant: 'default' };
  if (score >= 80) return { label: 'A', variant: 'default' };
  if (score >= 70) return { label: 'B', variant: 'secondary' };
  if (score >= 60) return { label: 'C', variant: 'outline' };
  if (score >= 40) return { label: 'D', variant: 'destructive' };
  return { label: 'F', variant: 'destructive' };
}

export function GEOScorePanel({ contentId, contentType = 'multi_channel', contentText, organizationId }: GEOScorePanelProps) {
  const [scoring, setScoring] = useState(false);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [factorScores, setFactorScores] = useState<Record<string, number>>({});
  const [issues, setIssues] = useState<GEOIssue[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [creditsError, setCreditsError] = useState<{ code?: string; message?: string } | null>(null);

  const handleScore = async () => {
    if (!contentText.trim()) {
      toast.error('Không có nội dung để chấm điểm');
      return;
    }

    setScoring(true);
    setCreditsError(null);
    try {
      const { data, error } = await supabase.functions.invoke('geo-score-content', {
        body: { contentId, contentType, contentText, organizationId },
      });

      if (error) {
        const parsed = parseEdgeFunctionError(error, 'Lỗi chấm điểm GEO');
        if (parsed.code === 'CREDITS_EXHAUSTED') {
          setCreditsError({ code: parsed.code, message: parsed.message });
          return;
        }
        throw new Error(parsed.message);
      }
      
      // Check for inline error from edge function (200 with errorCode)
      if (data?.errorCode === 'CREDITS_EXHAUSTED' || data?.error?.includes?.('credits')) {
        setCreditsError({ code: 'CREDITS_EXHAUSTED', message: data.error || 'AI credits đã hết' });
        return;
      }
      
      if (!data.success) throw new Error(data.error);

      setOverallScore(data.overall_score);
      setFactorScores(data.factor_scores);
      setIssues(data.issues || []);
      toast.success(`GEO Score: ${data.overall_score}/100`);
    } catch (err: any) {
      toast.error('Lỗi chấm điểm: ' + (err.message || 'Unknown'));
    } finally {
      setScoring(false);
    }
  };

  const grade = overallScore !== null ? getScoreGrade(overallScore) : null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            GEO Score
          </CardTitle>
          <Button onClick={handleScore} disabled={scoring} size="sm" variant="outline">
            {scoring ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
            {scoring ? 'Đang chấm...' : overallScore !== null ? 'Chấm lại' : 'Chấm điểm GEO'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {creditsError && (
          <TopicCreditsAlert
            errorCode={creditsError.code}
            errorMessage={creditsError.message}
            onRetry={handleScore}
            className="mb-4"
          />
        )}
        {overallScore === null && !creditsError ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nhấn "Chấm điểm GEO" để phân tích nội dung theo 8 yếu tố AI Visibility.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Overall Score */}
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-muted-foreground">/100</span>
                  {grade && <Badge variant={grade.variant}>{grade.label}</Badge>}
                </div>
                <Progress value={overallScore} className="h-2" />
              </div>
            </div>

            {/* Factor Breakdown */}
            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                  Chi tiết 8 yếu tố
                  {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {Object.entries(factorScores).map(([key, score]) => (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground flex-1 truncate">
                      {FACTOR_LABELS[key] || key}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Progress value={score} className="h-1.5 w-20" />
                      <span className={`text-xs font-medium w-8 text-right ${getScoreColor(score)}`}>
                        {score}
                      </span>
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Issues */}
            {issues.length > 0 && <GEOIssuesList issues={issues} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
