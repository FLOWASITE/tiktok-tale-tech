import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown, Bell } from 'lucide-react';
import { GEOMonitoringResult } from '@/hooks/useGEOMonitors';

interface VisibilityAlertsProps {
  results: GEOMonitoringResult[];
  brandName: string;
}

interface Alert {
  type: 'positive' | 'negative' | 'info';
  title: string;
  description: string;
}

export function VisibilityAlerts({ results, brandName }: VisibilityAlertsProps) {
  const alerts: Alert[] = [];

  if (results.length === 0) {
    alerts.push({
      type: 'info',
      title: 'Chưa có dữ liệu',
      description: 'Chạy scan đầu tiên để bắt đầu theo dõi brand trên AI.',
    });
  } else {
    // Check recent mention rate
    const recent = results.slice(0, 20);
    const mentionRate = recent.filter(r => r.brand_mentioned).length / recent.length;

    if (mentionRate >= 0.7) {
      alerts.push({
        type: 'positive',
        title: 'Brand visibility cao',
        description: `${brandName} được đề cập trong ${Math.round(mentionRate * 100)}% câu trả lời AI gần nhất.`,
      });
    } else if (mentionRate < 0.2) {
      alerts.push({
        type: 'negative',
        title: 'Brand visibility thấp',
        description: `${brandName} chỉ xuất hiện trong ${Math.round(mentionRate * 100)}% câu trả lời gần nhất. Cần tối ưu content.`,
      });
    }

    // Check sentiment
    const sentiments = recent.filter(r => r.sentiment_score != null).map(r => Number(r.sentiment_score));
    if (sentiments.length > 0) {
      const avg = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
      if (avg < -20) {
        alerts.push({
          type: 'negative',
          title: 'Sentiment tiêu cực',
          description: `AI mô tả ${brandName} với tông tiêu cực (${Math.round(avg)}). Cần review content strategy.`,
        });
      }
    }
  }

  const iconMap = {
    positive: <TrendingUp className="h-4 w-4 text-green-500" />,
    negative: <TrendingDown className="h-4 w-4 text-destructive" />,
    info: <Bell className="h-4 w-4 text-muted-foreground" />,
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Cảnh báo Visibility
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Không có cảnh báo nào.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="mt-0.5">{iconMap[alert.type]}</div>
                <div>
                  <p className="text-sm font-medium text-foreground">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
