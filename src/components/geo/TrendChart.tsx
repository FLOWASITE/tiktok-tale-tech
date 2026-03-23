import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TrendChartProps {
  monitorId?: string;
}

interface SnapshotData {
  snapshot_date: string;
  sov_percentage: number;
  citation_rate: number;
  avg_sentiment: number;
  total_scans: number;
}

export function TrendChart({ monitorId }: TrendChartProps) {
  const [data, setData] = useState<SnapshotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('30');

  const fetchSnapshots = useCallback(async () => {
    if (!monitorId) return;
    setLoading(true);

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - parseInt(days));

    try {
      const { data: snapshots, error } = await supabase
        .from('geo_visibility_snapshots')
        .select('snapshot_date, sov_percentage, citation_rate, avg_sentiment, total_scans')
        .eq('brand_monitor_id', monitorId)
        .gte('snapshot_date', fromDate.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });

      if (error) throw error;
      setData((snapshots as any[]) || []);
    } catch (err) {
      console.error('Error fetching snapshots:', err);
    } finally {
      setLoading(false);
    }
  }, [monitorId, days]);

  useEffect(() => { fetchSnapshots(); }, [fetchSnapshots]);

  if (!monitorId) return null;

  const chartData = data.map(d => ({
    date: new Date(d.snapshot_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
    'SOV %': d.sov_percentage,
    'Citation %': d.citation_rate,
    Sentiment: d.avg_sentiment,
  }));

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Xu hướng theo thời gian
        </CardTitle>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 ngày</SelectItem>
            <SelectItem value="14">14 ngày</SelectItem>
            <SelectItem value="30">30 ngày</SelectItem>
            <SelectItem value="90">90 ngày</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">Đang tải...</div>
        ) : chartData.length < 2 ? (
          <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
            Cần ít nhất 2 lần scan để hiển thị xu hướng.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
              <YAxis className="text-xs" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="SOV %" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Citation %" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Sentiment" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
