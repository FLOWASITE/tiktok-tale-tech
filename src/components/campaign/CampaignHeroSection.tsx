import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, 
  CheckCircle2, 
  Clock, 
  Flame,
  Plus, 
  RefreshCw,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Campaign } from '@/types/campaign';
import { cn } from '@/lib/utils';

interface CampaignHeroSectionProps {
  campaigns: Campaign[];
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onAddNew: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24
    }
  }
};

export function CampaignHeroSection({
  campaigns,
  viewMode,
  onViewModeChange,
  onAddNew,
  onRefresh,
  isLoading,
}: CampaignHeroSectionProps) {
  const stats = useMemo(() => {
    const total = campaigns.length;
    const active = campaigns.filter(c => c.status === 'active').length;
    const planning = campaigns.filter(c => c.status === 'draft' || c.status === 'planning').length;
    const completed = campaigns.filter(c => c.status === 'completed').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, active, planning, completed, completionRate };
  }, [campaigns]);

  // Calculate circumference for progress ring
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (stats.completionRate / 100) * circumference;

  return (
    <motion.div 
      className="relative overflow-hidden rounded-xl border border-border/50"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/5 animate-gradient-shift" />
      
      {/* Floating decorative elements */}
      <div className="absolute top-4 right-8 w-24 h-24 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-4 left-8 w-32 h-32 rounded-full bg-secondary/10 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-gradient-to-r from-primary/5 to-secondary/5 blur-3xl" />

      <div className="relative p-4 sm:p-6">
        {/* Header Row */}
        <motion.div 
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
          variants={itemVariants}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-background animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">
                Quản lý chiến dịch
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Theo dõi và quản lý các chiến dịch marketing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-9 gap-1.5 bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                <span className="hidden sm:inline">Làm mới</span>
              </Button>
            )}

            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(v) => v && onViewModeChange(v as 'grid' | 'list')} 
              className="bg-background/60 backdrop-blur-sm border border-border/50 rounded-lg p-0.5"
            >
              <ToggleGroupItem 
                value="grid" 
                aria-label="Grid view" 
                className="h-8 w-8 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="list" 
                aria-label="List view" 
                className="h-8 w-8 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            <Button 
              onClick={onAddNew} 
              size="sm" 
              className="h-9 gap-1.5 bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-lg shadow-primary/25"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo chiến dịch</span>
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total Campaigns */}
          <motion.div 
            variants={itemVariants}
            className="group relative p-4 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Tổng chiến dịch</p>
              </div>
            </div>
          </motion.div>

          {/* Active */}
          <motion.div 
            variants={itemVariants}
            className="group relative p-4 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/5 transition-all duration-300"
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-green-500/0 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Flame className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Đang chạy</p>
              </div>
            </div>
          </motion.div>

          {/* Planning */}
          <motion.div 
            variants={itemVariants}
            className="group relative p-4 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300"
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">{stats.planning}</p>
                <p className="text-xs text-muted-foreground">Lên kế hoạch</p>
              </div>
            </div>
          </motion.div>

          {/* Completion Rate Ring */}
          <motion.div 
            variants={itemVariants}
            className="group relative p-4 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300"
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-3">
              <div className="relative w-12 h-12">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                  {/* Background circle */}
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="6"
                  />
                  {/* Progress circle */}
                  <motion.circle
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="none"
                    stroke="url(#campaignProgressGradient)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                  />
                  <defs>
                    <linearGradient id="campaignProgressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(271 91% 65%)" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-foreground">{stats.completionRate}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Hoàn thành</p>
                <p className="text-xs text-muted-foreground">{stats.completed} chiến dịch</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
