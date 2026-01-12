/**
 * AdminIndustriesV2 - Updated admin page for Industry Park v2 architecture
 * Now supports hierarchical view with Core/Sub industries
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GlobalPacksTable } from '@/components/admin/GlobalPacksTable';
import { HierarchicalPacksTable } from '@/components/admin/HierarchicalPacksTable';
import { JurisdictionProfilesPanel } from '@/components/admin/JurisdictionProfilesPanel';
import { IndustryImportDialog } from '@/components/admin/IndustryImportDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Globe,
  Upload,
  Database,
  MapPin,
  Layers,
  FolderTree,
  List,
} from 'lucide-react';

type ViewMode = 'hierarchy' | 'flat';

export function AdminIndustriesV2() {
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('hierarchy');

  // Fetch real stats from database
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['industryParkStats'],
    queryFn: async () => {
      const [packs, profiles, translations, corePacks, subPacks] = await Promise.all([
        supabase.from('industry_global_packs').select('id', { count: 'exact', head: true }),
        supabase.from('industry_jurisdiction_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('industry_pack_translations').select('id', { count: 'exact', head: true }),
        supabase.from('industry_global_packs').select('id', { count: 'exact', head: true }).eq('industry_level', 'core'),
        supabase.from('industry_global_packs').select('id', { count: 'exact', head: true }).eq('industry_level', 'sub'),
      ]);
      return {
        packs: packs.count || 0,
        profiles: profiles.count || 0,
        translations: translations.count || 0,
        corePacks: corePacks.count || 0,
        subPacks: subPacks.count || 0,
      };
    },
    staleTime: 60 * 1000, // 1 minute
  });

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Layers className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              Industry Park
              <Badge variant="secondary" className="text-xs">v2.1</Badge>
            </h1>
            <p className="text-muted-foreground">
              Quản lý Global Packs và Jurisdiction Profiles
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="hierarchy" className="gap-1">
                <FolderTree className="h-4 w-4" />
                Hierarchy
              </TabsTrigger>
              <TabsTrigger value="flat" className="gap-1">
                <List className="h-4 w-4" />
                Flat
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        </div>
      </div>

      {/* Import Dialog */}
      <IndustryImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onSuccess={() => {}}
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Globe className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              {statsLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <p className="text-2xl font-bold">{stats?.packs ?? 0}</p>
              )}
              <p className="text-sm text-muted-foreground">Total Packs</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              {statsLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">{stats?.corePacks ?? 0}</p>
                  <span className="text-sm text-muted-foreground">core</span>
                  <span className="text-muted-foreground">/</span>
                  <p className="text-lg font-semibold text-orange-600">{stats?.subPacks ?? 0}</p>
                  <span className="text-sm text-muted-foreground">sub</span>
                </div>
              )}
              <p className="text-sm text-muted-foreground">Hierarchy</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <MapPin className="h-5 w-5 text-green-500" />
            </div>
            <div>
              {statsLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <p className="text-2xl font-bold">{stats?.profiles ?? 0}</p>
              )}
              <p className="text-sm text-muted-foreground">Jurisdiction Profiles</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Database className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              {statsLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <p className="text-2xl font-bold">{stats?.translations ?? 0}</p>
              )}
              <p className="text-sm text-muted-foreground">Translations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {selectedPackId ? (
        <JurisdictionProfilesPanel
          globalPackId={selectedPackId}
          onBack={() => setSelectedPackId(null)}
        />
      ) : viewMode === 'hierarchy' ? (
        <HierarchicalPacksTable
          selectedPackId={selectedPackId}
          onSelectPack={setSelectedPackId}
        />
      ) : (
        <GlobalPacksTable
          selectedPackId={selectedPackId}
          onSelectPack={setSelectedPackId}
        />
      )}
    </div>
  );
}

export default AdminIndustriesV2;
