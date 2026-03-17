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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  KeyRound,
  FileText,
  Image,
  Layers,
  Pencil,
  Plus,
  X,
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

interface OrgOption {
  id: string;
  name: string;
}

export function UserDetailSheet({ user, open, onOpenChange, onAction }: UserDetailSheetProps) {
  const [orgs, setOrgs] = useState<OrgMembership[]>([]);
  const [usage, setUsage] = useState<UsageSummary[]>([]);
  const [contentCounts, setContentCounts] = useState({ posts: 0, socialPosts: 0, carousels: 0, images: 0 });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // Profile edit state
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");

  // Subscription edit state
  const [editPlan, setEditPlan] = useState<"free" | "starter" | "pro" | "enterprise">("free");
  const [editStatus, setEditStatus] = useState<"active" | "cancelled" | "expired" | "pending" | "trial">("active");
  const [editEndDate, setEditEndDate] = useState("");

  // Add to org dialog
  const [addOrgOpen, setAddOrgOpen] = useState(false);
  const [allOrgs, setAllOrgs] = useState<OrgOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedOrgRole, setSelectedOrgRole] = useState("member");

  useEffect(() => {
    if (!user || !open) return;
    setEditPlan(user.subscription?.plan_type || "free");
    setEditStatus(user.subscription?.status || "active");
    setEditEndDate(user.subscription?.current_period_end?.split("T")[0] || "");
    setEditName(user.full_name || "");
    setEditingName(false);
    fetchDetails(user.id, user.subscription);
  }, [user, open]);

  async function fetchDetails(userId: string, subscription: AdminUser["subscription"]) {
    setLoading(true);
    try {
      let usageQuery = supabase
        .from("usage_logs")
        .select("usage_type")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(500);

      if (subscription?.current_period_end) {
        const periodStart = new Date(new Date(subscription.current_period_end).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        usageQuery = usageQuery.gte("created_at", periodStart).lte("created_at", subscription.current_period_end);
      }

      const [orgRes, usageRes, postsRes, carouselsRes, imagesRes] = await Promise.all([
        supabase
          .from("organization_members")
          .select("organization_id, role, joined_at, organization:organizations(name, slug)")
          .eq("user_id", userId),
        usageQuery,
        supabase
          .from("multi_channel_contents")
          .select("selected_channels", { count: "exact" })
          .eq("user_id", userId),
        supabase
          .from("carousels")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("channel_image_history")
          .select("*", { count: "exact", head: true })
          .eq("created_by", userId),
      ]);

      if (orgRes.data) {
        setOrgs(orgRes.data as unknown as OrgMembership[]);
      }

      const socialPostsTotal = (postsRes.data || []).reduce(
        (sum: number, row: any) => sum + (Array.isArray(row.selected_channels) ? row.selected_channels.length : 0),
        0
      );

      setContentCounts({
        posts: postsRes.count ?? 0,
        socialPosts: socialPostsTotal,
        carousels: carouselsRes.count ?? 0,
        images: imagesRes.count ?? 0,
      });

      if (usageRes.data) {
        const grouped: Record<string, number> = {};
        usageRes.data.forEach((log) => {
          grouped[log.usage_type] = (grouped[log.usage_type] || 0) + 1;
        });
        setUsage(Object.entries(grouped).map(([usage_type, count]) => ({ usage_type, count })));
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
              : action === "update_profile"
                ? "Đã cập nhật profile"
                : action === "add_to_org"
                  ? "Đã thêm vào org"
                  : action === "remove_from_org"
                    ? "Đã xóa khỏi org"
                    : action === "update_org_role"
                      ? "Đã đổi role org"
                      : "Thành công"
      );
      onAction();
      if (action === "delete_user") onOpenChange(false);
      if (["add_to_org", "remove_from_org", "update_org_role"].includes(action) && user) {
        fetchDetails(user.id, user.subscription);
      }
    } catch (err: unknown) {
      toast.error("Lỗi: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSaveProfile() {
    await handleAdminAction("update_profile", { full_name: editName });
    setEditingName(false);
  }

  async function handleSaveSubscription() {
    if (!user) return;
    setActionLoading(true);
    try {
      // Update subscription via the user's primary organization
      const { data: memberData } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("role", "owner")
        .limit(1)
        .maybeSingle();
      
      if (!memberData?.organization_id) {
        toast.error("User không sở hữu workspace nào");
        setActionLoading(false);
        return;
      }

      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan_type: editPlan,
          status: editStatus,
          current_period_end: editEndDate ? new Date(editEndDate).toISOString() : undefined,
        })
        .eq("organization_id", memberData.organization_id);

      if (error) throw error;
      toast.success("Đã cập nhật subscription");
      onAction();
    } catch (err: unknown) {
      toast.error("Lỗi: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setActionLoading(false);
    }
  }

  async function openAddOrgDialog() {
    const { data } = await supabase.from("organizations").select("id, name");
    setAllOrgs(data || []);
    setSelectedOrgId("");
    setSelectedOrgRole("member");
    setAddOrgOpen(true);
  }

  async function handleAddToOrg() {
    if (!selectedOrgId) return;
    await handleAdminAction("add_to_org", {
      organization_id: selectedOrgId,
      role: selectedOrgRole,
    });
    setAddOrgOpen(false);
  }

  if (!user) return null;

  const usageTypeLabels: Record<string, string> = {
    script: "Script",
    carousel: "Carousel",
    multichannel: "Đa kênh",
    image_generation: "Ảnh AI",
  };

  // Filter orgs that user is not already in
  const availableOrgs = allOrgs.filter((o) => !orgs.some((m) => m.organization_id === o.id));

  return (
    <>
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
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8"
                      placeholder="Tên user"
                    />
                    <Button size="sm" variant="ghost" onClick={handleSaveProfile} disabled={actionLoading}>
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingName(false); setEditName(user.full_name || ""); }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-lg truncate">{user.full_name || "—"}</h3>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingName(true)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                )}
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
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Organizations
                </h4>
                <Button size="sm" variant="outline" onClick={openAddOrgDialog}>
                  <Plus className="h-3 w-3 mr-1" />
                  Thêm
                </Button>
              </div>
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
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {org.organization?.name || org.organization_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Tham gia {format(new Date(org.joined_at), "dd/MM/yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={org.role}
                          onValueChange={(v) =>
                            handleAdminAction("update_org_role", {
                              organization_id: org.organization_id,
                              role: v,
                            })
                          }
                        >
                          <SelectTrigger className="w-[100px] h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">Owner</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() =>
                            handleAdminAction("remove_from_org", {
                              organization_id: org.organization_id,
                            })
                          }
                          disabled={actionLoading}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Content Stats */}
            <div>
              <h4 className="font-medium flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4" />
                Tổng nội dung đã tạo
              </h4>
              {loading ? (
                <Skeleton className="h-12" />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-lg bg-primary/10 text-center">
                    <FileText className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <div className="text-xl font-bold">{contentCounts.socialPosts}</div>
                    <div className="text-xs text-muted-foreground">Bài trên Social</div>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 text-center">
                    <Layers className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <div className="text-xl font-bold">{contentCounts.carousels}</div>
                    <div className="text-xs text-muted-foreground">Carousel</div>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 text-center">
                    <Image className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <div className="text-xl font-bold">{contentCounts.images}</div>
                    <div className="text-xs text-muted-foreground">Ảnh AI</div>
                  </div>
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
                    <Select value={editPlan} onValueChange={(v) => setEditPlan(v as typeof editPlan)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <Select value={editStatus} onValueChange={(v) => setEditStatus(v as typeof editStatus)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveSubscription} disabled={actionLoading} className="flex-1">
                    <Save className="h-3 w-3 mr-1" />
                    Lưu Subscription
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleAdminAction("reset_usage")} disabled={actionLoading}>
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset Usage
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Reset Password */}
            <div>
              <h4 className="font-medium flex items-center gap-2 mb-3">
                <KeyRound className="h-4 w-4" />
                Đặt lại mật khẩu
              </h4>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Nhập password mới (tối thiểu 6 ký tự)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionLoading || newPassword.length < 6}
                  onClick={async () => {
                    await handleAdminAction("reset_password", { new_password: newPassword });
                    setNewPassword("");
                  }}
                >
                  <KeyRound className="h-3 w-3 mr-1" />
                  Đặt lại
                </Button>
              </div>
              {newPassword.length > 0 && newPassword.length < 6 && (
                <p className="text-xs text-destructive mt-1">Tối thiểu 6 ký tự</p>
              )}
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
                    <Button size="sm" variant="destructive" disabled={actionLoading}>
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

      {/* Add to Org Dialog */}
      <Dialog open={addOrgOpen} onOpenChange={setAddOrgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm vào Organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Organization</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn org..." />
                </SelectTrigger>
                <SelectContent>
                  {availableOrgs.map((org) => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <Select value={selectedOrgRole} onValueChange={setSelectedOrgRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOrgOpen(false)}>Hủy</Button>
            <Button onClick={handleAddToOrg} disabled={!selectedOrgId || actionLoading}>
              <Plus className="h-4 w-4 mr-1" />
              Thêm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
