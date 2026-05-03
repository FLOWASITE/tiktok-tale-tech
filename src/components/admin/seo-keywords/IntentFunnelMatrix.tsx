import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Grid3x3 } from "lucide-react";
import type { PreviewKeyword } from "./KeywordPreviewTable";

const FUNNELS = ["TOFU", "MOFU", "BOFU"] as const;
const INTENTS = ["informational", "commercial", "transactional", "navigational"] as const;

export default function IntentFunnelMatrix({ keywords }: { keywords: PreviewKeyword[] }) {
  const matrix = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    FUNNELS.forEach(f => { m[f] = {}; INTENTS.forEach(i => { m[f][i] = 0; }); });
    keywords.forEach(k => {
      if (m[k.funnel_stage]?.[k.intent] !== undefined) m[k.funnel_stage][k.intent]++;
    });
    return m;
  }, [keywords]);

  const max = Math.max(1, ...FUNNELS.flatMap(f => INTENTS.map(i => matrix[f][i])));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Grid3x3 className="h-4 w-4 text-primary" /> Intent × Funnel matrix
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[80px_repeat(4,1fr)] gap-1 text-xs">
          <div></div>
          {INTENTS.map(i => <div key={i} className="text-center font-medium text-muted-foreground capitalize p-1">{i.slice(0, 4)}</div>)}
          {FUNNELS.map(f => (
            <>
              <div key={f} className="font-medium text-muted-foreground p-2 flex items-center">{f}</div>
              {INTENTS.map(i => {
                const c = matrix[f][i];
                const intensity = c / max;
                return (
                  <div key={`${f}-${i}`}
                    className="aspect-square rounded flex items-center justify-center font-semibold tabular-nums border"
                    style={{ backgroundColor: c ? `hsl(var(--primary) / ${0.08 + intensity * 0.35})` : "transparent" }}>
                    {c}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
