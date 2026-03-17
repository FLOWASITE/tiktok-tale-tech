import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Images, Plus, RefreshCw, LayoutGrid, List, CheckCircle2, Clock, TrendingUp, GalleryHorizontalEnd } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Carousel } from '@/types/carousel';

interface CarouselHeroSectionProps {
  carousels: Carousel[];
  loading: boolean;
  viewMode: 'grid' | 'list';
  showGallery?: boolean;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onToggleGallery?: () => void;
  onRefresh: () => void;
  onCreateNew: () => void;
}

export function CarouselHeroSection({
  carousels,
  loading,
  viewMode,
  onViewModeChange,
  onRefresh,
  onCreateNew,
}: CarouselHeroSectionProps) {
  const stats = useMemo(() => {
    const total = carousels.length;
    const published = carousels.filter(c => c.status === 'published').length;
    const review = carousels.filter(c => c.status === 'review').length;
    const completionRate = total > 0 ? Math.round((published / total) * 100) : 0;
    
    // Calculate recent count (last 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentCount = carousels.filter(c => new Date(c.created_at) > sevenDaysAgo).length;

    return { total, published, review, completionRate, recentCount };
  }, [carousels]);

  const statCards = [
    {
      label: 'Tổng carousel',
      value: stats.total,
      icon: Images,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Đã xuất bản',
      value: stats.published,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Chờ duyệt',
      value: stats.review,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: '7 ngày qua',
      value: stats.recentCount,
      icon: TrendingUp,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-background via-background to-muted/20">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/3 rounded-full blur-3xl" />
      </div>

      <div className="relative p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring" as const, stiffness: 200, damping: 15 }}
              className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20"
            >
              <Images className="w-6 h-6 text-primary" />
            </motion.div>
            <div>
              <motion.h1
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text"
              >
                Carousel Prompt
              </motion.h1>
              <motion.p
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-muted-foreground"
              >
                Tạo prompt cho ảnh carousel đa nền tảng
              </motion.p>
            </div>
          </div>

          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2"
          >
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              className="h-9 w-9 border-border/50 hover:bg-muted/50"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            
            <div className="hidden sm:flex items-center border border-border/50 rounded-lg p-1 bg-muted/30">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => onViewModeChange('grid')}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => onViewModeChange('list')}
                title="List View"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            <Button
              onClick={onCreateNew}
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Thêm mới</span>
            </Button>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="group relative overflow-hidden rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm p-4 hover:border-primary/30 transition-all duration-300"
            >
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
              
              <div className="relative flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${stat.color}`}>
                    {loading ? '-' : stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
