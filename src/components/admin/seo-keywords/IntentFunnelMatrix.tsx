import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Grid3x3 } from "lucide-react";

const FUNNELS = ["TOFU", "MOFU", "BOFU"] as const;
const INTENTS = ["informational", "commercial", "transactional", "navigational"] as const;

type Funnel = (typeof FUNNELS)[number];
type Intent = (typeof INTENTS)[number];

interface KwLike {
  intent?: string | null;
  funnel_stage?: string | null;
}

interface Props {
  keywords: KwLike[];
  activeCell?: { funnel: Funnel; intent: Intent } | null;
  onCellClick?: (cell: { funnel: Funnel; intent: Intent } | null) => void;
  compact?: boolean;
}

export default function IntentFunnelMatrix({ keywords, activeCell, onCellClick, compact }: Props) {
  const matrix = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    FUNNELS.forEach((f) => {
      m[f] = {};
      INTENTS.forEach((i) => {
        m[f][i] = 0;
      });
    });
    keywords.forEach((k) => {
      const f = (k.funnel_stage || "TOFU") as Funnel;
      const i = (k.intent || "informational") as Intent;
      if (m[f]?.[i] !== undefined) m[f][i]++;
    });
    return m;
  }, [keywords]);

  const max = Math.max(1, ...FUNNELS.flatMap((f) => INTENTS.map((i) => matrix[f][i])));

  const grid = (
    <div className="grid grid-cols-[64px_repeat(4,1fr)] gap-1 text-xs">
      <div></div>
      {INTENTS.map((i) => (
        <div key={i} className="text-center font-medium text-muted-foreground capitalize p-1">
          {i.slice(0, 4)}
        </div>
      ))}
      {FUNNELS.map((f) => (
        <div key={f} className="contents">
          <div className="font-medium text-muted-foreground p-2 flex items-center text-[11px]">{f}</div>
          {INTENTS.map((i) => {
            const c = matrix[f][i];
            const intensity = c / max;
            const isActive = activeCell?.funnel === f && activeCell?.intent === i;
            const interactive = !!onCellClick;
            return (
              <button
                key={`${f}-${i}`}
                type="button"
                disabled={!interactive}
                onClick={() => {
                  if (!onCellClick) return;
                  onCellClick(isActive ? null : { funnel: f, intent: i });
                }}
                className={`aspect-square rounded flex items-center justify-center font-semibold tabular-nums border transition-all ${
                  interactive ? "hover:ring-1 hover:ring-foreground/30 cursor-pointer" : "cursor-default"
                } ${isActive ? "ring-2 ring-primary border-primary" : "border-border/60"}`}
                style={{
                  backgroundColor: c ? `hsl(var(--primary) / ${0.08 + intensity * 0.35})` : "transparent",
                }}
                title={`${f} · ${i}: ${c} keyword`}
              >
                {c}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );

  if (compact) return grid;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Grid3x3 className="h-4 w-4 text-primary" /> Intent × Funnel matrix
          {activeCell && (
            <button
              type="button"
              onClick={() => onCellClick?.(null)}
              className="ml-auto text-xs font-normal text-muted-foreground hover:text-foreground"
            >
              Bỏ filter ô
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>{grid}</CardContent>
    </Card>
  );
}
