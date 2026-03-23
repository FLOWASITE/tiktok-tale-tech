import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GEOOverview } from '@/components/geo/GEOOverview';
import { GEOSetupWizard } from '@/components/geo/GEOSetupWizard';
import { PromptExplorer } from '@/components/geo/PromptExplorer';
import { useGEOMonitors } from '@/hooks/useGEOMonitors';
import { Helmet } from 'react-helmet-async';

export default function GEODashboard() {
  const { monitors, loading } = useGEOMonitors();
  const [activeTab, setActiveTab] = useState('overview');
  const hasMonitors = monitors.length > 0;

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
            <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
              <TabsTrigger value="overview">Tổng quan</TabsTrigger>
              <TabsTrigger value="prompts">Prompt Explorer</TabsTrigger>
              <TabsTrigger value="setup">Cấu hình</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-6">
              <GEOOverview monitors={monitors} loading={loading} />
            </TabsContent>
            <TabsContent value="prompts" className="mt-6">
              <PromptExplorer monitors={monitors} />
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
