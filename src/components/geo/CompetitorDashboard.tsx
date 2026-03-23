import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Swords, Loader2, TrendingUp, TrendingDown, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GEOMonitor } from '@/hooks/useGEOMonitors';

interface BrandAnalysis {
  name: string;
  estimated_sov: number;
  strengths: string[];
  weaknesses: string[];
  citation_likelihood: number;
  content_authority: number;
}

interface Opportunity {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
}

interface CompetitorDashboardProps {
  monitors: GEOMonitor[];
}

export function CompetitorDashboard({ monitors }: CompetitorDashboardProps) {
  const activeMonitor = monitors.find(m => m.is_active) || monitors[0];
  const [brands, setBrands] = useState<BrandAnalysis[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!activeMonitor) return;
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('geo-track-competitors', {
        body: { monitorId: activeMonitor.id },
      });
      if (error) throw error;
      setBrands(data?.brands || []);
      setOpportunities(data?.opportunities || []);
      toast.success('Phân tích đối thủ hoàn tất');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi phân tích');
    } finally {
      setAnalyzing(false);
    }
  };

  const impactColor = (v: string) =>
    v === 'high' ? 'text-green-600 dark:text-green-400' : v === 'medium' ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground';

  const hasCompetitors = activeMonitor && (activeMonitor.competitors?.length || 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Competitive AI Intelligence</h3>
          <p className="text-sm text-muted-foreground">So sánh hiển thị thương hiệu vs đối thủ trên AI Search</p>
        </div>
        <Button onClick={handleAnalyze} disabled={analyzing || !hasCompetitors} size="sm">
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Swords className="h-4 w-4 mr-2" />}
          {analyzing ? 'Đang phân tích...' : 'Phân tích đối thủ'}
        </Button>
      </div>

      {!hasCompetitors && (
        <Card className="border-dashed border-border">
          <CardContent className="py-10 text-center">
            <Swords className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Thêm đối thủ trong tab Cấu hình để bắt đầu so sánh.</p>
          </CardContent>
        </Card>
      )}

      {brands.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand, i) => {
            const isOwn = i === 0;
            return (
              <Card key={brand.name} className={`border-border/50 ${isOwn ? 'ring-2 ring-primary/30' : ''}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {brand.name}
                    {isOwn && <Badge variant="default" className="text-[10px]">Bạn</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">SOV ước tính</span>
                      <span className="font-medium text-foreground">{brand.estimated_sov}%</span>
                    </div>
                    <Progress value={brand.estimated_sov} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Citation Likelihood</span>
                      <span className="font-medium text-foreground">{brand.citation_likelihood}%</span>
                    </div>
                    <Progress value={brand.citation_likelihood} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Content Authority</span>
                      <span className="font-medium text-foreground">{brand.content_authority}%</span>
                    </div>
                    <Progress value={brand.content_authority} className="h-2" />
                  </div>

                  <div className="pt-2 border-t border-border/50">
                    <div className="space-y-1">
                      {brand.strengths.slice(0, 2).map((s, j) => (
                        <div key={j} className="flex items-start gap-1.5 text-xs">
                          <TrendingUp className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                          <span className="text-muted-foreground">{s}</span>
                        </div>
                      ))}
                      {brand.weaknesses.slice(0, 2).map((w, j) => (
                        <div key={j} className="flex items-start gap-1.5 text-xs">
                          <TrendingDown className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                          <span className="text-muted-foreground">{w}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {opportunities.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Cơ hội vượt đối thủ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {opportunities.map((opp, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{opp.title}</span>
                    <Badge variant="outline" className={`text-[10px] ${impactColor(opp.impact)}`}>
                      Impact: {opp.impact}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      Effort: {opp.effort}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{opp.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
