import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DashboardStats } from '@/components/DashboardStats';
import { RecentActivity, ActivityItem } from '@/components/RecentActivity';
import { MyAssignments } from '@/components/MyAssignments';
import { TodaySchedules } from '@/components/TodaySchedules';
import { PendingReviews } from '@/components/PendingReviews';
import { TopicQuickAccess } from '@/components/TopicQuickAccess';
import { PerformanceReminderWidget } from '@/components/PerformanceReminderWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useScripts } from '@/hooks/useScripts';
import { useCarousels } from '@/hooks/useCarousels';
import { useMultiChannelContents } from '@/hooks/useMultiChannelContents';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { 
  Sparkles, 
  FileVideo, 
  Images, 
  Layers, 
  Bookmark,
  ArrowRight,
  Zap,
  Users
} from 'lucide-react';

const Dashboard = () => {
  const { scripts, loading: scriptsLoading } = useScripts();
  const { carousels, loading: carouselsLoading } = useCarousels();
  const { contents: multiChannelContents, loading: multiChannelLoading } = useMultiChannelContents();
  const { templates: brands, loading: brandsLoading } = useBrandTemplates();

  const loading = scriptsLoading || carouselsLoading || multiChannelLoading || brandsLoading;

  const stats = useMemo(() => ({
    scripts: scripts.length,
    carousels: carousels.length,
    multiChannel: multiChannelContents.length,
    brands: brands.length,
  }), [scripts, carousels, multiChannelContents, brands]);

  // Combine all activities and sort by date
  const recentActivities = useMemo((): ActivityItem[] => {
    const activities: ActivityItem[] = [];

    scripts.forEach((script) => {
      activities.push({
        id: script.id,
        type: 'script',
        title: script.title,
        createdAt: script.created_at,
        metadata: { topic: script.topic },
      });
    });

    carousels.forEach((carousel) => {
      activities.push({
        id: carousel.id,
        type: 'carousel',
        title: carousel.title,
        createdAt: carousel.created_at,
        metadata: { 
          topic: carousel.topic,
          platform: carousel.platform,
        },
      });
    });

    multiChannelContents.forEach((content) => {
      activities.push({
        id: content.id,
        type: 'multichannel',
        title: content.title,
        createdAt: content.created_at,
        metadata: { 
          topic: content.topic,
          channels: content.selected_channels,
        },
      });
    });

    // Sort by date descending and take top 10
    return activities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [scripts, carousels, multiChannelContents]);

  const quickActions = [
    { 
      title: 'Tạo nội dung đa kênh', 
      description: 'Facebook, Instagram, LinkedIn...',
      icon: Layers,
      href: '/multichannel',
      gradient: 'from-violet-500 to-purple-500',
    },
    { 
      title: 'Tạo kịch bản video', 
      description: 'TikTok, YouTube Shorts, Reels',
      icon: FileVideo,
      href: '/scripts',
      gradient: 'from-rose-500 to-pink-500',
    },
    { 
      title: 'Tạo Carousel', 
      description: 'Thiết kế slides hấp dẫn',
      icon: Images,
      href: '/carousel',
      gradient: 'from-cyan-500 to-blue-500',
    },
    { 
      title: 'Quản lý Brand', 
      description: 'Brand voice & templates',
      icon: Bookmark,
      href: '/brands',
      gradient: 'from-amber-500 to-orange-500',
    },
    { 
      title: 'Quản lý tổ chức', 
      description: 'Thành viên & phân quyền',
      icon: Users,
      href: '/organization',
      gradient: 'from-emerald-500 to-teal-500',
    },
  ];

  return (
    <div className="relative">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="px-3 xs:px-4 sm:container py-4 sm:py-6 lg:py-8 relative space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-1 sm:gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl gradient-primary">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Tổng quan về nội dung của bạn
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <DashboardStats stats={stats} loading={loading} />

        {/* Main Content - Responsive columns layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {/* Column 1: Quick Actions & Tips */}
          <div className="space-y-4 sm:space-y-5 lg:space-y-6">
            <Card className="gradient-card border-border/50">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  Bắt đầu nhanh
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-2 sm:gap-3">
                  {quickActions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <Link 
                        key={action.href} 
                        to={action.href}
                        className="stagger-item"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <Card className="gradient-card border-border/50 card-animated group">
                          <CardContent className="p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3">
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform`}>
                              <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors">
                                {action.title}
                              </p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                                {action.description}
                              </p>
                            </div>
                            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Tips Section */}
            <Card className="gradient-card border-border/50 overflow-hidden">
              <div className="relative">
                <div className="absolute inset-0 gradient-primary opacity-10" />
                <CardContent className="p-3 sm:p-4 lg:p-5 relative">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="p-2 sm:p-2.5 rounded-lg bg-background/80 backdrop-blur flex-shrink-0">
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground mb-1 text-xs sm:text-sm">
                        Mẹo sử dụng hiệu quả
                      </h3>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3">
                        Tạo Brand Template với đầy đủ Brand Voice để AI tạo nội dung nhất quán hơn.
                      </p>
                      <Button variant="secondary" size="sm" asChild className="h-7 sm:h-8 text-xs">
                        <Link to="/brands">
                          Quản lý Brand
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>

            {/* Recent Activity - Hide on mobile, show on lg */}
            <div className="hidden lg:block">
              <RecentActivity activities={recentActivities} loading={loading} />
            </div>
          </div>

          {/* Column 2: Topics, My Assignments & Today Schedules */}
          <div className="space-y-4 sm:space-y-5 lg:space-y-6">
            <TopicQuickAccess />
            <PerformanceReminderWidget />
            <MyAssignments />
            <TodaySchedules />
          </div>

          {/* Column 3: Pending Reviews (Admin only) */}
          <div className="space-y-4 sm:space-y-5 lg:space-y-6 md:col-span-2 lg:col-span-1">
            <PendingReviews />
            {/* Recent Activity - Show on mobile/tablet, hide on lg */}
            <div className="lg:hidden">
              <RecentActivity activities={recentActivities} loading={loading} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
