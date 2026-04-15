import { useState, useMemo } from "react";
import { UpgradePlanDialog } from "@/components/UpgradePlanDialog";
import { AddonPurchaseDialog } from "@/components/AddonPurchaseDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription, type UsageStats } from "@/hooks/useSubscription";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, Mail, Calendar, Crown, Zap, FileText, 
  Images, Layers, Wand2, Upload, Save, CreditCard, History,
  Globe, Youtube, Send, Building2, AtSign
} from "lucide-react";
import { Facebook, Instagram, Linkedin } from "lucide-react";
import { ZaloIcon, XIcon } from "@/components/icons/SocialIcons";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import type { Channel } from "@/types/multichannel";
import { WorkspaceUsageStats } from "@/components/WorkspaceUsageStats";
import { PaymentHistorySection } from "@/pages/PaymentHistory";

const CHANNEL_META: Record<Channel, { label: string; icon: React.ReactNode; color: string }> = {
  facebook: { label: "Facebook", icon: <Facebook className="w-3.5 h-3.5" />, color: "text-blue-600" },
  instagram: { label: "Instagram", icon: <Instagram className="w-3.5 h-3.5" />, color: "text-pink-500" },
  tiktok: { label: "TikTok", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52V6.8a4.84 4.84 0 01-1-.11z"/></svg>, color: "text-foreground" },
  linkedin: { label: "LinkedIn", icon: <Linkedin className="w-3.5 h-3.5" />, color: "text-blue-700" },
  twitter: { label: "X", icon: <XIcon className="w-3.5 h-3.5" />, color: "text-foreground" },
  youtube: { label: "YouTube", icon: <Youtube className="w-3.5 h-3.5" />, color: "text-red-600" },
  threads: { label: "Threads", icon: <AtSign className="w-3.5 h-3.5" />, color: "text-foreground" },
  zalo_oa: { label: "Zalo OA", icon: <ZaloIcon className="w-3.5 h-3.5" />, color: "text-blue-500" },
  email: { label: "Email", icon: <Mail className="w-3.5 h-3.5" />, color: "text-amber-600" },
  telegram: { label: "Telegram", icon: <Send className="w-3.5 h-3.5" />, color: "text-sky-500" },
  website: { label: "Website", icon: <Globe className="w-3.5 h-3.5" />, color: "text-emerald-600" },
  google_maps: { label: "Google Maps", icon: <Globe className="w-3.5 h-3.5" />, color: "text-green-600" },
};

function ChannelBreakdown({ breakdown }: { breakdown: Record<string, number> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(CHANNEL_META).map(([key, meta]) => {
        const count = breakdown[key] || 0;
        if (count === 0) return null;
        return (
          <div
            key={key}
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
          >
            <span className={meta.color}>{meta.icon}</span>
            <span className="font-medium">{meta.label}</span>
            <span className="font-bold text-foreground">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Account() {
  const { user } = useAuth();
  const { profile, isLoading: profileLoading, updateProfile, uploadAvatar, isUpdating } = useProfile();
  const { subscription, currentPlanLimits, usage, currentPeriod, isLoading: subLoading, activeAddons } = useSubscription();

  const [fullName, setFullName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("current");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [addonOpen, setAddonOpen] = useState(false);

  // Generate last 6 months options
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string; start: string; end: string }[] = [];
    const now = new Date();
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const s = d.toISOString();
      const e = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
      options.push({
        value: `${d.getFullYear()}-${d.getMonth()}`,
        label: format(d, "MMMM yyyy", { locale: vi }),
        start: s,
        end: e,
      });
    }
    return options;
  }, []);

  const selectedPeriod = monthOptions.find((m) => m.value === selectedMonth);

  // Query historical usage
  const historyQuery = useQuery({
    queryKey: ["usage_history", user?.id, selectedMonth],
    queryFn: async (): Promise<UsageStats> => {
      if (!user?.id || !selectedPeriod) {
        return { scripts: 0, carousels: 0, multichannel: 0, multichannel_social_posts: 0, channel_breakdown: {}, images: 0, image_channel_breakdown: {}, brands: 0 };
      }

      // Get org's content IDs for image counting (workspace-scoped)
      const orgId = subscription?.organization_id;
      if (!orgId) return { scripts: 0, carousels: 0, multichannel: 0, multichannel_social_posts: 0, channel_breakdown: {}, images: 0, image_channel_breakdown: {}, brands: 0 };

      const { data: orgContents } = await supabase
        .from("multi_channel_contents")
        .select("id")
        .eq("organization_id", orgId)
        .gte("created_at", selectedPeriod.start)
        .lte("created_at", selectedPeriod.end);
      const contentIds = (orgContents || []).map((c: any) => c.id);

      const [scriptsRes, carouselsRes, multiRes, imagesRes] = await Promise.all([
        supabase.from("scripts").select("*", { count: "exact", head: true })
          .eq("organization_id", orgId).gte("created_at", selectedPeriod.start).lte("created_at", selectedPeriod.end),
        supabase.from("carousels").select("*", { count: "exact", head: true })
          .eq("organization_id", orgId).gte("created_at", selectedPeriod.start).lte("created_at", selectedPeriod.end),
        supabase.from("multi_channel_contents").select("selected_channels", { count: "exact" })
          .eq("organization_id", orgId).gte("created_at", selectedPeriod.start).lte("created_at", selectedPeriod.end),
        contentIds.length > 0
          ? supabase.from("channel_image_history").select("channel", { count: "exact" })
              .in("content_id", contentIds)
          : Promise.resolve({ count: 0, data: null, error: null }),
      ]);

      const channelBreakdown: Record<string, number> = {};
      const socialPostsTotal = (multiRes.data || []).reduce(
        (sum: number, row: any) => {
          if (Array.isArray(row.selected_channels)) {
            row.selected_channels.forEach((ch: string) => {
              channelBreakdown[ch] = (channelBreakdown[ch] || 0) + 1;
            });
            return sum + row.selected_channels.length;
          }
          return sum;
        },
        0
      );

      // Image channel breakdown
      const imageChannelBreakdown: Record<string, number> = {};
      if (imagesRes.data && Array.isArray(imagesRes.data)) {
        imagesRes.data.forEach((row: any) => {
          if (row.channel) {
            imageChannelBreakdown[row.channel] = (imageChannelBreakdown[row.channel] || 0) + 1;
          }
        });
      }

      return {
        scripts: scriptsRes.count ?? 0,
        carousels: carouselsRes.count ?? 0,
        multichannel: multiRes.count ?? 0,
        multichannel_social_posts: socialPostsTotal,
        channel_breakdown: channelBreakdown,
        images: imagesRes.count ?? 0,
        image_channel_breakdown: imageChannelBreakdown,
        brands: 0,
      };
    },
    enabled: !!user?.id && selectedMonth !== "current" && !!selectedPeriod,
  });

  const handleSaveProfile = () => {
    updateProfile({ full_name: fullName });
    setIsEditing(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAvatar(file);
    }
  };

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || "U";
  };

  const planColors: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    starter: "bg-blue-500/10 text-blue-500",
    pro: "bg-primary/10 text-primary",
    enterprise: "bg-amber-500/10 text-amber-500",
  };

  const planNames: Record<string, string> = {
    free: "Miễn phí",
    starter: "Starter",
    pro: "Pro",
    enterprise: "Enterprise",
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  const usageItems = [
    { 
      key: "brands" as const, 
      label: "Thương hiệu", 
      icon: Building2,
      limit: currentPlanLimits?.monthly_brands || 0,
      used: usage?.brands || 0,
    },
    { 
      key: "scripts" as const, 
      label: "Kịch bản Video", 
      icon: FileText,
      limit: currentPlanLimits?.monthly_scripts || 0,
      used: usage?.scripts || 0,
    },
    { 
      key: "carousels" as const, 
      label: "Carousel", 
      icon: Images,
      limit: currentPlanLimits?.monthly_carousels || 0,
      used: usage?.carousels || 0,
    },
    { 
      key: "multichannel" as const, 
      label: "Bài trên Social", 
      icon: Layers,
      limit: currentPlanLimits?.monthly_multichannel || 0,
      used: usage?.multichannel_social_posts || 0,
    },
    { 
      key: "images" as const, 
      label: "Ảnh AI", 
      icon: Wand2,
      limit: currentPlanLimits?.monthly_images || 0,
      used: usage?.images || 0,
    },
  ];

  if (profileLoading || subLoading) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tài khoản</h1>
        <p className="text-muted-foreground">Quản lý thông tin cá nhân và subscription</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Thông tin cá nhân
            </CardTitle>
            <CardDescription>Cập nhật thông tin tài khoản của bạn</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar className="h-20 w-20 border-2 border-border">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity">
                  <Upload className="h-6 w-6 text-white" />
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={isUpdating}
                  />
                </label>
              </div>
              <div className="flex-1">
                <p className="font-medium">{profile?.full_name || "Chưa đặt tên"}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input id="email" value={user?.email || ""} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Họ và tên
                </Label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Input 
                      id="fullName" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nhập họ và tên"
                    />
                    <Button onClick={handleSaveProfile} disabled={isUpdating}>
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input 
                      id="fullName" 
                      value={profile?.full_name || ""}
                      disabled
                      placeholder="Chưa đặt tên"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setFullName(profile?.full_name || "");
                        setIsEditing(true);
                      }}
                    >
                      Sửa
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Ngày tham gia
                </Label>
                <Input 
                  value={profile?.created_at ? format(new Date(profile.created_at), "dd MMMM, yyyy", { locale: vi }) : ""}
                  disabled 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Gói đăng ký
            </CardTitle>
            <CardDescription>Thông tin subscription hiện tại</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Badge className={planColors[subscription?.plan_type || "free"]}>
                  {planNames[subscription?.plan_type || "free"]}
                </Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  {subscription?.status === "active" ? "Đang hoạt động" : subscription?.status}
                </p>
              </div>
              {currentPlanLimits && currentPlanLimits.price_monthly > 0 && (
                <div className="text-right">
                  <p className="text-2xl font-bold">{formatPrice(currentPlanLimits.price_monthly)}</p>
                  <p className="text-sm text-muted-foreground">/tháng</p>
                </div>
              )}
            </div>

            <Separator />

            {subscription && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bắt đầu:</span>
                  <span>{format(new Date(subscription.current_period_start), "dd/MM/yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hết hạn:</span>
                  <span>{format(new Date(subscription.current_period_end), "dd/MM/yyyy")}</span>
                </div>
                {subscription.payment_provider && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Thanh toán:</span>
                    <span className="uppercase">{subscription.payment_provider}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button className="flex-1" variant="outline" onClick={() => setUpgradeOpen(true)}>
                <CreditCard className="h-4 w-4 mr-2" />
                Nâng cấp gói
              </Button>
              <Button className="flex-1" variant="outline" onClick={() => setAddonOpen(true)}>
                <Zap className="h-4 w-4 mr-2" />
                Mua thêm
              </Button>
            </div>
            <UpgradePlanDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
            <AddonPurchaseDialog open={addonOpen} onOpenChange={setAddonOpen} />

            {/* Active Addons */}
            {activeAddons.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gói bổ sung đang hoạt động</p>
                {activeAddons.map(addon => (
                  <div key={addon.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {PLAN_NAMES[addon.plan_type] || addon.plan_type}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      HH: {format(new Date(addon.expires_at), "dd/MM/yyyy")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Sử dụng trong tháng
          </CardTitle>
          <CardDescription>
            Theo dõi mức sử dụng các tính năng trong chu kỳ hiện tại
          </CardDescription>
          <p className="text-sm font-medium text-primary mt-1">
            Chu kỳ: {format(new Date(currentPeriod.start), "dd/MM/yyyy")} – {format(new Date(currentPeriod.end), "dd/MM/yyyy")}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {usageItems.map((item) => {
              const isUnlimited = item.limit === -1;
              const percentage = isUnlimited ? 0 : (item.used / item.limit) * 100;
              const remaining = isUnlimited ? "∞" : Math.max(0, item.limit - item.used);

              return (
                <div key={item.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {item.used} / {isUnlimited ? "∞" : item.limit}
                    </span>
                  </div>
                  <Progress 
                    value={isUnlimited ? 0 : Math.min(percentage, 100)} 
                    className="h-2"
                  />
                   <p className="text-xs text-muted-foreground">
                     Còn lại: {remaining}
                   </p>
                </div>
              );
            })}
          </div>

          {/* Channel Breakdown */}
          {usage?.channel_breakdown && Object.keys(usage.channel_breakdown).length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Chi tiết bài đăng theo kênh
                </h4>
                <ChannelBreakdown breakdown={usage.channel_breakdown} />
              </div>
            </>
          )}

          {/* Image Channel Breakdown */}
          {usage?.image_channel_breakdown && Object.keys(usage.image_channel_breakdown).length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Wand2 className="h-4 w-4" />
                  Chi tiết ảnh AI theo kênh
                </h4>
                <ChannelBreakdown breakdown={usage.image_channel_breakdown} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Workspace Usage by Member & Brand */}
      <WorkspaceUsageStats />

      {/* Usage History Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Lịch sử sử dụng
              </CardTitle>
              <CardDescription>Xem lại mức sử dụng các tháng trước</CardDescription>
            </div>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Chọn tháng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Chọn tháng...</SelectItem>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {selectedMonth === "current" ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Chọn một tháng để xem lịch sử sử dụng
            </p>
          ) : historyQuery.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {[
                  { label: "Kịch bản Video", icon: FileText, value: historyQuery.data?.scripts ?? 0 },
                  { label: "Carousel", icon: Images, value: historyQuery.data?.carousels ?? 0 },
                  { label: "Bài trên Social", icon: Layers, value: historyQuery.data?.multichannel_social_posts ?? 0 },
                  { label: "Ảnh AI", icon: Wand2, value: historyQuery.data?.images ?? 0 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <span className="text-2xl font-bold">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* History Channel Breakdown */}
              {historyQuery.data?.channel_breakdown && Object.keys(historyQuery.data.channel_breakdown).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Chi tiết bài đăng theo kênh
                  </h4>
                  <ChannelBreakdown breakdown={historyQuery.data.channel_breakdown} />
                </div>
              )}

              {/* History Image Channel Breakdown */}
              {historyQuery.data?.image_channel_breakdown && Object.keys(historyQuery.data.image_channel_breakdown).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Wand2 className="h-4 w-4" />
                    Chi tiết ảnh AI theo kênh
                  </h4>
                  <ChannelBreakdown breakdown={historyQuery.data.image_channel_breakdown} />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Lịch sử thanh toán
          </CardTitle>
          <CardDescription>Xem lại các giao dịch thanh toán của workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentHistorySection />
        </CardContent>
      </Card>
    </div>
  );
}
