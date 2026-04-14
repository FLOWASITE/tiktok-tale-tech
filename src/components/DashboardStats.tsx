import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FileVideo, Images, Layers, Bookmark, TrendingUp, TrendingDown, Wand2, Video } from 'lucide-react';
import { AnimatedNumber, Sparkline } from '@/components/dashboard';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface StatsData {
  scripts: number;
  carousels: number;
  multiChannel: number;
  brands: number;
  aiImages: number;
  aiVideos: number;
}

interface DashboardStatsProps {
  stats: StatsData;
  loading?: boolean;
}

interface StatConfig {
  key: keyof StatsData;
  labelKey: string;
  icon: typeof FileVideo;
  gradient: string;
  bgGlow: string;
  sparklineColor: string;
  comingSoon?: boolean;
}

const statsConfig: StatConfig[] = [
  {
    key: 'scripts',
    labelKey: 'app.dashboard.statsScripts',
    icon: FileVideo,
    gradient: 'from-rose-500 to-pink-500',
    bgGlow: 'bg-rose-500/10',
    sparklineColor: 'hsl(350, 89%, 60%)',
  },
  {
    key: 'carousels',
    labelKey: 'app.dashboard.statsCarousels',
    icon: Images,
    gradient: 'from-cyan-500 to-blue-500',
    bgGlow: 'bg-cyan-500/10',
    sparklineColor: 'hsl(190, 95%, 55%)',
  },
  {
    key: 'multiChannel',
    labelKey: 'app.dashboard.statsMultiChannel',
    icon: Layers,
    gradient: 'from-violet-500 to-purple-500',
    bgGlow: 'bg-violet-500/10',
    sparklineColor: 'hsl(270, 80%, 60%)',
  },
  {
    key: 'brands',
    labelKey: 'app.dashboard.statsBrands',
    icon: Bookmark,
    gradient: 'from-amber-500 to-orange-500',
    bgGlow: 'bg-amber-500/10',
    sparklineColor: 'hsl(35, 92%, 55%)',
  },
  {
    key: 'aiImages',
    labelKey: 'app.dashboard.statsAiImages',
    icon: Wand2,
    gradient: 'from-teal-500 to-emerald-500',
    bgGlow: 'bg-teal-500/10',
    sparklineColor: 'hsl(160, 84%, 45%)',
  },
  {
    key: 'aiVideos',
    labelKey: 'app.dashboard.statsAiVideos',
    icon: Video,
    gradient: 'from-indigo-500 to-blue-600',
    bgGlow: 'bg-indigo-500/10',
    sparklineColor: 'hsl(230, 70%, 55%)',
    comingSoon: true,
  },
];

function generateSparklineData(value: number): number[] {
  const data: number[] = [];
  for (let i = 0; i < 7; i++) {
    const variation = Math.random() * 0.4 - 0.2;
    const baseValue = value * (0.6 + (i / 7) * 0.4);
    data.push(Math.max(0, Math.round(baseValue * (1 + variation))));
  }
  data[6] = value;
  return data;
}

function calculateTrend(data: number[]): { value: number; isPositive: boolean } {
  if (data.length < 2) return { value: 0, isPositive: true };
  const first = data[0] || 1;
  const last = data[data.length - 1];
  const change = ((last - first) / first) * 100;
  return { value: Math.abs(Math.round(change)), isPositive: change >= 0 };
}

export function DashboardStats({ stats, loading }: DashboardStatsProps) {
  const { t } = useTranslation();

  const sparklineData = useMemo(() => {
    return {
      scripts: generateSparklineData(stats.scripts),
      carousels: generateSparklineData(stats.carousels),
      multiChannel: generateSparklineData(stats.multiChannel),
      brands: generateSparklineData(stats.brands),
      aiImages: generateSparklineData(stats.aiImages),
      aiVideos: generateSparklineData(stats.aiVideos),
    };
  }, [stats]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="gradient-card border-border/50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-8 w-12 mt-4" />
              <Skeleton className="h-4 w-24 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {statsConfig.map((config, index) => {
        const Icon = config.icon;
        const value = stats[config.key];
        const data = sparklineData[config.key];
        const trend = calculateTrend(data);
        
        return (
          <motion.div
            key={config.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <Card className={`gradient-card border-border/50 card-animated group overflow-hidden h-full hover:scale-[1.02] hover:shadow-md transition-all duration-200 ${config.comingSoon ? 'opacity-75' : ''}`}>
              <CardContent className="p-3 sm:p-4 lg:p-6 relative h-full flex flex-col">
                <div className={`absolute top-0 right-0 w-20 sm:w-24 h-20 sm:h-24 ${config.bgGlow} rounded-full blur-2xl opacity-30 group-hover:opacity-60 transition-opacity`} />
                
                <div className="relative flex items-start justify-between mb-3 sm:mb-4">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  
                  {config.comingSoon ? (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                      {t('app.dashboard.comingSoon')}
                    </Badge>
                  ) : (
                    <div className="hidden sm:block">
                      <Sparkline 
                        data={data} 
                        color={config.sparklineColor}
                        width={64}
                        height={28}
                      />
                    </div>
                  )}
                </div>
                
                <div className="relative mt-auto">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-bold text-foreground">
                      {config.comingSoon ? '—' : <AnimatedNumber value={value} />}
                    </span>
                    
                    {!config.comingSoon && trend.value > 0 && (
                      <span className={`flex items-center text-xs font-medium ${
                        trend.isPositive ? 'text-emerald-500' : 'text-rose-500'
                      }`}>
                        {trend.isPositive ? (
                          <TrendingUp className="w-3 h-3 mr-0.5" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-0.5" />
                        )}
                        {trend.value}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {t(config.labelKey)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
