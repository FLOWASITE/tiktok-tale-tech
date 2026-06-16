import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  Layers, 
  Building2, 
  Users, 
  ArrowRight,
  CheckCircle2,
  XCircle,
  BookOpen,
  CalendarDays,
  Newspaper,
  Package,
  FileText,
  Images,
  Film,
  Sparkles,
  CreditCard,
  Clock,
  TrendingUp,
  Brain,
  Server,
  HardDrive,
  Search,
  Activity

} from "lucide-react";
import { Link } from "react-router-dom";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface StatsData {
  // Users & Subscriptions
  users: { total: number; recentSignups: number };
  subscriptions: { total: number; active: number; byPlan: { name: string; value: number; color: string }[] };
  
  // Knowledge Base
  helpArticles: { total: number; published: number };
  events: { total: number; upcoming: number };
  news: { total: number; active: number };
  
  // Industry Memory
  countries: { total: number; active: number };
  categories: { total: number; active: number };
  industries: { total: number; active: number };
  memoryPacks: { total: number };
  
  // User Content
  userContent: {
    brands: number;
    scripts: number;
    carousels: number;
    multiChannel: number;
  };
  
  // Charts data
  templatesByCountry: { name: string; count: number }[];
  templatesByCategory: { name: string; count: number; color: string }[];
  contentDistribution: { name: string; value: number; color: string }[];
}

const PLAN_COLORS: Record<string, string> = {
  free: "hsl(var(--muted-foreground))",
  starter: "hsl(210, 100%, 50%)",
  pro: "hsl(260, 100%, 60%)",
  enterprise: "hsl(45, 100%, 50%)"
};

const CONTENT_COLORS = {
  brands: "hsl(200, 80%, 50%)",
  scripts: "hsl(150, 70%, 45%)",
  carousels: "hsl(280, 70%, 55%)",
  multiChannel: "hsl(30, 90%, 55%)"
};

export default function AdminDashboard() {
  const { data: stats, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["admin-dashboard-stats-full"],
    queryFn: async (): Promise<StatsData> => {
      // Parallel fetch all data
      const [
        usersRes,
        subscriptionsRes,
        helpArticlesRes,
        eventsRes,
        newsRes,
        countriesRes,
        categoriesRes,
        templatesRes,
        packsRes,
        brandsRes,
        scriptsRes,
        carouselsRes,
        multiChannelRes
      ] = await Promise.all([
        // Users
        supabase.from("profiles").select("id, created_at"),
        // Subscriptions
        supabase.from("subscriptions").select("id, plan_type, status"),
        // Help Articles
        supabase.from("help_articles").select("id, is_published"),
        // Events
        supabase.from("curated_events").select("id, event_date, is_active"),
        // News
        supabase.from("curated_news").select("id, is_active"),
        // Countries
        supabase.from("countries").select("id, is_active"),
        // Categories
        supabase.from("industry_categories").select("id, is_active, code, color"),
        // Industry templates with relations
        supabase.from("industry_templates").select(`
          id, is_active, country_id, category_id,
          countries!inner(name, code),
          industry_categories(code, color)
        `),
        // Memory Packs
        supabase.from("industry_templates").select("id"),
        // User content
        supabase.from("brand_templates").select("id"),
        supabase.from("scripts").select("id"),
        supabase.from("carousels").select("id"),
        supabase.from("multi_channel_contents").select("id")
      ]);

      const users = usersRes.data || [];
      const subscriptions = subscriptionsRes.data || [];
      const helpArticles = helpArticlesRes.data || [];
      const events = eventsRes.data || [];
      const news = newsRes.data || [];
      const countries = countriesRes.data || [];
      const categories = categoriesRes.data || [];
      const templates = templatesRes.data || [];
      const packs = packsRes.data || [];
      const brands = brandsRes.data || [];
      const scripts = scriptsRes.data || [];
      const carousels = carouselsRes.data || [];
      const multiChannel = multiChannelRes.data || [];

      // Calculate recent signups (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentSignups = users.filter(u => new Date(u.created_at) > sevenDaysAgo).length;

      // Calculate subscriptions by plan
      const planMap = new Map<string, number>();
      subscriptions.forEach(s => {
        const plan = s.plan_type || "free";
        planMap.set(plan, (planMap.get(plan) || 0) + 1);
      });
      const subscriptionsByPlan = Array.from(planMap.entries())
        .map(([name, value]) => ({ 
          name: name.charAt(0).toUpperCase() + name.slice(1), 
          value, 
          color: PLAN_COLORS[name] || PLAN_COLORS.free 
        }))
        .sort((a, b) => b.value - a.value);

      // Calculate upcoming events
      const today = new Date();
      const upcomingEvents = events.filter(e => e.is_active && new Date(e.event_date) >= today).length;

      // Templates by country
      const countryMap = new Map<string, number>();
      templates.forEach((t: any) => {
        const countryName = t.countries?.name || "Unknown";
        countryMap.set(countryName, (countryMap.get(countryName) || 0) + 1);
      });
      const templatesByCountry = Array.from(countryMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Templates by category
      const categoryMap = new Map<string, { count: number; color: string }>();
      templates.forEach((t: any) => {
        const categoryCode = t.industry_categories?.code || "uncategorized";
        const color = t.industry_categories?.color || "#6366f1";
        const existing = categoryMap.get(categoryCode);
        categoryMap.set(categoryCode, { 
          count: (existing?.count || 0) + 1, 
          color 
        });
      });
      const templatesByCategory = Array.from(categoryMap.entries())
        .map(([name, { count, color }]) => ({ name, count, color }))
        .sort((a, b) => b.count - a.count);

      // User content distribution for chart
      const contentDistribution = [
        { name: "Brands", value: brands.length, color: CONTENT_COLORS.brands },
        { name: "Scripts", value: scripts.length, color: CONTENT_COLORS.scripts },
        { name: "Carousels", value: carousels.length, color: CONTENT_COLORS.carousels },
        { name: "Multi-channel", value: multiChannel.length, color: CONTENT_COLORS.multiChannel }
      ];

      return {
        users: { total: users.length, recentSignups },
        subscriptions: { 
          total: subscriptions.length, 
          active: subscriptions.filter(s => s.status === "active").length,
          byPlan: subscriptionsByPlan
        },
        helpArticles: { 
          total: helpArticles.length, 
          published: helpArticles.filter(h => h.is_published).length 
        },
        events: { total: events.length, upcoming: upcomingEvents },
        news: { 
          total: news.length, 
          active: news.filter(n => n.is_active).length 
        },
        countries: {
          total: countries.length,
          active: countries.filter(c => c.is_active).length
        },
        categories: {
          total: categories.length,
          active: categories.filter(c => c.is_active).length
        },
        industries: {
          total: templates.length,
          active: templates.filter((t: any) => t.is_active).length
        },
        memoryPacks: { total: packs.length },
        userContent: {
          brands: brands.length,
          scripts: scripts.length,
          carousels: carousels.length,
          multiChannel: multiChannel.length
        },
        templatesByCountry,
        templatesByCategory,
        contentDistribution
      };
    },
    refetchInterval: 60000 // Auto refresh every minute
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  // Section: Users & Subscriptions
  const userCards = [
    {
      title: "Total Users",
      value: stats?.users.total || 0,
      subtitle: `+${stats?.users.recentSignups || 0} tuần này`,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      href: "/admin"
    },
    {
      title: "Active Subscriptions",
      value: stats?.subscriptions.active || 0,
      subtitle: `${stats?.subscriptions.total || 0} tổng`,
      icon: CreditCard,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      href: "/admin"
    }
  ];

  // Section: Knowledge Base
  const knowledgeCards = [
    {
      title: "Help Articles",
      value: stats?.helpArticles.total || 0,
      active: stats?.helpArticles.published || 0,
      activeLabel: "published",
      icon: BookOpen,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      href: "/admin/help-articles"
    },
    {
      title: "Curated Events",
      value: stats?.events.total || 0,
      active: stats?.events.upcoming || 0,
      activeLabel: "upcoming",
      icon: CalendarDays,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
      href: "/admin/events"
    },
    {
      title: "Curated News",
      value: stats?.news.total || 0,
      active: stats?.news.active || 0,
      activeLabel: "active",
      icon: Newspaper,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
      href: "/admin/industry-news"
    }
  ];

  // Section: Industry Memory
  const industryCards = [
    {
      title: "Countries",
      icon: Globe,
      total: stats?.countries.total || 0,
      active: stats?.countries.active || 0,
      href: "/admin/countries",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Categories",
      icon: Layers,
      total: stats?.categories.total || 0,
      active: stats?.categories.active || 0,
      href: "/admin/categories",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      title: "Industry Templates",
      icon: Building2,
      total: stats?.industries.total || 0,
      active: stats?.industries.active || 0,
      href: "/admin/industries",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10"
    },
    {
      title: "Memory Packs",
      icon: Package,
      total: stats?.memoryPacks.total || 0,
      active: stats?.memoryPacks.total || 0,
      href: "/admin/packs",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    },
    {
      title: "SEO Pages",
      icon: Search,
      total: 0,
      active: 0,
      href: "/admin/seo-pages",
      color: "text-pink-500",
      bgColor: "bg-pink-500/10"
    }
  ];

  // Section: User Content
  const contentCards = [
    {
      title: "Brand Templates",
      value: stats?.userContent.brands || 0,
      icon: Sparkles,
      color: "text-sky-500",
      bgColor: "bg-sky-500/10"
    },
    {
      title: "Scripts",
      value: stats?.userContent.scripts || 0,
      icon: Film,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      title: "Carousels",
      value: stats?.userContent.carousels || 0,
      icon: Images,
      color: "text-violet-500",
      bgColor: "bg-violet-500/10"
    },
    {
      title: "Multi-channel",
      value: stats?.userContent.multiChannel || 0,
      icon: FileText,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Tổng quan hệ thống
            {dataUpdatedAt && (
              <Badge variant="secondary" className="text-xs font-normal">
                <Clock className="h-3 w-3 mr-1" />
                {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true, locale: vi })}
              </Badge>
            )}
          </p>
        </div>
      </div>

      {/* Section: Users & Subscriptions */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          Users & Subscriptions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {userCards.map((card) => (
            <Card key={card.title} className="relative overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold mt-1">{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                      {card.subtitle}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
                <Link to={card.href}>
                  <Button variant="ghost" size="sm" className="mt-2 -ml-2 h-7 text-xs">
                    Xem chi tiết <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
          
          {/* Subscription Distribution Mini Chart */}
          {stats?.subscriptions.byPlan && stats.subscriptions.byPlan.length > 0 && (
            <Card className="col-span-2 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-2">Subscription Plans</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1 flex flex-wrap gap-2">
                    {stats.subscriptions.byPlan.map((plan, i) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className="text-xs"
                        style={{ borderLeft: `3px solid ${plan.color}` }}
                      >
                        {plan.name}: {plan.value}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Section: Knowledge Base */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          Knowledge Base
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {knowledgeCards.map((card) => (
            <Card key={card.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold mt-1">{card.value}</p>
                    <p className="text-xs mt-1">
                      <span className="text-emerald-600 font-medium">{card.active}</span>
                      <span className="text-muted-foreground"> {card.activeLabel}</span>
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
                <Link to={card.href}>
                  <Button variant="ghost" size="sm" className="mt-2 -ml-2 h-7 text-xs">
                    Quản lý <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Section: Industry Memory */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          Industry Memory
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {industryCards.map((card) => (
            <Card key={card.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold mt-1">{card.total}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" />
                        {card.active}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <XCircle className="h-3 w-3" />
                        {card.total - card.active}
                      </span>
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
                <Link to={card.href}>
                  <Button variant="ghost" size="sm" className="mt-2 -ml-2 h-7 text-xs">
                    Quản lý <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Section: User Content */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          User Content (All Users)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {contentCards.map((card) => (
            <Card key={card.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold mt-1">{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Templates by Country Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Templates theo Quốc gia
            </CardTitle>
            <CardDescription className="text-xs">
              Top 5 quốc gia có nhiều industry templates nhất
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.templatesByCountry && stats.templatesByCountry.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.templatesByCountry} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={80}
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                Chưa có dữ liệu
              </div>
            )}
          </CardContent>
        </Card>

        {/* Templates by Category Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              Templates theo Category
            </CardTitle>
            <CardDescription className="text-xs">
              Phân bố industry templates theo danh mục
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.templatesByCategory && stats.templatesByCategory.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="45%" height={220}>
                  <PieChart>
                    <Pie
                      data={stats.templatesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="count"
                    >
                      {stats.templatesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5 max-h-[220px] overflow-y-auto">
                  {stats.templatesByCategory.slice(0, 8).map((cat, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="capitalize truncate">{cat.name}</span>
                      </div>
                      <span className="font-medium ml-2">{cat.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                Chưa có dữ liệu
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <CardDescription className="text-xs">
            Các thao tác quản trị thường dùng
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin">
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Users
              </Button>
            </Link>
            <Link to="/admin/help-articles">
              <Button variant="outline" size="sm">
                <BookOpen className="h-4 w-4 mr-2" />
                Help Articles
              </Button>
            </Link>
            <Link to="/admin/industries">
              <Button variant="outline" size="sm">
                <Building2 className="h-4 w-4 mr-2" />
                Industries
              </Button>
            </Link>
            <Link to="/admin/countries">
              <Button variant="outline" size="sm">
                <Globe className="h-4 w-4 mr-2" />
                Countries
              </Button>
            </Link>
            <Link to="/admin/categories">
              <Button variant="outline" size="sm">
                <Layers className="h-4 w-4 mr-2" />
                Categories
              </Button>
            </Link>
            <Link to="/admin/packs">
              <Button variant="outline" size="sm">
                <Package className="h-4 w-4 mr-2" />
                Memory Packs
              </Button>
            </Link>
            <Link to="/admin/events">
              <Button variant="outline" size="sm">
                <CalendarDays className="h-4 w-4 mr-2" />
                Events
              </Button>
            </Link>
            <Link to="/admin/industry-news">
              <Button variant="outline" size="sm">
                <Newspaper className="h-4 w-4 mr-2" />
                News
              </Button>
            </Link>
            <Link to="/admin/users">
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Users
              </Button>
            </Link>
            <Link to="/admin/ai">
              <Button variant="outline" size="sm">
                <Brain className="h-4 w-4 mr-2" />
                AI Management
              </Button>
            </Link>
            <Link to="/admin/analytics">
              <Button variant="outline" size="sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                System Analytics
              </Button>
            </Link>
            <Link to="/admin/edge-functions">
              <Button variant="outline" size="sm">
                <Server className="h-4 w-4 mr-2" />
                Edge Functions
              </Button>
            </Link>
            <Link to="/admin/cron-monitor">
              <Button variant="outline" size="sm">
                <Clock className="h-4 w-4 mr-2" />
                Cron Monitor
              </Button>
            </Link>
            <Link to="/admin/multichannel-observability">
              <Button variant="outline" size="sm">
                <Activity className="h-4 w-4 mr-2" />
                Multichannel Observability
              </Button>
            </Link>

            <Link to="/admin/storage">
              <Button variant="outline" size="sm">
                <HardDrive className="h-4 w-4 mr-2" />
                File &amp; Bộ nhớ
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
