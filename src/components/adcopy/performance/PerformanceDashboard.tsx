import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdCopyPerformance } from '@/hooks/useAdCopyPerformance';
import { useMetaAdsConnection } from '@/hooks/useMetaAdsConnection';
import { AdCopyVariation } from '@/types/adCopy';
import { PerformanceOverview } from './PerformanceOverview';
import { PerformanceChart } from './PerformanceChart';
import { PerformanceLogForm } from './PerformanceLogForm';
import { PerformanceTable } from './PerformanceTable';
import { AutoSyncStatus } from './AutoSyncStatus';
import { MetaAdsConnectDialog } from '../MetaAdsConnectDialog';
import { ExternalAdLinkDialog } from '../ExternalAdLinkDialog';

interface PerformanceDashboardProps {
  adCopyId: string;
  organizationId?: string;
  variations?: AdCopyVariation[];
}

export function PerformanceDashboard({ adCopyId, organizationId, variations = [] }: PerformanceDashboardProps) {
  const [showLogForm, setShowLogForm] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  
  const {
    performanceData,
    summary,
    timeSeries,
    isLoading,
    logPerformance,
    deletePerformance,
  } = useAdCopyPerformance(adCopyId);

  const { connections } = useMetaAdsConnection({ organizationId });
  const hasMetaConnection = connections && connections.length > 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[250px]" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Log Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Performance Dashboard</h3>
          <p className="text-sm text-muted-foreground">
            Theo dõi hiệu suất quảng cáo theo thời gian
          </p>
        </div>
        <Button onClick={() => setShowLogForm(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nhập dữ liệu
        </Button>
      </div>

      {/* Auto Sync Status */}
      {organizationId && (
        <AutoSyncStatus
          adCopyId={adCopyId}
          hasMetaConnection={hasMetaConnection}
          onConnectClick={() => setShowConnectDialog(true)}
          onLinkClick={() => setShowLinkDialog(true)}
        />
      )}

      {/* Overview Cards */}
      <PerformanceOverview summary={summary} />

      {/* Performance Chart */}
      <PerformanceChart data={timeSeries} />

      {/* Performance Table */}
      <PerformanceTable
        data={performanceData}
        variations={variations}
        onDelete={(id) => deletePerformance.mutate(id)}
      />

      {/* Log Form Dialog */}
      <PerformanceLogForm
        open={showLogForm}
        onOpenChange={setShowLogForm}
        onSubmit={(data) => logPerformance.mutate(data)}
        variations={variations}
        isLoading={logPerformance.isPending}
      />

      {/* Meta Ads Connect Dialog */}
      <MetaAdsConnectDialog
        open={showConnectDialog}
        onOpenChange={setShowConnectDialog}
        organizationId={organizationId}
        onSuccess={() => setShowConnectDialog(false)}
      />

      {/* External Ad Link Dialog */}
      {organizationId && (
        <ExternalAdLinkDialog
          open={showLinkDialog}
          onOpenChange={setShowLinkDialog}
          adCopyId={adCopyId}
          organizationId={organizationId}
          onSuccess={() => setShowLinkDialog(false)}
        />
      )}
    </div>
  );
}
