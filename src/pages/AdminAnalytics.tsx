import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  BarChart3, TrendingUp, TrendingDown, Users, Building2, Image,
  Share2, FileText, Brain, ArrowRight, RefreshCw, Download
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { useAdminSystemAnalytics, PeriodFilter } from '@/hooks/useAdminSystemAnalytics';

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: '90d', label: '90 ngày' },
  { value: 'this_month', label: 'Tháng này' },
  { value: 'last_month', label: 'Tháng trước' },
];

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2, 160 60% 45%))',
  'hsl(var(--chart-3, 30 80% 55%))',
  'hsl(var(--chart-4, 280 65% 60%))',
  'hsl(var(--chart-5, 340 75% 55%))',
  'hsl(200, 70%, 50%)',
  'hsl(120, 50%, 45%)',
  'hsl(45, 90%, 50%)',
];

function pctChange(current: number, prev: number) {
  if (prev === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prev) / prev) * 100);
}

function KPICard({ title, value, prevValue, icon: Icon }: { title: string; value: number; prevValue: number; icon: any }) {
  const change = pctChange(value, prevValue);
  const isUp = change >= 0;
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            <div className="flex items-center gap-1 text-xs">
              {isUp ? <TrendingUp className="h-3 w-3 text-green-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
              <span className={isUp ? 'text-green-600' : 'text-red-600'}>{change > 0 ? '+' : ''}{change}%</span>
              <span className="text-muted-foreground">vs kỳ trước</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function exportUsersCSV(users: any[]) {
  const header = 'Tên,Email,Org,Nội dung,Bài Social,Ảnh AI\n';
  const rows = users.map(u =>
    `"${u.fullName || ''}","${u.email || ''}","${u.orgName || ''}",${u.contentCount},${u.socialPosts},${u.aiImages}`
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'top-users.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminAnalytics() {
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const { kpi, trend, orgs, users, channels, growth, ai, isLoading, refetch } = useAdminSystemAnalytics(period);

  return (
    <div className="container py-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            System Analytics
          </h1>
          <p className="text-sm text-muted-foreground">Thống kê toàn bộ hệ thống</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {PERIOD_OPTIONS.map(opt => (
            <Button key={opt.value} size="sm" variant={period === opt.value ? 'default' : 'outline'} onClick={() => setPeriod(opt.value)}>
              {opt.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Section A: KPI Cards */}
      {isLoading || !kpi ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <KPICard title="Nội dung tạo mới" value={kpi.totalContents} prevValue={kpi.prevContents} icon={FileText} />
          <KPICard title="Bài trên Social" value={kpi.totalSocialPosts} prevValue={kpi.prevSocialPosts} icon={Share2} />
          <KPICard title="Ảnh AI" value={kpi.totalAIImages} prevValue={kpi.prevAIImages} icon={Image} />
          <KPICard title="User mới" value={kpi.totalNewUsers} prevValue={kpi.prevNewUsers} icon={Users} />
        </div>
      )}

      {/* Section A: Trend chart */}
      {trend && trend.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Xu hướng theo ngày</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip />
                  <Area type="monotone" dataKey="contents" stackId="1" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" fillOpacity={0.3} name="Nội dung" />
                  <Area type="monotone" dataKey="images" stackId="1" fill="hsl(var(--chart-2, 160 60% 45%))" stroke="hsl(var(--chart-2, 160 60% 45%))" fillOpacity={0.3} name="Ảnh AI" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section B & C side by side on desktop */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section B: Org Ranking */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Top Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!orgs ? (
              <Skeleton className="h-48" />
            ) : orgs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Chưa có dữ liệu</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {orgs.slice(0, 15).map((org, i) => (
                  <Link key={org.id} to="/admin/organizations" className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{org.name}</p>
                        <p className="text-xs text-muted-foreground">{org.memberCount} members</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <Badge variant="secondary">{org.socialPosts} social</Badge>
                      <Badge variant="outline">{org.aiImages} ảnh</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section C: Top Users */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Top Users
              </CardTitle>
              {users && users.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => exportUsersCSV(users)}>
                  <Download className="h-3.5 w-3.5 mr-1" /> CSV
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!users ? (
              <Skeleton className="h-48" />
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Chưa có dữ liệu</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {users.map((u, i) => (
                  <div key={u.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={u.avatarUrl || undefined} />
                        <AvatarFallback className="text-[10px]">{(u.fullName || u.email || '?')[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.fullName || u.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.orgName || ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs shrink-0">
                      <Badge variant="secondary">{u.socialPosts}</Badge>
                      <Badge variant="outline">{u.aiImages} ảnh</Badge>
                      {u.aiEdits > 0 && <Badge variant="outline">{u.aiEdits} edits</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section D: Channel Distribution */}
      {channels && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Phân bổ bài Social theo kênh</CardTitle>
            </CardHeader>
            <CardContent>
              {channels.socialByChannel.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Chưa có dữ liệu</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={channels.socialByChannel} dataKey="count" nameKey="channel" cx="50%" cy="50%" outerRadius={90} label={({ channel, percent }) => `${channel} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {channels.socialByChannel.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Phân bổ ảnh AI theo kênh</CardTitle>
            </CardHeader>
            <CardContent>
              {channels.imageByChannel.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Chưa có dữ liệu</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={channels.imageByChannel}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="channel" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Ảnh" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section E: System Growth */}
      {growth && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">User mới đăng ký</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={growth.usersByDay}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="contents" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Đăng ký mới" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tổng quan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Tổng Organizations</span>
                <span className="font-bold">{growth.totalOrgs}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Active (30 ngày)</span>
                <span className="font-bold text-green-600">{growth.activeOrgs}</span>
              </div>
              <hr className="border-border" />
              <div className="space-y-2">
                <p className="text-sm font-medium">Subscription</p>
                {growth.planDist.map(p => (
                  <div key={p.plan} className="flex justify-between text-sm">
                    <Badge variant="outline" className="capitalize">{p.plan}</Badge>
                    <span>{p.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section F: AI Usage Summary */}
      {ai && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4" /> AI Usage Summary
              </CardTitle>
              <Link to="/admin/ai">
                <Button size="sm" variant="ghost">
                  Chi tiết <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 mb-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{ai.totalRequests.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Tổng requests</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">${ai.totalCost}</p>
                <p className="text-xs text-muted-foreground">Tổng chi phí</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">${ai.avgCostPerRequest}</p>
                <p className="text-xs text-muted-foreground">TB/request</p>
              </div>
            </div>
            {ai.topModels.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Top Models</p>
                {ai.topModels.map(m => (
                  <div key={m.model} className="flex items-center justify-between text-sm">
                    <span className="truncate text-muted-foreground">{m.model}</span>
                    <Badge variant="secondary">{m.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
