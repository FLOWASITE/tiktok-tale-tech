import { useState } from 'react';
import { Search, X, ChevronDown, Filter, Zap, Clock } from 'lucide-react';
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
    <div className="space-y-3">
      {/* Main Filter Bar - Glassmorphism */}
      <div className="relative p-3 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search with animated icon */}
          <div className={cn(
            "relative flex-1 min-w-[180px] max-w-[300px] transition-all duration-300",
            searchFocused && "flex-[2]"
          )}>
            <Search className={cn(
              "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors duration-200",
              searchFocused ? "text-primary" : "text-muted-foreground"
            )} />
            <Input
              placeholder="Tìm theo chủ đề hoặc tiêu đề..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className={cn(
                "pl-9 h-9 text-sm bg-background/50 border-border/50 transition-all duration-200",
                searchFocused && "ring-2 ring-primary/20 border-primary/50"
              )}
            />
            {filters.search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => onFiltersChange({ ...filters, search: '' })}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* Video Type Filter */}
          <Select
            value={filters.videoType}
            onValueChange={(value) => onFiltersChange({ ...filters, videoType: value as VideoType | 'all' })}
          >
            <SelectTrigger className="w-[130px] h-9 text-xs bg-background/50 border-border/50">
              <SelectValue placeholder="Thể loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả thể loại</SelectItem>
              {Object.entries(VIDEO_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Character Type Filter */}
          <Select
            value={filters.characterType}
            onValueChange={(value) => onFiltersChange({ ...filters, characterType: value as CharacterType | 'all' })}
          >
            <SelectTrigger className="w-[120px] h-9 text-xs bg-background/50 border-border/50">
              <SelectValue placeholder="Nhân vật" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nhân vật</SelectItem>
              {Object.entries(CHARACTER_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Advanced Filters Toggle */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(
                  "h-9 gap-1.5 text-xs bg-background/50 border-border/50 transition-all duration-200",
                  isExpanded && "bg-primary/10 border-primary/30 text-primary"
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Thêm</span>
                {activeFilterCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="h-4 min-w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground animate-pulse"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
                <ChevronDown className={cn(
                  "w-3 h-3 transition-transform duration-200", 
                  isExpanded && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>

          {/* Clear All */}
          <AnimatePresence>
            {hasActiveFilters && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-9 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Xóa bộ lọc
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Duration Filters */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
          <Zap className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground mr-1">Thời lượng:</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onFiltersChange({ ...filters, duration: 'all' })}
              className={cn(
                "px-2 py-1 rounded-md text-xs font-medium transition-all duration-200",
                filters.duration === 'all'
                  ? "bg-primary/20 text-primary ring-1 ring-primary/30"
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
                  "px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1",
                  filters.duration === chip.value
                    ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Clock className="w-2.5 h-2.5" />
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced Filters (Collapsible) */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-xl bg-background/40 backdrop-blur-sm border border-border/30"
          >
            <div className="flex flex-wrap items-center gap-2">
              {/* Duration Dropdown (alternative) */}
              <Select
                value={String(filters.duration)}
                onValueChange={(value) => onFiltersChange({ ...filters, duration: value === 'all' ? 'all' : Number(value) as Duration })}
              >
                <SelectTrigger className="w-[140px] h-9 text-xs bg-background/50 border-border/50">
                  <SelectValue placeholder="Thời lượng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả thời lượng</SelectItem>
                  {Object.entries(DURATION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <p className="text-xs text-muted-foreground">
                Sử dụng các bộ lọc để tìm kịch bản phù hợp nhanh hơn
              </p>
            </div>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
