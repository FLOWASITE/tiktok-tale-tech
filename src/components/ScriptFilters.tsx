import { useState } from 'react';
import { Search, X, ChevronDown, Filter, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { VIDEO_TYPE_LABELS, CHARACTER_TYPE_LABELS, DURATION_LABELS, VideoType, CharacterType, Duration } from '@/types/script';
import { cn } from '@/lib/utils';

export interface ScriptFilters {
  search: string;
  videoType: VideoType | 'all';
  characterType: CharacterType | 'all';
  duration: Duration | 'all';
}

interface ScriptFiltersProps {
  filters: ScriptFilters;
  onFiltersChange: (filters: ScriptFilters) => void;
}

const durationChips = [
  { value: 30, label: '30s' },
  { value: 60, label: '1 phút' },
  { value: 90, label: '1.5 phút' },
  { value: 180, label: '3 phút' },
];

export function ScriptFilters({ filters, onFiltersChange }: ScriptFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const hasActiveFilters = 
    filters.search || 
    filters.videoType !== 'all' || 
    filters.characterType !== 'all' || 
    filters.duration !== 'all';

  const activeFilterCount = [
    filters.videoType !== 'all',
    filters.characterType !== 'all',
    filters.duration !== 'all',
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      videoType: 'all',
      characterType: 'all',
      duration: 'all',
    });
  };

  return (
    <div className="space-y-2">
      {/* Single compact row */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/40">
        {/* Search */}
        <div className={cn(
          "relative flex-1 min-w-[140px] max-w-[220px] transition-all duration-200",
          searchFocused && "max-w-[280px]"
        )}>
          <Search className={cn(
            "absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors",
            searchFocused ? "text-primary" : "text-muted-foreground"
          )} />
          <Input
            placeholder="Tìm kiếm..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className={cn(
              "pl-8 h-8 text-xs bg-background/50 border-border/40",
              searchFocused && "ring-1 ring-primary/20 border-primary/40"
            )}
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0.5 top-1/2 -translate-y-1/2 h-5 w-5"
              onClick={() => onFiltersChange({ ...filters, search: '' })}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border/40 hidden sm:block" />

        {/* Video Type */}
        <Select
          value={filters.videoType}
          onValueChange={(value) => onFiltersChange({ ...filters, videoType: value as VideoType | 'all' })}
        >
          <SelectTrigger className="w-[110px] h-8 text-[11px] bg-background/50 border-border/40 gap-1">
            <SelectValue placeholder="Thể loại" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả thể loại</SelectItem>
            {Object.entries(VIDEO_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Duration chips inline */}
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => onFiltersChange({ ...filters, duration: 'all' })}
            className={cn(
              "px-1.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all",
              filters.duration === 'all'
                ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            Tất cả
          </button>
          {durationChips.map((chip) => (
            <button
              key={chip.value}
              onClick={() => onFiltersChange({ ...filters, duration: chip.value as Duration })}
              className={cn(
                "px-1.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-0.5",
                filters.duration === chip.value
                  ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Clock className="w-2.5 h-2.5" />
              {chip.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border/40 hidden sm:block" />

        {/* More filters toggle */}
        <div className="flex items-center gap-1">
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 gap-1 px-2 text-[11px] bg-background/50 border-border/40",
                  isExpanded && "bg-primary/10 border-primary/30 text-primary"
                )}
              >
                <Filter className="w-3 h-3" />
                {activeFilterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-3.5 min-w-3.5 p-0 flex items-center justify-center text-[9px] bg-primary text-primary-foreground"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
                <ChevronDown className={cn(
                  "w-2.5 h-2.5 transition-transform duration-200",
                  isExpanded && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>

          <AnimatePresence>
            {hasActiveFilters && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearFilters}
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Xóa bộ lọc"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-2.5 rounded-lg bg-background/40 backdrop-blur-sm border border-border/30"
          >
            <div className="flex flex-wrap items-center gap-2">
              {/* Character Type */}
              <Select
                value={filters.characterType}
                onValueChange={(value) => onFiltersChange({ ...filters, characterType: value as CharacterType | 'all' })}
              >
                <SelectTrigger className="w-[120px] h-8 text-xs bg-background/50 border-border/40">
                  <SelectValue placeholder="Nhân vật" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả nhân vật</SelectItem>
                  {Object.entries(CHARACTER_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Duration Dropdown (alternative) */}
              <Select
                value={String(filters.duration)}
                onValueChange={(value) => onFiltersChange({ ...filters, duration: value === 'all' ? 'all' : Number(value) as Duration })}
              >
                <SelectTrigger className="w-[130px] h-8 text-xs bg-background/50 border-border/40">
                  <SelectValue placeholder="Thời lượng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả thời lượng</SelectItem>
                  {Object.entries(DURATION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
