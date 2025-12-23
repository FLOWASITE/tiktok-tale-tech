import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Globe, 
  Layers, 
  Building2, 
  TrendingUp, 
  Users, 
  FileText,
  ArrowRight,
  CheckCircle2,
  XCircle
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

interface StatsData {
  countries: { total: number; active: number };
  categories: { total: number; active: number };
  industries: { total: number; active: number };
  templatesByCountry: { name: string; count: number }[];
  templatesByCategory: { name: string; count: number; color: string }[];
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async (): Promise<StatsData> => {
      // Fetch countries stats
      const { data: countries } = await supabase
        .from("countries")
        .select("id, is_active");
      
      // Fetch categories stats
      const { data: categories } = await supabase
        .from("industry_categories")
        .select("id, is_active, code, color");
      
      // Fetch industry templates with relations
      const { data: templates } = await supabase
        .from("industry_templates")
        .select(`
          id, 
          is_active, 
          country_id,
          category_id,
          countries!inner(name, code),
          industry_categories(code, color)
        `);

      // Calculate templates by country
      const countryMap = new Map<string, number>();
      templates?.forEach((t: any) => {
        const countryName = t.countries?.name || "Unknown";
        countryMap.set(countryName, (countryMap.get(countryName) || 0) + 1);
      });
      const templatesByCountry = Array.from(countryMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate templates by category
      const categoryMap = new Map<string, { count: number; color: string }>();
      templates?.forEach((t: any) => {
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

      return {
        countries: {
          total: countries?.length || 0,
          active: countries?.filter(c => c.is_active).length || 0
        },
        categories: {
          total: categories?.length || 0,
          active: categories?.filter(c => c.is_active).length || 0
        },
        industries: {
          total: templates?.length || 0,
          active: templates?.filter((t: any) => t.is_active).length || 0
        },
        templatesByCountry,
        templatesByCategory
      };
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const statCards = [
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
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Tổng quan về Industries, Countries và Categories
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.total}</div>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {stat.active} active
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <XCircle className="h-4 w-4" />
                  {stat.total - stat.active} inactive
                </span>
              </div>
              <Link to={stat.href}>
                <Button variant="ghost" size="sm" className="mt-3 -ml-2">
                  Quản lý <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Templates by Country Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              Templates theo Quốc gia
            </CardTitle>
            <CardDescription>
              Top 5 quốc gia có nhiều industry templates nhất
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.templatesByCountry && stats.templatesByCountry.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.templatesByCountry} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={100}
                    className="text-xs"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
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
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Chưa có dữ liệu
              </div>
            )}
          </CardContent>
        </Card>

        {/* Templates by Category Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-muted-foreground" />
              Templates theo Category
            </CardTitle>
            <CardDescription>
              Phân bố industry templates theo danh mục
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.templatesByCategory && stats.templatesByCategory.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={250}>
                  <PieChart>
                    <Pie
                      data={stats.templatesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
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
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {stats.templatesByCategory.slice(0, 6).map((cat, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="capitalize">{cat.name}</span>
                      </div>
                      <span className="font-medium">{cat.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Chưa có dữ liệu
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Các thao tác quản trị thường dùng
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/countries">
              <Button variant="outline">
                <Globe className="h-4 w-4 mr-2" />
                Thêm Quốc gia
              </Button>
            </Link>
            <Link to="/admin/categories">
              <Button variant="outline">
                <Layers className="h-4 w-4 mr-2" />
                Thêm Category
              </Button>
            </Link>
            <Link to="/admin/industries">
              <Button variant="outline">
                <Building2 className="h-4 w-4 mr-2" />
                Thêm Industry Template
              </Button>
            </Link>
            <Link to="/admin">
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Quản lý Users
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
