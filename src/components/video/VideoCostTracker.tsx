import { useEffect, useMemo } from 'react';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { Card } from '@/components/ui/card';
import { DollarSign, TrendingUp, Video as VideoIcon, Clock } from 'lucide-react';
import { VIDEO_MODELS } from './ProviderModelPicker';

export function VideoCostTracker() {
  const { generations, fetchGenerations } = useVideoGeneration();

  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  const stats = useMemo(() => {
    const completed = generations.filter((g) => g.status === 'completed');
    const totalSeconds = completed.reduce((s, g) => s + (g.duration_seconds || 0), 0);
    const totalCost = completed.reduce((s, g) => {
      const model = VIDEO_MODELS.find((m) => m.id === g.model_used);
      const price = model?.pricePerSec ?? 0.10;
      return s + price * (g.duration_seconds || 0);
    }, 0);
    const byModel = completed.reduce<Record<string, { count: number; cost: number }>>((acc, g) => {
      const key = g.model_used || 'unknown';
      const model = VIDEO_MODELS.find((m) => m.id === key);
      const price = model?.pricePerSec ?? 0.10;
      const cost = price * (g.duration_seconds || 0);
      if (!acc[key]) acc[key] = { count: 0, cost: 0 };
      acc[key].count += 1;
      acc[key].cost += cost;
      return acc;
    }, {});
    return { count: completed.length, totalSeconds, totalCost, byModel };
  }, [generations]);

  const cards = [
    { icon: VideoIcon, label: 'Video đã tạo', value: stats.count.toString() },
    { icon: Clock, label: 'Tổng thời lượng', value: `${stats.totalSeconds}s` },
    { icon: DollarSign, label: 'Tổng chi phí ước tính', value: `$${stats.totalCost.toFixed(2)}` },
    { icon: TrendingUp, label: 'TB / video', value: stats.count ? `$${(stats.totalCost / stats.count).toFixed(2)}` : '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">Chi phí Video</h3>
        <p className="text-xs text-muted-foreground">
          Ước tính dựa trên giá niêm yết của provider. Số liệu chính thức xem ở Settings → Subscription.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="p-4 border-border/60">
              <div className="flex items-start justify-between">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-lg font-semibold text-foreground font-mono mt-0.5">{c.value}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {Object.keys(stats.byModel).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Chi phí theo model</h4>
          <div className="space-y-1.5">
            {Object.entries(stats.byModel).map(([modelId, data]) => {
              const model = VIDEO_MODELS.find((m) => m.id === modelId);
              return (
                <div key={modelId} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
                  <div>
                    <p className="text-sm font-medium text-foreground">{model?.label ?? modelId}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{data.count} video</p>
                  </div>
                  <p className="text-sm font-mono font-semibold text-foreground">${data.cost.toFixed(2)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
