import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScriptForm } from '@/components/ScriptForm';
import { ScriptCard } from '@/components/ScriptCard';
import { ScriptViewer } from '@/components/ScriptViewer';
import { ScriptFilters, ScriptFilters as ScriptFiltersType } from '@/components/ScriptFilters';
import { ScriptStats } from '@/components/ScriptStats';
import { useScripts } from '@/hooks/useScripts';
import { Script } from '@/types/script';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SlidePanel } from '@/components/ui/slide-panel';
import { FileVideo, Sparkles, Plus, X } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { scripts, loading, generating, generateScript, deleteScript, updateScript } = useScripts();
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [formSheetOpen, setFormSheetOpen] = useState(false);
  const [filters, setFilters] = useState<ScriptFiltersType>({
    search: '',
    videoType: 'all',
    characterType: 'all',
    duration: 'all',
  });

  const filteredScripts = useMemo(() => {
    return scripts.filter((script) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          script.title.toLowerCase().includes(searchLower) ||
          script.topic.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      if (filters.videoType !== 'all' && script.video_type !== filters.videoType) {
        return false;
      }

      if (filters.characterType !== 'all' && script.character_type !== filters.characterType) {
        return false;
      }

      if (filters.duration !== 'all' && script.duration !== filters.duration) {
        return false;
      }

      return true;
    });
  }, [scripts, filters]);

  const handleViewScript = (script: Script) => {
    setSelectedScript(script);
    setViewerOpen(true);
  };

  const handleGenerateScript = async (formData: Parameters<typeof generateScript>[0]) => {
    setFormSheetOpen(false);
    const newScript = await generateScript(formData);
    if (newScript) {
      setSelectedScript(newScript);
      setViewerOpen(true);
    }
  };

  const handleScriptUpdate = (updatedScript: Script) => {
    updateScript(updatedScript);
    setSelectedScript(updatedScript);
  };

  return (
    <div className="min-h-screen relative">
      {/* Header Bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <FileVideo className="w-5 h-5 text-primary" />
              Quản lý kịch bản Video
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredScripts.length} / {scripts.length} kịch bản
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setFormSheetOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Thêm mới
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="h-9 w-9"
              title="Đóng"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Stats Cards */}
        <ScriptStats scripts={scripts} loading={loading} />

        {/* Filters */}
        <ScriptFilters filters={filters} onFiltersChange={setFilters} />

        {/* Content Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="gradient-card border-border/50">
                <div className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/4 mb-4" />
                  <div className="flex gap-2 mb-4">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 flex-1" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredScripts.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
              <FileVideo className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {scripts.length === 0 ? 'Chưa có kịch bản nào' : 'Không tìm thấy kịch bản'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
              {scripts.length === 0
                ? 'Nhấn nút "Thêm mới" để tạo kịch bản video đầu tiên.'
                : 'Thử thay đổi bộ lọc để xem thêm kịch bản.'}
            </p>
            {scripts.length === 0 && (
              <Button onClick={() => setFormSheetOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Tạo kịch bản mới
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredScripts.map((script, index) => (
              <div
                key={script.id}
                className="stagger-item"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ScriptCard
                  script={script}
                  onView={handleViewScript}
                  onDelete={deleteScript}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Panel - Below Header */}
      <SlidePanel
        open={formSheetOpen}
        onOpenChange={setFormSheetOpen}
        title={
          <>
            <Sparkles className="w-5 h-5 text-primary" />
            Tạo Kịch Bản Video Mới
          </>
        }
        description="Điền thông tin để AI tạo kịch bản video chuyên nghiệp"
        className="md:max-w-xl lg:max-w-2xl"
      >
        <ScriptForm onSubmit={handleGenerateScript} isLoading={generating} />
      </SlidePanel>

      {/* Script viewer dialog */}
      <ScriptViewer
        script={selectedScript}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        onScriptUpdate={handleScriptUpdate}
      />
    </div>
  );
};

export default Index;
