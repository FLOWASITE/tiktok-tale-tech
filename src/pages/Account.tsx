import { useState, useMemo } from "react";
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
  Images, Layers, Wand2, Upload, Save, CreditCard, History
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export default function Account() {
  const { user } = useAuth();
  const { profile, isLoading: profileLoading, updateProfile, uploadAvatar, isUpdating } = useProfile();
  const { subscription, currentPlanLimits, usage, isLoading: subLoading } = useSubscription();

  const [fullName, setFullName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

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

            <Button className="w-full" variant="outline">
              <CreditCard className="h-4 w-4 mr-2" />
              Nâng cấp gói
            </Button>
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
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
