import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { GEOMonitoringResult } from '@/hooks/useGEOMonitors';

interface CitationTrackerProps {
  results: GEOMonitoringResult[];
}

export function CitationTracker({ results }: CitationTrackerProps) {
  // Aggregate citation URLs with engine counts
  const urlMap = new Map<string, { count: number; engines: Set<string> }>();
  results.forEach(r => {
    (r.citation_urls || []).forEach(url => {
      const entry = urlMap.get(url) || { count: 0, engines: new Set() };
      entry.count++;
      entry.engines.add(r.ai_engine);
      urlMap.set(url, entry);
    });
  });

  const citations = Array.from(urlMap.entries())
    .map(([url, data]) => ({ url, count: data.count, engines: Array.from(data.engines) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base">Citation Tracker</CardTitle>
      </CardHeader>
      <CardContent>
        {citations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Chưa có URL nào được AI trích dẫn.
          </p>
        ) : (
          <div className="space-y-3">
            {citations.map(({ url, count, engines }) => (
              <div key={url} className="flex items-start justify-between gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 truncate">
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{url}</span>
                  </a>
                  <div className="flex gap-1 mt-1">
                    {engines.map(e => (
                      <Badge key={e} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {e}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0">{count}×</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
