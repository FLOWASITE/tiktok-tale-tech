/**
 * AdminIndustriesV2 - Updated admin page for Industry Park v2 architecture
 * Scientific classification with category sidebar, advanced filters, Core/Sub tabs
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IndustryBrowserV2 } from '@/components/admin/IndustryBrowserV2';
import { IndustryPackDetailView } from '@/components/admin/IndustryPackDetailView';
import { IndustryExcelImportDialog } from '@/components/admin/IndustryExcelImportDialog';
import { IndustryJsonImporter } from '@/components/admin/IndustryJsonImporter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminCategories from '@/pages/AdminCategories';
import {
  Layers,
  Upload,
  Database,
  MapPin,
  Globe,
  ArrowLeft,
  FileJson,
  Bookmark,
} from 'lucide-react';

export function AdminIndustriesV2() {
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isJsonImportOpen, setIsJsonImportOpen] = useState(false);

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
    <div className="container py-3 md:py-6 space-y-3 md:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 md:gap-4">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {selectedPackId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPackId(null)}
              className="mr-1 md:mr-2 px-2"
            >
              <ArrowLeft className="h-4 w-4 md:mr-1" />
              <span className="hidden md:inline">Quay lại</span>
            </Button>
          )}
          <div className="p-1.5 md:p-2 rounded-lg bg-primary/10 shrink-0">
            <Layers className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2 truncate">
              Industry Park
              <Badge variant="secondary" className="text-xs hidden md:inline-flex">v2.1</Badge>
            </h1>
            <p className="text-sm text-muted-foreground hidden md:block">
              Quản lý Global Packs và Jurisdiction Profiles
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsJsonImportOpen(true)} className="px-2 md:px-3">
            <FileJson className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Import JSON</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(true)} className="px-2 md:px-3">
            <Upload className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Import Excel</span>
          </Button>
        </div>
      </div>

      {/* Import Dialogs */}
      <IndustryExcelImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onSuccess={() => {}}
      />
      <IndustryJsonImporter
        open={isJsonImportOpen}
        onOpenChange={setIsJsonImportOpen}
        onSuccess={() => {}}
      />

      {/* Stats Cards - Compact */}
      <div className="grid gap-2 md:gap-3 grid-cols-4">
        <div className="bg-card border rounded-lg p-2 md:p-3 flex items-center gap-2 md:gap-3">
          <div className="p-1 md:p-1.5 rounded-lg bg-blue-500/10 shrink-0">
            <Globe className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
          </div>
          <div className="min-w-0">
            {statsLoading ? (
              <Skeleton className="h-5 w-8 md:h-6 md:w-10" />
            ) : (
              <p className="text-sm md:text-xl font-bold leading-tight">{stats?.packs ?? 0}</p>
            )}
            <p className="text-[10px] md:text-xs text-muted-foreground hidden md:block">Total Packs</p>
            <p className="text-[10px] text-muted-foreground md:hidden">Packs</p>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-2 md:p-3 flex items-center gap-2 md:gap-3">
          <div className="p-1 md:p-1.5 rounded-lg bg-primary/10 shrink-0">
            <Layers className="h-3 w-3 md:h-4 md:w-4 text-primary" />
          </div>
          <div className="min-w-0">
            {statsLoading ? (
              <Skeleton className="h-5 w-12 md:h-6 md:w-16" />
            ) : (
              <div className="flex items-baseline gap-0.5 md:gap-1">
                <span className="text-sm md:text-xl font-bold leading-tight">{stats?.corePacks ?? 0}</span>
                <span className="text-[10px] md:text-xs text-muted-foreground">/</span>
                <span className="text-xs md:text-lg font-semibold text-orange-600">{stats?.subPacks ?? 0}</span>
              </div>
            )}
            <p className="text-[10px] md:text-xs text-muted-foreground">Core/Sub</p>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-2 md:p-3 flex items-center gap-2 md:gap-3">
          <div className="p-1 md:p-1.5 rounded-lg bg-green-500/10 shrink-0">
            <MapPin className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
          </div>
          <div className="min-w-0">
            {statsLoading ? (
              <Skeleton className="h-5 w-8 md:h-6 md:w-10" />
            ) : (
              <p className="text-sm md:text-xl font-bold leading-tight">{stats?.profiles ?? 0}</p>
            )}
            <p className="text-[10px] md:text-xs text-muted-foreground">Profiles</p>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-2 md:p-3 flex items-center gap-2 md:gap-3">
          <div className="p-1 md:p-1.5 rounded-lg bg-purple-500/10 shrink-0">
            <Database className="h-3 w-3 md:h-4 md:w-4 text-purple-500" />
          </div>
          <div className="min-w-0">
            {statsLoading ? (
              <Skeleton className="h-5 w-8 md:h-6 md:w-10" />
            ) : (
              <p className="text-sm md:text-xl font-bold leading-tight">{stats?.translations ?? 0}</p>
            )}
            <p className="text-[10px] md:text-xs text-muted-foreground hidden md:block">Translations</p>
            <p className="text-[10px] text-muted-foreground md:hidden">Trans.</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {selectedPackId ? (
        <IndustryPackDetailView
          globalPackId={selectedPackId}
          onBack={() => setSelectedPackId(null)}
        />
      ) : (
        <IndustryBrowserV2
          selectedPackId={selectedPackId}
          onSelectPack={setSelectedPackId}
        />
      )}
    </div>
  );
}

export default AdminIndustriesV2;
