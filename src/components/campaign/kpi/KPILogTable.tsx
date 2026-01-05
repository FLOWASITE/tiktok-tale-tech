import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { CampaignKPILog, CampaignGoal, formatMetricValue } from '@/types/campaign';
import { cn } from '@/lib/utils';

interface KPILogTableProps {
  kpiLogs: CampaignKPILog[];
  goals: CampaignGoal[];
}

export function KPILogTable({ kpiLogs, goals }: KPILogTableProps) {
  // Sort by date descending
  const sortedLogs = [...kpiLogs].sort(
    (a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
  );

  // Get metric keys from goals
  const metricKeys = goals.map(g => g.metric);

  // Calculate delta between current log and previous
  const getLogDelta = (currentIndex: number, metric: string): { value: number; trend: 'up' | 'down' | 'stable' } | null => {
    const currentLog = sortedLogs[currentIndex];
    const previousLog = sortedLogs[currentIndex + 1];
    
    if (!previousLog) return null;
    
    const currentValue = (currentLog.metrics as Record<string, number>)?.[metric] ?? 0;
    const previousValue = (previousLog.metrics as Record<string, number>)?.[metric] ?? 0;
    
    const diff = currentValue - previousValue;
    
    return {
      value: diff,
      trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable'
    };
  };

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  if (sortedLogs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Lịch sử cập nhật
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Chưa có lịch sử cập nhật KPI</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Lịch sử cập nhật ({sortedLogs.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Ngày</TableHead>
                {goals.map(goal => (
                  <TableHead key={goal.metric} className="text-right">
                    {goal.label}
                  </TableHead>
                ))}
                <TableHead>Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLogs.map((log, index) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">
                    {format(new Date(log.logged_at), 'dd/MM/yyyy', { locale: vi })}
                  </TableCell>
                  {metricKeys.map(metric => {
                    const value = (log.metrics as Record<string, number>)?.[metric];
                    const goal = goals.find(g => g.metric === metric);
                    const delta = getLogDelta(index, metric);
                    
                    return (
                      <TableCell key={metric} className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span>{value !== undefined ? formatMetricValue(value, goal?.unit) : '-'}</span>
                          {delta && (
                            <span className={cn(
                              "flex items-center text-xs",
                              delta.trend === 'up' && "text-green-500",
                              delta.trend === 'down' && "text-red-500"
                            )}>
                              <TrendIcon trend={delta.trend} />
                            </span>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {log.notes || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
