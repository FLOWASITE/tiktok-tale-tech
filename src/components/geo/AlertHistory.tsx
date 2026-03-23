import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, TrendingUp, TrendingDown, AlertTriangle, Check, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

export function AlertHistory() {
  const { currentOrganization } = useOrganizationContext();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!currentOrganization?.id) return;
    try {
      const { data, error } = await supabase
        .from('geo_alert_history')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAlerts((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const markAsRead = async (alertId: string) => {
    await supabase.from('geo_alert_history').update({ is_read: true } as any).eq('id', alertId);
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true } : a));
  };

  const markAllRead = async () => {
    if (!currentOrganization?.id) return;
    const unreadIds = alerts.filter(a => !a.is_read).map(a => a.id);
    if (unreadIds.length === 0) return;
    await supabase.from('geo_alert_history').update({ is_read: true } as any).in('id', unreadIds);
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
  };

  const getAlertIcon = (type: string) => {
    if (type.includes('spike') || type.includes('increase')) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (type.includes('drop') || type.includes('decrease')) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  const severityClass: Record<string, string> = {
    high: 'bg-destructive/10 text-destructive',
    medium: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    low: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  };

  const unreadCount = alerts.filter(a => !a.is_read).length;

  if (loading) {
    return <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">Đang tải alerts...</div>;
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Lịch sử cảnh báo
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-1">{unreadCount}</Badge>
          )}
        </CardTitle>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
            <Check className="h-3 w-3 mr-1" />
            Đọc tất cả
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Chưa có cảnh báo nào.</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${alert.is_read ? 'bg-muted/30' : 'bg-muted/60 border border-border/50'}`}
              >
                <div className="mt-0.5 shrink-0">{getAlertIcon(alert.alert_type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${alert.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {alert.title}
                    </span>
                    <Badge className={`text-[10px] px-1.5 py-0 ${severityClass[alert.severity] || severityClass.medium}`}>
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    {new Date(alert.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {!alert.is_read && (
                  <Button variant="ghost" size="sm" className="shrink-0 h-7 w-7 p-0" onClick={() => markAsRead(alert.id)}>
                    <Eye className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
