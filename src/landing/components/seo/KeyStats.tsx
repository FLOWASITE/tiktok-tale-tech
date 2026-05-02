interface KeyStat {
  label: string;
  value: string;
  source?: string;
}

interface KeyStatsProps {
  stats: KeyStat[];
  title?: string;
}

/**
 * Statistic cards optimized for AI engine extraction.
 * Each stat carries a `source` attribution for E-E-A-T signal.
 */
export function KeyStats({ stats, title }: KeyStatsProps) {
  if (!stats?.length) return null;

  return (
    <section data-geo-block="key-stats" className="my-10">
      {title && <h2 className="mb-6 text-2xl font-semibold">{title}</h2>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
          >
            <div className="text-3xl font-bold text-primary">{s.value}</div>
            <div className="mt-1 text-sm text-foreground">{s.label}</div>
            {s.source && (
              <div className="mt-2 text-xs text-muted-foreground">Nguồn: {s.source}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
