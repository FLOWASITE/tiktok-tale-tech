import { useRankHistory } from "@/hooks/useRankHistory";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface Props {
  keywordId: string;
  days?: number;
  height?: number;
  mini?: boolean;
}

export default function RankTrendChart({ keywordId, days = 90, height = 220, mini = false }: Props) {
  const { data: history = [], isLoading } = useRankHistory(keywordId, days);

  if (isLoading) return <div className="text-xs text-muted-foreground">Đang tải...</div>;
  if (!history.length) return <div className="text-xs text-muted-foreground">Chưa có lịch sử.</div>;

  const chartData = history.map((p) => ({
    date: new Date(p.checked_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
    rank: p.rank ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        {!mini && <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />}
        {!mini && (
          <YAxis
            reversed
            domain={[1, "dataMax"]}
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            label={{ value: "Rank", angle: -90, position: "insideLeft", fontSize: 11 }}
          />
        )}
        {!mini && <ReferenceLine y={10} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label={{ value: "Top 10", fontSize: 10, position: "right" }} />}
        {!mini && (
          <Tooltip
            contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
            formatter={(v: any) => [v ? `#${v}` : "—", "Rank"]}
          />
        )}
        <Line type="monotone" dataKey="rank" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: mini ? 0 : 3 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
