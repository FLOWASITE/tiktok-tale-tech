import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import {
  Building2,
  Calendar,
  BarChart3,
  Shield,
  Ban,
  Trash2,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";
import type { AdminUser } from "@/hooks/useAdmin";

interface UserDetailSheetProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: () => void;
}

interface OrgMembership {
  organization_id: string;
  role: string;
  joined_at: string;
  organization: { name: string; slug: string } | null;
}

interface UsageSummary {
  usage_type: string;
  count: number;
}

export function UserDetailSheet({ user, open, onOpenChange, onAction }: UserDetailSheetProps) {
  const [orgs, setOrgs] = useState<OrgMembership[]>([]);
  const [usage, setUsage] = useState<UsageSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Subscription edit state
  const [editPlan, setEditPlan] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  useEffect(() => {
    if (!user || !open) return;
    setEditPlan(user.subscription?.plan_type || "free");
    setEditStatus(user.subscription?.status || "active");
    setEditEndDate(user.subscription?.current_period_end?.split("T")[0] || "");
    fetchDetails(user.id);
  }, [user, open]);

  async function fetchDetails(userId: string) {
    setLoading(true);
    try {
      const [orgRes, usageRes] = await Promise.all([
        supabase
          .from("organization_members")
          .select("organization_id, role, joined_at, organization:organizations(name, slug)")
          .eq("user_id", userId),
        supabase
          .from("usage_logs")
          .select("usage_type")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

      if (orgRes.data) {
        setOrgs(orgRes.data as unknown as OrgMembership[]);
      }

      if (usageRes.data) {
        const grouped: Record<string, number> = {};
        usageRes.data.forEach((log) => {
          grouped[log.usage_type] = (grouped[log.usage_type] || 0) + 1;
        });
        setUsage(
          Object.entries(grouped).map(([usage_type, count]) => ({ usage_type, count }))
        );
      }
    } catch (err) {
      console.error("Error fetching user details:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminAction(action: string, extra?: Record<string, unknown>) {
    if (!user) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action, user_id: user.id, ...extra },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(
        action === "ban_user"
          ? extra?.ban ? "Đã ban user" : "Đã unban user"
          : action === "delete_user"
            ? "Đã xóa user"
            : action === "reset_usage"
              ? "Đã reset usage"
              : "Thành công"
      );
      onAction();
      if (action === "delete_user") onOpenChange(false);
    } catch (err: unknown) {
      toast.error("Lỗi: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSaveSubscription() {
    if (!user) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan_type: editPlan,
          status: editStatus,
          current_period_end: editEndDate
            ? new Date(editEndDate).toISOString()
            : undefined,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Đã cập nhật subscription");
      onAction();
    } catch (err: unknown) {
      toast.error("Lỗi: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setActionLoading(false);
    }
  }

  if (!user) return null;

  const usageTypeLabels: Record<string, string> = {
    script: "Script",
    carousel: "Carousel",
    multichannel: "Đa kênh",
    image_generation: "Ảnh AI",
    ai_edit: "AI Edit",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Chi tiết User</SheetTitle>
          <SheetDescription>Xem và quản lý thông tin user</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Profile */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="text-lg">
                {user.email?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{user.full_name || "—"}</h3>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Tham gia {format(new Date(user.created_at), "dd/MM/yyyy", { locale: vi })}
              </div>
            </div>
          </div>

          <Separator />

          {/* Organizations */}
          <div>
            <h4 className="font-medium flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4" />
              Organizations
            </h4>
            {loading ? (
              <Skeleton className="h-12" />
            ) : orgs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Không thuộc organization nào</p>
            ) : (
              <div className="space-y-2">
                {orgs.map((org) => (
                  <div
                    key={org.organization_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {org.organization?.name || org.organization_id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tham gia {format(new Date(org.joined_at), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {org.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Usage */}
          <div>
            <h4 className="font-medium flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4" />
              Usage (kỳ hiện tại)
            </h4>
            {loading ? (
              <Skeleton className="h-12" />
            ) : usage.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có usage</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {usage.map((u) => (
                  <div key={u.usage_type} className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xl font-bold">{u.count}</div>
                    <div className="text-xs text-muted-foreground">
                      {usageTypeLabels[u.usage_type] || u.usage_type}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Subscription Management */}
          <div>
            <h4 className="font-medium flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4" />
              Subscription
            </h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Plan</Label>
                  <Select value={editPlan} onValueChange={setEditPlan}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Ngày hết hạn</Label>
                <Input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveSubscription}
                  disabled={actionLoading}
                  className="flex-1"
                >
                  <Save className="h-3 w-3 mr-1" />
                  Lưu Subscription
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAdminAction("reset_usage")}
                  disabled={actionLoading}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset Usage
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Admin Actions */}
          <div>
            <h4 className="font-medium flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4" />
              Hành động
            </h4>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-amber-600 border-amber-600/30 hover:bg-amber-600/10"
                onClick={() => handleAdminAction("ban_user", { ban: true })}
                disabled={actionLoading}
              >
                <Ban className="h-3 w-3 mr-1" />
                Ban User
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => handleAdminAction("ban_user", { ban: false })}
                disabled={actionLoading}
              >
                <ShieldCheck className="h-3 w-3 mr-1" />
                Unban
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={actionLoading}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Xóa
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xác nhận xóa user?</AlertDialogTitle>
                    <AlertDialogDescription>
                      User <strong>{user.email}</strong> sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleAdminAction("delete_user")}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Xóa vĩnh viễn
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
