import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Megaphone, Plus, LayoutGrid, List, RefreshCw, Send, Clock, TrendingUp, 
  CheckCircle, FileText, Target, Layers, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { AdCopy } from '@/types/adCopy';
import { AD_PLATFORMS, getPlatformLabel } from '@/types/adCopy';

interface AdCopyHeroSectionProps {
  adCopies: AdCopy[];
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onAddNew: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  onFilterByStatus?: (status: string) => void;
}

export function AdCopyHeroSection({
  adCopies,
  viewMode,
  onViewModeChange,
  onAddNew,
  onRefresh,
  isLoading,
  onFilterByStatus
}: AdCopyHeroSectionProps) {
  const stats = useMemo(() => {
    const total = adCopies.length;
    const published = adCopies.filter(a => a.status === 'published').length;
    const review = adCopies.filter(a => a.status === 'review').length;
    const approved = adCopies.filter(a => a.status === 'approved').length;
    const draft = adCopies.filter(a => a.status === 'draft').length;
    
    // Count approved variations
    const totalVariations = adCopies.reduce((acc, ad) => acc + (ad.variations?.length || 0), 0);
    const approvedVariations = adCopies.reduce((acc, ad) => 
      acc + (ad.variations?.filter(v => v.is_approved).length || 0), 0
    );
    
    // Platform distribution
    const platformCounts: Record<string, number> = {};
    adCopies.forEach(ad => {
      platformCounts[ad.platform] = (platformCounts[ad.platform] || 0) + 1;
    });
    
    // Top 4 platforms
    const topPlatforms = Object.entries(platformCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    
    return {
      total,
      published,
      review,
      approved,
      draft,
      totalVariations,
      approvedVariations,
      approvalRate: totalVariations > 0 ? Math.round((approvedVariations / totalVariations) * 100) : 0,
      completionRate: total > 0 ? Math.round((published / total) * 100) : 0,
      topPlatforms,
    };
  }, [adCopies]);

  const statItems = [
    {
      label: 'Tổng Ad Copy',
      value: stats.total,
      icon: Megaphone,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
      hoverBorderColor: 'hover:border-primary/50',
      filterValue: 'all',
    },
    {
      label: 'Đã xuất bản',
      value: stats.published,
      icon: Send,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
      hoverBorderColor: 'hover:border-green-500/50',
      filterValue: 'published',
    },
    {
      label: 'Đang duyệt',
      value: stats.review,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      hoverBorderColor: 'hover:border-yellow-500/50',
      filterValue: 'review',
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-accent/5 border border-border/50">
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-accent/20 to-transparent rounded-full blur-3xl"
          animate={{
            x: [0, -30, 0],
            y: [0, -20, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative z-10 p-4 sm:p-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-lg shadow-primary/10">
                <Megaphone className="h-6 w-6 text-primary" />
              </div>
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Ad Copies
              </h1>
              <p className="text-sm text-muted-foreground">
                Tạo quảng cáo chuyển đổi cao cho Meta & Google
              </p>
            </div>
          </motion.div>

          <motion.div 
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-9 w-9"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            )}

            <div className="flex items-center border border-border/50 rounded-lg p-1 bg-background/60 backdrop-blur-sm">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => onViewModeChange('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => onViewModeChange('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <Button 
              onClick={onAddNew} 
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tạo Ad Copy</span>
              <span className="sm:hidden">Tạo</span>
            </Button>
          </motion.div>
        </div>

        {/* Stats Grid - 5 columns on large screens */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statItems.map((stat, index) => (
            <Tooltip key={stat.label}>
              <TooltipTrigger asChild>
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
                  onClick={() => onFilterByStatus?.(stat.filterValue)}
                  className={cn(
                    "group relative p-4 rounded-xl border bg-background/60 backdrop-blur-sm text-left w-full",
                    "hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer",
                    stat.borderColor,
                    stat.hoverBorderColor
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={cn("p-2 rounded-lg transition-transform group-hover:scale-110", stat.bgColor)}>
                      <stat.icon className={cn("h-4 w-4", stat.color)} />
                    </div>
                    {/* Hover indicator */}
                    <motion.div
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      initial={false}
                    >
                      <Filter className="h-3 w-3 text-muted-foreground" />
                    </motion.div>
                  </div>
                  <div className="space-y-1">
                    <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </motion.button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click để lọc theo "{stat.label}"</p>
              </TooltipContent>
            </Tooltip>
          ))}

          {/* Approval Rate Ring */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="group relative p-4 rounded-xl border border-blue-500/20 bg-background/60 backdrop-blur-sm hover:shadow-lg hover:border-blue-500/30 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Variations đã duyệt</p>
                <p className="text-2xl font-bold text-blue-500">{stats.approvalRate}%</p>
                <p className="text-[10px] text-muted-foreground">{stats.approvedVariations}/{stats.totalVariations}</p>
              </div>
              <div className="relative w-12 h-12">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="3"
                  />
                  <motion.circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="hsl(217 91% 60%)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${stats.approvalRate}, 100`}
                    initial={{ strokeDasharray: "0, 100" }}
                    animate={{ strokeDasharray: `${stats.approvalRate}, 100` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Publish Rate Ring */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="group relative p-4 rounded-xl border border-accent/20 bg-background/60 backdrop-blur-sm hover:shadow-lg hover:shadow-accent/5 hover:border-accent/30 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Tỷ lệ xuất bản</p>
                <p className="text-2xl font-bold text-accent-foreground">{stats.completionRate}%</p>
              </div>
              <div className="relative w-12 h-12">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="3"
                  />
                  <motion.circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${stats.completionRate}, 100`}
                    initial={{ strokeDasharray: "0, 100" }}
                    animate={{ strokeDasharray: `${stats.completionRate}, 100` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Platform Distribution Bar */}
        {stats.topPlatforms.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="mt-4 p-3 rounded-xl border border-border/50 bg-background/40 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Phân bố Platform</span>
            </div>
            <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted/30">
              {stats.topPlatforms.map(([platform, count], index) => {
                const percentage = (count / stats.total) * 100;
                const colors = [
                  'bg-blue-500',
                  'bg-pink-500', 
                  'bg-green-500',
                  'bg-yellow-500',
                ];
                return (
                  <Tooltip key={platform}>
                    <TooltipTrigger asChild>
                      <motion.div
                        className={cn("h-full", colors[index % colors.length])}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getPlatformLabel(platform)}: {count} ({Math.round(percentage)}%)</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {stats.topPlatforms.map(([platform, count], index) => {
                const colors = [
                  'bg-blue-500',
                  'bg-pink-500', 
                  'bg-green-500',
                  'bg-yellow-500',
                ];
                return (
                  <div key={platform} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className={cn("w-2 h-2 rounded-full", colors[index % colors.length])} />
                    <span>{getPlatformLabel(platform)}</span>
                    <span className="font-medium text-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
