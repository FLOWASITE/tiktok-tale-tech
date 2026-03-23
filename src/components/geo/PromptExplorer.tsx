import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, TrendingUp, AlertCircle } from 'lucide-react';
import { GEOMonitor } from '@/hooks/useGEOMonitors';
import { useGEOResults } from '@/hooks/useGEOResults';

interface PromptExplorerProps {
  monitors: GEOMonitor[];
}

export function PromptExplorer({ monitors }: PromptExplorerProps) {
  const activeMonitor = monitors.find(m => m.is_active) || monitors[0];
  const { results } = useGEOResults(activeMonitor?.id);

  // Group results by prompt
  const promptMap = new Map<string, { mentioned: number; total: number; engines: Set<string> }>();
  results.forEach(r => {
    const entry = promptMap.get(r.prompt) || { mentioned: 0, total: 0, engines: new Set() };
    entry.total++;
    if (r.brand_mentioned) entry.mentioned++;
    entry.engines.add(r.ai_engine);
    promptMap.set(r.prompt, entry);
  });

  const prompts = Array.from(promptMap.entries())
    .map(([prompt, data]) => ({
      prompt,
      mentioned: data.mentioned,
      total: data.total,
      rate: data.total > 0 ? Math.round((data.mentioned / data.total) * 100) : 0,
      engines: Array.from(data.engines),
    }))
    .sort((a, b) => b.total - a.total);

  const mentionedPrompts = prompts.filter(p => p.rate > 0);
  const gapPrompts = prompts.filter(p => p.rate === 0);

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search Console cho AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          {prompts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Chưa có dữ liệu prompt. Chạy scan để khám phá.
            </p>
          ) : (
            <div className="space-y-2">
              {mentionedPrompts.slice(0, 15).map(({ prompt, rate, total, engines }) => (
                <div key={prompt} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">{prompt}</p>
                    <div className="flex gap-1 mt-1">
                      {engines.map(e => (
                        <Badge key={e} variant="secondary" className="text-[10px] px-1.5 py-0">{e}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-sm font-medium text-foreground">{rate}%</span>
                    <Badge variant="outline" className="text-[10px]">{total} scans</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {gapPrompts.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              Gap Prompts — Brand chưa xuất hiện
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {gapPrompts.slice(0, 10).map(({ prompt, total }) => (
                <div key={prompt} className="flex items-center justify-between p-2 rounded-lg bg-destructive/5">
                  <p className="text-sm text-foreground truncate">{prompt}</p>
                  <Badge variant="destructive" className="text-[10px] shrink-0">0% — {total} scans</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
