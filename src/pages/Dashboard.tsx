import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DashboardStats } from '@/components/DashboardStats';
import { RecentActivity, ActivityItem } from '@/components/RecentActivity';
import { MyAssignments } from '@/components/MyAssignments';
import { TodaySchedules } from '@/components/TodaySchedules';
import { PendingReviews } from '@/components/PendingReviews';
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
  Zap
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
  ];

  return (
    <div className="relative">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="container py-8 relative space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl gradient-primary">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Tổng quan về nội dung của bạn
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <DashboardStats stats={stats} loading={loading} />

        {/* Main Content - 3 columns layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Column 1: Quick Actions & Tips */}
          <div className="space-y-6">
            <Card className="gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Bắt đầu nhanh
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
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
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                                {action.title}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {action.description}
                              </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
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
                <CardContent className="p-5 relative">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-background/80 backdrop-blur">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1 text-sm">
                        Mẹo sử dụng hiệu quả
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        Tạo Brand Template với đầy đủ Brand Voice để AI tạo nội dung nhất quán hơn.
                      </p>
                      <Button variant="secondary" size="sm" asChild>
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

            {/* Recent Activity */}
            <RecentActivity activities={recentActivities} loading={loading} />
          </div>

          {/* Column 2: My Assignments & Today Schedules */}
          <div className="space-y-6">
            <MyAssignments />
            <TodaySchedules />
          </div>

          {/* Column 3: Pending Reviews (Admin only) */}
          <div className="space-y-6">
            <PendingReviews />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
