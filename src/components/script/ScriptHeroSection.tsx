import { useMemo } from 'react';
import { 
  FileVideo, 
  CheckCircle2, 
  Clock, 
  Plus, 
  RefreshCw,
  LayoutGrid,
  List,
  Clapperboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Script } from '@/types/script';
import { cn } from '@/lib/utils';

interface ScriptHeroSectionProps {
  scripts: Script[];
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onAddNew: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function ScriptHeroSection({
  scripts,
  viewMode,
  onViewModeChange,
  onAddNew,
  onRefresh,
  isLoading,
}: ScriptHeroSectionProps) {
  const stats = useMemo(() => {
    const total = scripts.length;
    const published = scripts.filter(s => s.status === 'published').length;
    const review = scripts.filter(s => s.status === 'review').length;
    const draft = scripts.filter(s => s.status === 'draft').length;
    const completionRate = total > 0 ? Math.round((published / total) * 100) : 0;
    return { total, published, review, draft, completionRate };
  }, [scripts]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: title + inline stats */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          <Clapperboard className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground truncate">Kịch bản</h2>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <FileVideo className="w-3 h-3" />
              {stats.total}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-green-600">
              <CheckCircle2 className="w-3 h-3" />
              {stats.published}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-yellow-600">
              <Clock className="w-3 h-3" />
              {stats.review + stats.draft}
            </span>
            {stats.total > 0 && (
              <span className="text-[11px] text-muted-foreground">
                · {stats.completionRate}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 shrink-0">
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-8 w-8 p-0 border-border/50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          </Button>
        )}

        <ToggleGroup 
          type="single" 
          value={viewMode} 
          onValueChange={(v) => v && onViewModeChange(v as 'grid' | 'list')} 
          className="border border-border/50 rounded-md p-0.5"
        >
          <ToggleGroupItem 
            value="grid" 
            aria-label="Grid view" 
            className="h-7 w-7 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="list" 
            aria-label="List view" 
            className="h-7 w-7 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <List className="h-3.5 w-3.5" />
          </ToggleGroupItem>
        </ToggleGroup>

        <Button 
          onClick={onAddNew} 
          size="sm" 
          className="h-8 gap-1.5 text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm mới
        </Button>
      </div>
    </div>
  );
}
