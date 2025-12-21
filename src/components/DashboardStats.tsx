import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileVideo, Images, Layers, Bookmark, TrendingUp } from 'lucide-react';

interface StatsData {
  scripts: number;
  carousels: number;
  multiChannel: number;
  brands: number;
}

interface DashboardStatsProps {
  stats: StatsData;
  loading?: boolean;
}

const statsConfig = [
  {
    key: 'scripts' as const,
    label: 'Kịch bản Video',
    icon: FileVideo,
    gradient: 'from-rose-500 to-pink-500',
    bgGlow: 'bg-rose-500/10',
  },
  {
    key: 'carousels' as const,
    label: 'Carousel',
    icon: Images,
    gradient: 'from-cyan-500 to-blue-500',
    bgGlow: 'bg-cyan-500/10',
  },
  {
    key: 'multiChannel' as const,
    label: 'Nội dung đa kênh',
    icon: Layers,
    gradient: 'from-violet-500 to-purple-500',
    bgGlow: 'bg-violet-500/10',
  },
  {
    key: 'brands' as const,
    label: 'Brand Templates',
    icon: Bookmark,
    gradient: 'from-amber-500 to-orange-500',
    bgGlow: 'bg-amber-500/10',
  },
];

export function DashboardStats({ stats, loading }: DashboardStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="gradient-card border-border/50">
            <CardContent className="p-6">
              <Skeleton className="h-10 w-10 rounded-xl mb-4" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statsConfig.map((config, index) => {
        const Icon = config.icon;
        const value = stats[config.key];
        
        return (
          <Card 
            key={config.key} 
            className="gradient-card border-border/50 card-animated group overflow-hidden stagger-item"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-6 relative">
              {/* Background glow */}
              <div className={`absolute top-0 right-0 w-24 h-24 ${config.bgGlow} rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity`} />
              
              {/* Icon */}
              <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              
              {/* Value */}
              <div className="relative">
                <p className="text-3xl font-bold text-foreground mb-1">
                  {value}
                </p>
                <p className="text-sm text-muted-foreground">
                  {config.label}
                </p>
              </div>

              {/* Trend indicator - decorative */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
