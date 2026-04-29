import { useEffect, useMemo, useState } from 'react';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { useAudioStudio } from '@/hooks/useAudioStudio';
import { useVideoRender } from '@/hooks/useVideoRender';
import { Card } from '@/components/ui/card';
import { DollarSign, TrendingUp, Video as VideoIcon, Clock, Mic, Music4, Type, Film } from 'lucide-react';
import { VIDEO_MODELS } from './ProviderModelPicker';

type DayBucket = { date: string; cost: number };

export function VideoCostTracker() {
  const { generations, fetchGenerations } = useVideoGeneration();
  const { assets, fetchAssets } = useAudioStudio();
  const { jobs, fetchJobs } = useVideoRender();
  const [range, setRange] = useState<7 | 30>(30);

  useEffect(() => {
    fetchGenerations();
    fetchAssets();
    fetchJobs();
  }, [fetchGenerations, fetchAssets, fetchJobs]);

  const stats = useMemo(() => {
    const completedClips = generations.filter((g) => g.status === 'completed');
    const completedRenders = jobs.filter((j) => j.status === 'completed');

    // Use REAL cost_estimate from DB; fallback to model price only when null
    const clipCost = completedClips.reduce((s, g) => {
      if (typeof g.cost_estimate === 'number') return s + g.cost_estimate;
      const model = VIDEO_MODELS.find((m) => m.id === g.model_used);
      return s + (model?.pricePerSec ?? 0.10) * (g.duration_seconds || 0);
    }, 0);
    const renderCost = completedRenders.reduce((s, j) => s + (j.cost_estimate ?? 0), 0);
    const audioCost = assets.reduce((s, a) => s + ((a as { cost_estimate?: number }).cost_estimate ?? 0), 0);

    const totalSeconds = completedClips.reduce((s, g) => s + (g.duration_seconds || 0), 0);
    const renderSeconds = completedRenders.reduce((s, j) => s + (j.duration_seconds ?? 0), 0);

    // By model (real cost)
    const byModel = completedClips.reduce<Record<string, { count: number; cost: number; seconds: number }>>((acc, g) => {
      const key = g.model_used || 'unknown';
      const cost = typeof g.cost_estimate === 'number'
        ? g.cost_estimate
        : (VIDEO_MODELS.find((m) => m.id === key)?.pricePerSec ?? 0.10) * (g.duration_seconds || 0);
      if (!acc[key]) acc[key] = { count: 0, cost: 0, seconds: 0 };
      acc[key].count += 1;
      acc[key].cost += cost;
      acc[key].seconds += g.duration_seconds || 0;
      return acc;
    }, {});

    // Time series (last `range` days, all sources combined)
    const cutoff = Date.now() - range * 24 * 3600 * 1000;
    const byDay = new Map<string, number>();
    const pushDay = (createdAt: string, cost: number) => {
      const t = new Date(createdAt).getTime();
      if (t < cutoff) return;
      const key = new Date(createdAt).toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + cost);
    };
    for (const g of completedClips) {
      const c = typeof g.cost_estimate === 'number'
        ? g.cost_estimate
        : (VIDEO_MODELS.find((m) => m.id === g.model_used)?.pricePerSec ?? 0.10) * (g.duration_seconds || 0);
      pushDay(g.created_at, c);
    }
    for (const j of completedRenders) pushDay(j.created_at, j.cost_estimate ?? 0);
    for (const a of assets) {
      const c = (a as { cost_estimate?: number }).cost_estimate;
      if (c) pushDay(a.created_at, c);
    }

    // Fill empty days
    const days: DayBucket[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10);
      days.push({ date: d, cost: byDay.get(d) ?? 0 });
    }
    const maxDay = Math.max(0.01, ...days.map((d) => d.cost));

    return {
      clipCount: completedClips.length,
      renderCount: completedRenders.length,
      audioCount: assets.length,
      totalSeconds,
      renderSeconds,
      clipCost,
      renderCost,
      audioCost,
      totalCost: clipCost + renderCost + audioCost,
      byModel,
      days,
      maxDay,
    };
  }, [generations, jobs, assets, range]);

  const cards = [
    { icon: VideoIcon, label: 'Quick Clip', value: `${stats.clipCount} · $${stats.clipCost.toFixed(2)}`, sub: `${stats.totalSeconds}s` },
    { icon: Film, label: 'Video ghép', value: `${stats.renderCount} · $${stats.renderCost.toFixed(2)}`, sub: `${Math.round(stats.renderSeconds)}s` },
    { icon: Mic, label: 'Audio', value: `${stats.audioCount} · $${stats.audioCost.toFixed(2)}`, sub: 'voiceover · BGM · phụ đề' },
    { icon: DollarSign, label: 'Tổng cộng', value: `$${stats.totalCost.toFixed(2)}`, sub: stats.clipCount ? `~$${(stats.totalCost / Math.max(1, stats.clipCount + stats.renderCount)).toFixed(2)}/output` : '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">Chi phí Video</h3>
          <p className="text-xs text-muted-foreground">
            Số liệu lấy từ <code className="text-[10px] bg-muted px-1 rounded">cost_estimate</code> thật trong DB (provider trả về). Hạn mức gói xem ở Settings → Subscription.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border/40 p-0.5 shrink-0">
          {([7, 30] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-[10px] px-2 py-1 rounded-md transition ${
                range === r ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r} ngày
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="p-4 border-border/60">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-2">{c.label}</p>
              <p className="text-base font-semibold text-foreground font-mono mt-0.5">{c.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{c.sub}</p>
            </Card>
          );
        })}
      </div>

      {/* Daily bar chart */}
      <Card className="p-4 border-border/60">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-foreground">Chi phí theo ngày</h4>
          <span className="text-[10px] text-muted-foreground font-mono">
            Đỉnh: ${stats.maxDay.toFixed(2)}
          </span>
        </div>
        <div className="flex items-end gap-0.5 h-24">
          {stats.days.map((d) => {
            const h = stats.maxDay > 0 ? (d.cost / stats.maxDay) * 100 : 0;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center justify-end group relative" title={`${d.date}: $${d.cost.toFixed(3)}`}>
                <div
                  className="w-full bg-foreground/70 hover:bg-foreground rounded-sm transition min-h-[2px]"
                  style={{ height: `${h}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground font-mono mt-1.5">
          <span>{stats.days[0]?.date.slice(5)}</span>
          <span>{stats.days[stats.days.length - 1]?.date.slice(5)}</span>
        </div>
      </Card>

      {Object.keys(stats.byModel).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Chi phí theo model</h4>
          <div className="space-y-1.5">
            {Object.entries(stats.byModel)
              .sort(([, a], [, b]) => b.cost - a.cost)
              .map(([modelId, data]) => {
                const model = VIDEO_MODELS.find((m) => m.id === modelId);
                return (
                  <div key={modelId} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
                    <div>
                      <p className="text-sm font-medium text-foreground">{model?.label ?? modelId}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {data.count} video · {data.seconds}s
                      </p>
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
