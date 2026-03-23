import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GEOOverview } from '@/components/geo/GEOOverview';
import { GEOSetupWizard } from '@/components/geo/GEOSetupWizard';
import { PromptExplorer } from '@/components/geo/PromptExplorer';
import { GEOContentOptimizerTab } from '@/components/geo/GEOContentOptimizerTab';
import { CompetitorDashboard } from '@/components/geo/CompetitorDashboard';
import { ActionCenter } from '@/components/geo/ActionCenter';
import { useGEOMonitors } from '@/hooks/useGEOMonitors';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export default function GEODashboard() {
  const { monitors, loading } = useGEOMonitors();
  const { currentOrganization } = useOrganizationContext();
  const [activeTab, setActiveTab] = useState('overview');
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const hasMonitors = monitors.length > 0;

  useEffect(() => {
    if (!currentOrganization?.id) return;
    supabase
      .from('geo_alert_history')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', currentOrganization.id)
      .eq('is_read', false)
      .then(({ count }) => {
        setUnreadAlerts(count || 0);
      });
  }, [currentOrganization?.id]);

  return (
    <>
      <Helmet>
        <title>GEO Engine — AI Visibility</title>
      </Helmet>
      <div className="container mx-auto py-6 px-4 max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">GEO Engine</h1>
            <p className="text-muted-foreground mt-1">
              Theo dõi & tối ưu hiển thị thương hiệu trên AI Search
            </p>
          </div>
        </div>

        {!hasMonitors && !loading ? (
          <GEOSetupWizard />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6 lg:w-[720px]">
              <TabsTrigger value="overview" className="relative">
                Tổng quan
                {unreadAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unreadAlerts > 9 ? '9+' : unreadAlerts}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="optimizer">GEO Score</TabsTrigger>
              <TabsTrigger value="prompts">Prompts</TabsTrigger>
              <TabsTrigger value="competitors">Đối thủ</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
              <TabsTrigger value="setup">Cấu hình</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-6">
              <GEOOverview monitors={monitors} loading={loading} />
            </TabsContent>
            <TabsContent value="optimizer" className="mt-6">
              <GEOContentOptimizerTab />
            </TabsContent>
            <TabsContent value="prompts" className="mt-6">
              <PromptExplorer monitors={monitors} />
            </TabsContent>
            <TabsContent value="competitors" className="mt-6">
              <CompetitorDashboard monitors={monitors} />
            </TabsContent>
            <TabsContent value="actions" className="mt-6">
              <ActionCenter />
            </TabsContent>
            <TabsContent value="setup" className="mt-6">
              <GEOSetupWizard existingMonitors={monitors} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
}
