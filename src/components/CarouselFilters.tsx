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
import { Search, X, Filter, ChevronDown, Facebook, Palette } from 'lucide-react';
import { Platform, AITool, CarouselStatus, CarouselStyleType, PLATFORM_OPTIONS, AI_TOOL_OPTIONS, CAROUSEL_STATUS_CONFIG, CAROUSEL_STYLE_OPTIONS } from '@/types/carousel';
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
}

const slideCountPresets = [
  { label: '5 slides', value: 5 },
  { label: '7 slides', value: 7 },
  { label: '10 slides', value: 10 },
];

export function CarouselFilters({ filters, onFiltersChange }: CarouselFiltersProps) {
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
    <div className="space-y-3">
      {/* Main Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <motion.div
            animate={{ 
              scale: isSearchFocused ? 1.02 : 1,
              x: isSearchFocused ? 2 : 0 
            }}
            transition={{ duration: 0.2 }}
            className="absolute left-3 top-1/2 -translate-y-1/2"
          >
            <Search className={cn(
              "w-4 h-4 transition-colors duration-200",
              isSearchFocused ? "text-primary" : "text-muted-foreground"
            )} />
          </motion.div>
          <Input
            placeholder="Tìm theo chủ đề, tiêu đề..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className={cn(
              "pl-9 bg-transparent border-border/50 transition-all duration-200",
              isSearchFocused && "border-primary/50 ring-1 ring-primary/20"
            )}
          />
        </div>

        {/* Platform Quick Filters */}
        <div className="hidden sm:flex items-center gap-1.5">
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
                "h-8 px-3 text-xs gap-1.5 transition-all duration-200",
                filters.platform === platform.value && "bg-primary/10 text-primary border border-primary/30"
              )}
            >
              <Facebook className="w-3 h-3" />
              {platform.label}
            </Button>
          ))}
        </div>

        {/* Advanced Filter Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            "h-8 px-3 text-xs gap-1.5 border-border/50",
            showAdvanced && "bg-primary/10 border-primary/30"
          )}
        >
          <Filter className="w-3 h-3" />
          <span className="hidden sm:inline">Bộ lọc</span>
          {activeFilterCount > 0 && (
            <Badge 
              variant="secondary" 
              className="h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground"
            >
              {activeFilterCount}
            </Badge>
          )}
          <ChevronDown className={cn(
            "w-3 h-3 transition-transform duration-200",
            showAdvanced && "rotate-180"
          )} />
        </Button>

        {/* Clear Filters */}
        <AnimatePresence>
          {hasActiveFilters && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 px-3 text-xs gap-1.5 text-muted-foreground hover:text-destructive"
              >
                <X className="w-3 h-3" />
                Xóa bộ lọc
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
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/30">
              {/* Platform Select (Mobile) */}
              <div className="sm:hidden w-full">
                <Select
                  value={filters.platform}
                  onValueChange={(v) => onFiltersChange({ ...filters, platform: v as Platform | 'all' })}
                >
                  <SelectTrigger className="w-full bg-background/50 border-border/50">
                    <Facebook className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Nền tảng" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả nền tảng</SelectItem>
                    {PLATFORM_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* AI Tool Select */}
              <div className="flex-1 min-w-[150px]">
                <Select
                  value={filters.aiTool}
                  onValueChange={(v) => onFiltersChange({ ...filters, aiTool: v as AITool | 'all' })}
                >
                  <SelectTrigger className="w-full bg-background/50 border-border/50">
                    <Palette className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Công cụ AI" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả công cụ</SelectItem>
                    {AI_TOOL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Select */}
              <div className="flex-1 min-w-[150px]">
                <Select
                  value={filters.status}
                  onValueChange={(v) => onFiltersChange({ ...filters, status: v as CarouselStatus | 'all' })}
                >
                  <SelectTrigger className="w-full bg-background/50 border-border/50">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    {Object.entries(CAROUSEL_STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Carousel Style Select */}
              <div className="flex-1 min-w-[150px]">
                <Select
                  value={filters.carouselStyle}
                  onValueChange={(v) => onFiltersChange({ ...filters, carouselStyle: v as CarouselStyleType | 'all' })}
                >
                  <SelectTrigger className="w-full bg-background/50 border-border/50">
                    <SelectValue placeholder="Kiểu carousel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả kiểu</SelectItem>
                    {CAROUSEL_STYLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.icon} {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* AI Tool Quick Chips */}
              <div className="hidden md:flex items-center gap-1.5">
                {AI_TOOL_OPTIONS.slice(0, 3).map((tool) => (
                  <Button
                    key={tool.value}
                    variant={filters.aiTool === tool.value ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => onFiltersChange({ 
                      ...filters, 
                      aiTool: filters.aiTool === tool.value ? 'all' : tool.value 
                    })}
                    className={cn(
                      "h-7 px-2.5 text-xs transition-all duration-200",
                      filters.aiTool === tool.value && "bg-primary/10 text-primary border border-primary/30"
                    )}
                  >
                    {tool.label}
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
