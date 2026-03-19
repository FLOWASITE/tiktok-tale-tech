import { useState } from 'react';
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
import { Search, X, Filter, ChevronDown, Facebook, Palette, SortAsc } from 'lucide-react';
import { Platform, AITool, CarouselStatus, CarouselStyleType, PLATFORM_OPTIONS, AI_TOOL_OPTIONS, CAROUSEL_STATUS_CONFIG, CAROUSEL_STYLE_OPTIONS } from '@/types/carousel';
import { CampaignSelector } from '@/components/campaign/CampaignSelector';
import { cn } from '@/lib/utils';

export interface CarouselFiltersState {
  search: string;
  platform: Platform | 'all';
  aiTool: AITool | 'all';
  status: CarouselStatus | 'all';
  carouselStyle: CarouselStyleType | 'all';
}

interface CarouselFiltersProps {
  filters: CarouselFiltersState;
  onFiltersChange: (filters: CarouselFiltersState) => void;
  sortBy?: string;
  onSortChange?: (value: string) => void;
  campaignFilter?: string;
  onCampaignFilterChange?: (value: string) => void;
}

export function CarouselFilters({ 
  filters, 
  onFiltersChange,
  sortBy,
  onSortChange,
  campaignFilter,
  onCampaignFilterChange,
}: CarouselFiltersProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasActiveFilters =
    filters.search || filters.platform !== 'all' || filters.aiTool !== 'all' || filters.status !== 'all' || filters.carouselStyle !== 'all';

  const activeFilterCount = [
    filters.platform !== 'all',
    filters.aiTool !== 'all',
    filters.status !== 'all',
    filters.carouselStyle !== 'all',
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      platform: 'all',
      aiTool: 'all',
      status: 'all',
      carouselStyle: 'all',
    });
  };

  return (
    <div className="space-y-2">
      {/* Compact single-row filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[140px] max-w-xs">
          <Search className={cn(
            "absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors",
            isSearchFocused ? "text-primary" : "text-muted-foreground"
          )} />
          <Input
            placeholder="Tìm kiếm..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className={cn(
              "h-8 pl-8 pr-3 text-xs bg-background border-border/50",
              isSearchFocused && "border-primary/50 ring-1 ring-primary/20"
            )}
          />
        </div>

        {/* Platform chips - inline */}
        <div className="hidden sm:flex items-center gap-1">
          {PLATFORM_OPTIONS.map((platform) => (
            <Button
              key={platform.value}
              variant={filters.platform === platform.value ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onFiltersChange({ 
                ...filters, 
                platform: filters.platform === platform.value ? 'all' : platform.value 
              })}
              className={cn(
                "h-7 px-2 text-[11px] gap-1",
                filters.platform === platform.value && "bg-primary/10 text-primary border border-primary/30"
              )}
            >
              <Facebook className="w-3 h-3" />
              {platform.label}
            </Button>
          ))}
        </div>

        {/* Sort Select */}
        {onSortChange && (
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-28 h-8 text-[11px] border-border/50 gap-1">
              <SortAsc className="w-3 h-3 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Sắp xếp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Mới nhất</SelectItem>
              <SelectItem value="oldest">Cũ nhất</SelectItem>
              <SelectItem value="name_asc">Tên A-Z</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Campaign Filter */}
        {onCampaignFilterChange && (
          <CampaignSelector
            value={campaignFilter || ''}
            onValueChange={onCampaignFilterChange}
            placeholder="Chiến dịch"
            className="w-36 sm:w-40 [&_button]:h-8 [&_button]:text-[11px]"
          />
        )}

        {/* Advanced toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            "h-7 px-2 text-[11px] gap-1 border-border/50",
            showAdvanced && "bg-primary/10 border-primary/30"
          )}
        >
          <Filter className="w-3 h-3" />
          {activeFilterCount > 0 && (
            <Badge 
              variant="secondary" 
              className="h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-primary text-primary-foreground"
            >
              {activeFilterCount}
            </Badge>
          )}
          <ChevronDown className={cn("w-3 h-3 transition-transform", showAdvanced && "rotate-180")} />
        </Button>

        {/* Clear */}
        <AnimatePresence>
          {hasActiveFilters && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg border border-border/50 bg-muted/30">
              {/* Platform (mobile) */}
              <div className="sm:hidden flex-1 min-w-[120px]">
                <Select
                  value={filters.platform}
                  onValueChange={(v) => onFiltersChange({ ...filters, platform: v as Platform | 'all' })}
                >
                  <SelectTrigger className="w-full h-8 text-xs bg-background/50 border-border/50">
                    <SelectValue placeholder="Nền tảng" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả nền tảng</SelectItem>
                    {PLATFORM_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* AI Tool */}
              <div className="flex-1 min-w-[120px]">
                <Select
                  value={filters.aiTool}
                  onValueChange={(v) => onFiltersChange({ ...filters, aiTool: v as AITool | 'all' })}
                >
                  <SelectTrigger className="w-full h-8 text-xs bg-background/50 border-border/50">
                    <Palette className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="Công cụ AI" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả công cụ</SelectItem>
                    {AI_TOOL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="flex-1 min-w-[120px]">
                <Select
                  value={filters.status}
                  onValueChange={(v) => onFiltersChange({ ...filters, status: v as CarouselStatus | 'all' })}
                >
                  <SelectTrigger className="w-full h-8 text-xs bg-background/50 border-border/50">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    {Object.entries(CAROUSEL_STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Style */}
              <div className="flex-1 min-w-[120px]">
                <Select
                  value={filters.carouselStyle}
                  onValueChange={(v) => onFiltersChange({ ...filters, carouselStyle: v as CarouselStyleType | 'all' })}
                >
                  <SelectTrigger className="w-full h-8 text-xs bg-background/50 border-border/50">
                    <SelectValue placeholder="Kiểu carousel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả kiểu</SelectItem>
                    {CAROUSEL_STYLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.icon} {opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
