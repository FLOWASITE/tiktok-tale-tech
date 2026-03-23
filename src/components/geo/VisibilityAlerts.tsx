import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface VisibilityAlertsProps {
  monitorId?: string;
  organizationId?: string;
}

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  is_read: boolean;
  created_at: string;
}

export function VisibilityAlerts({ monitorId, organizationId }: VisibilityAlertsProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    try {
      let query = supabase
        .from('geo_alert_history')
        .select('id, alert_type, severity, title, description, is_read, created_at')
        .eq('organization_id', organizationId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (monitorId) {
        query = query.eq('brand_monitor_id', monitorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAlerts((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching visibility alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [monitorId, organizationId]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const getIcon = (type: string) => {
    if (type.includes('spike') || type.includes('increase')) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (type.includes('drop') || type.includes('decrease')) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Bell className="h-4 w-4 text-muted-foreground" />;
  };

  if (loading) return null;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Cảnh báo Visibility
          {alerts.length > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{alerts.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Không có cảnh báo mới.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => (
              <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="mt-0.5">{getIcon(alert.alert_type)}</div>
                <div>
                  <p className="text-sm font-medium text-foreground">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(alert.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
