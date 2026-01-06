import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, ChevronDown, Zap, Calendar, ArrowUpDown, SortAsc, SortDesc, Trash2, CheckSquare, Download, MoreHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { AD_PLATFORMS, AD_COPY_STATUSES, AD_OBJECTIVES, FUNNEL_STAGES, LEGACY_PLATFORMS } from '@/types/adCopy';

export type DatePreset = 'all' | 'today' | '7days' | '30days' | '90days';
export type SortOption = 'created_desc' | 'created_asc' | 'title_asc' | 'title_desc' | 'status' | 'platform' | 'variations';

const SORT_OPTIONS = [
  { value: 'created_desc', label: 'Mới nhất', icon: SortDesc },
  { value: 'created_asc', label: 'Cũ nhất', icon: SortAsc },
  { value: 'title_asc', label: 'Tên A-Z', icon: SortAsc },
  { value: 'title_desc', label: 'Tên Z-A', icon: SortDesc },
  { value: 'status', label: 'Trạng thái', icon: ArrowUpDown },
  { value: 'platform', label: 'Platform', icon: ArrowUpDown },
  { value: 'variations', label: 'Số variations', icon: SortDesc },
];

interface AdCopyFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  platformFilter: string;
  onPlatformFilterChange: (value: string) => void;
  objectiveFilter: string;
  onObjectiveFilterChange: (value: string) => void;
  funnelFilter: string;
  onFunnelFilterChange: (value: string) => void;
  datePreset?: DatePreset;
  onDatePresetChange?: (value: DatePreset) => void;
  campaignFilter?: string;
  onCampaignFilterChange?: (value: string) => void;
  campaigns?: Array<{ id: string; name: string }>;
  brandFilter?: string;
  onBrandFilterChange?: (value: string) => void;
  brands?: Array<{ id: string; brand_name: string }>;
  // New Phase 5 props
  sortOption?: SortOption;
  onSortChange?: (value: SortOption) => void;
  selectedCount?: number;
  onBulkDelete?: () => void;
  onBulkStatusChange?: (status: string) => void;
  onBulkExport?: () => void;
  onClearSelection?: () => void;
}

const STATUS_CHIPS = [
  { value: 'all', label: 'Tất cả' },
  ...AD_COPY_STATUSES.map(s => ({ value: s.value, label: s.label }))
];

const DATE_PRESETS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'today', label: 'Hôm nay' },
  { value: '7days', label: '7 ngày' },
  { value: '30days', label: '30 ngày' },
  { value: '90days', label: '90 ngày' },
];

export function AdCopyFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  platformFilter,
  onPlatformFilterChange,
  objectiveFilter,
  onObjectiveFilterChange,
  funnelFilter,
  onFunnelFilterChange,
  datePreset = 'all',
  onDatePresetChange,
  campaignFilter = 'all',
  onCampaignFilterChange,
  campaigns = [],
  brandFilter = 'all',
  onBrandFilterChange,
  brands = [],
  // New Phase 5 props
  sortOption = 'created_desc',
  onSortChange,
  selectedCount = 0,
  onBulkDelete,
  onBulkStatusChange,
  onBulkExport,
  onClearSelection,
}: AdCopyFiltersProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const currentSort = SORT_OPTIONS.find(s => s.value === sortOption) || SORT_OPTIONS[0];

  const hasActiveFilters = statusFilter !== 'all' || 
                           platformFilter !== 'all' || 
                           objectiveFilter !== 'all' || 
                           funnelFilter !== 'all' ||
                           datePreset !== 'all' ||
                           campaignFilter !== 'all' ||
                           brandFilter !== 'all' ||
                           searchQuery.length > 0;

  const activeFilterCount = [
    statusFilter !== 'all',
    platformFilter !== 'all',
    objectiveFilter !== 'all',
    funnelFilter !== 'all',
    datePreset !== 'all',
    campaignFilter !== 'all',
    brandFilter !== 'all',
  ].filter(Boolean).length;

  const clearFilters = () => {
    onSearchChange('');
    onStatusFilterChange('all');
    onPlatformFilterChange('all');
    onObjectiveFilterChange('all');
    onFunnelFilterChange('all');
    onDatePresetChange?.('all');
    onCampaignFilterChange?.('all');
    onBrandFilterChange?.('all');
  };

  return (
    <div className="space-y-3">
      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{selectedCount} đã chọn</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearSelection}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Bỏ chọn
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Status Change Dropdown */}
                {onBulkStatusChange && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1 text-xs">
                        <ArrowUpDown className="h-3 w-3" />
                        Đổi trạng thái
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel className="text-xs">Chọn trạng thái mới</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {AD_COPY_STATUSES.map(status => (
                        <DropdownMenuItem 
                          key={status.value} 
                          onClick={() => onBulkStatusChange(status.value)}
                          className="text-xs"
                        >
                          <div className={cn("w-2 h-2 rounded-full mr-2", status.bgColor)} />
                          {status.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Export Button */}
                {onBulkExport && (
                  <Button variant="outline" size="sm" onClick={onBulkExport} className="gap-1 text-xs">
                    <Download className="h-3 w-3" />
                    Export
                  </Button>
                )}

                {/* Delete Button */}
                {onBulkDelete && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onBulkDelete}
                    className="gap-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  >
                    <Trash2 className="h-3 w-3" />
                    Xóa
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200",
            searchFocused ? "text-primary" : "text-muted-foreground"
          )} />
          <Input
            placeholder="Tìm kiếm ad copy..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className={cn(
              "pl-9 pr-9 bg-background/60 backdrop-blur-sm border-border/50 transition-all duration-200",
              searchFocused && "border-primary/50 ring-2 ring-primary/20"
            )}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => onStatusFilterChange(chip.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
                "border border-border/50 hover:border-primary/50",
                statusFilter === chip.value
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                  : "bg-background/60 backdrop-blur-sm hover:bg-muted/50"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Platform Filter */}
        <Select value={platformFilter} onValueChange={onPlatformFilterChange}>
          <SelectTrigger className="w-[160px] bg-background/60 backdrop-blur-sm border-border/50">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả Platform</SelectItem>
            {AD_PLATFORMS.map(p => (
              <SelectItem key={p.value} value={p.value}>
                {p.icon} {p.label}
              </SelectItem>
            ))}
            {/* Legacy platforms for filtering old data */}
            {LEGACY_PLATFORMS.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs text-muted-foreground border-t mt-1 pt-2">
                  Legacy Platforms
                </div>
                {LEGACY_PLATFORMS.map(p => (
                  <SelectItem key={p.value} value={p.value} className="text-muted-foreground">
                    📦 {p.label}
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>

        {/* Sort Dropdown */}
        {onSortChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-background/60 backdrop-blur-sm border-border/50"
              >
                <currentSort.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{currentSort.label}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs">Sắp xếp theo</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SORT_OPTIONS.map(option => (
                <DropdownMenuItem 
                  key={option.value}
                  onClick={() => onSortChange(option.value as SortOption)}
                  className={cn("text-xs gap-2", sortOption === option.value && "bg-primary/10")}
                >
                  <option.icon className="h-3 w-3" />
                  {option.label}
                  {sortOption === option.value && <Zap className="h-3 w-3 ml-auto text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Advanced Filter Toggle */}
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "gap-2 bg-background/60 backdrop-blur-sm border-border/50",
                isAdvancedOpen && "border-primary/50 bg-primary/5"
              )}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Lọc nâng cao</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform duration-200",
                isAdvancedOpen && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
        </Collapsible>

        {/* Clear Filters */}
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
                onClick={clearFilters}
                className="gap-1 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
                Xóa bộ lọc
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Advanced Filters */}
      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleContent>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Objective Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Mục tiêu</label>
                <Select value={objectiveFilter} onValueChange={onObjectiveFilterChange}>
                  <SelectTrigger className="bg-background border-border/50">
                    <SelectValue placeholder="Chọn mục tiêu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {AD_OBJECTIVES.map(o => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.icon} {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Funnel Stage Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Giai đoạn Funnel</label>
                <Select value={funnelFilter} onValueChange={onFunnelFilterChange}>
                  <SelectTrigger className="bg-background border-border/50">
                    <SelectValue placeholder="Chọn giai đoạn" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {FUNNEL_STAGES.map(f => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Campaign Filter */}
              {campaigns.length > 0 && onCampaignFilterChange && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Chiến dịch</label>
                  <Select value={campaignFilter} onValueChange={onCampaignFilterChange}>
                    <SelectTrigger className="bg-background border-border/50">
                      <SelectValue placeholder="Chọn chiến dịch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      {campaigns.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Brand Filter */}
              {brands.length > 0 && onBrandFilterChange && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Brand Template</label>
                  <Select value={brandFilter} onValueChange={onBrandFilterChange}>
                    <SelectTrigger className="bg-background border-border/50">
                      <SelectValue placeholder="Chọn brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      {brands.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.brand_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Quick Date Presets */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Thời gian tạo
              </label>
              <div className="flex flex-wrap gap-2">
                {DATE_PRESETS.map((preset) => (
                  <Button
                    key={preset.value}
                    variant={datePreset === preset.value ? "secondary" : "outline"}
                    size="sm"
                    className={cn(
                      "text-xs",
                      datePreset === preset.value && "bg-primary/10 border-primary/30 text-primary"
                    )}
                    onClick={() => onDatePresetChange?.(preset.value as DatePreset)}
                  >
                    {preset.value === datePreset && <Zap className="h-3 w-3 mr-1 text-yellow-500" />}
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
