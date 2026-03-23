import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { GEOMonitoringResult } from '@/hooks/useGEOMonitors';

interface SentimentGaugeProps {
  results: GEOMonitoringResult[];
}

export function SentimentGauge({ results }: SentimentGaugeProps) {
  // Group by AI engine
  const engineMap = new Map<string, number[]>();
  results.forEach(r => {
    if (r.sentiment_score != null) {
      const scores = engineMap.get(r.ai_engine) || [];
      scores.push(Number(r.sentiment_score));
      engineMap.set(r.ai_engine, scores);
    }
  });

  const chartData = Array.from(engineMap.entries()).map(([engine, scores]) => ({
    engine: engine.charAt(0).toUpperCase() + engine.slice(1),
    sentiment: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
  }));

  if (chartData.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Sentiment theo AI Engine</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
          Chưa có dữ liệu sentiment.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base">Sentiment theo AI Engine</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="engine" className="text-xs" />
            <YAxis domain={[-100, 100]} className="text-xs" />
            <Tooltip />
            <Bar dataKey="sentiment" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
