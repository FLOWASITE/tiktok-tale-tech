import { useState, useEffect, useCallback } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Building2, Users, Trash2, UserMinus, Save, Crown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ORG_ROLE_LABELS, ORG_ROLE_COLORS, type OrgRole } from "@/types/organization";

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  owner_id: string;
  created_at: string;
  member_count: number;
  owner_name: string | null;
  owner_email: string | null;
}

interface MemberRow {
  id: string;
  user_id: string;
  role: OrgRole;
  joined_at: string | null;
  full_name: string | null;
  email: string;
}

interface OrgDetailSheetProps {
  org: OrgRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export function OrgDetailSheet({ org, open, onOpenChange, onRefresh }: OrgDetailSheetProps) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!org) return;
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from("organization_members")
        .select("id, user_id, role, joined_at")
        .eq("organization_id", org.id);

      if (error) throw error;

      // Fetch profiles for members
      const userIds = data?.map((m: any) => m.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap: Record<string, { full_name: string | null; email: string }> = {};
      profiles?.forEach((p: any) => {
        profileMap[p.id] = { full_name: p.full_name, email: p.email };
      });

      const rows: MemberRow[] = (data || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role as OrgRole,
        joined_at: m.joined_at,
        full_name: profileMap[m.user_id]?.full_name || null,
        email: profileMap[m.user_id]?.email || "",
      }));

      setMembers(rows);
    } catch (err: any) {
      toast.error("Lỗi tải thành viên: " + err.message);
    } finally {
      setLoadingMembers(false);
    }
  }, [org]);

  useEffect(() => {
    if (open && org) {
      setEditName(org.name);
      fetchMembers();
    }
  }, [open, org, fetchMembers]);

  const handleSaveName = async () => {
    if (!org || !editName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ name: editName.trim() })
        .eq("id", org.id);
      if (error) throw error;
      toast.success("Đã cập nhật tên tổ chức");
      onRefresh();
    } catch (err: any) {
      toast.error("Lỗi: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: OrgRole) => {
    try {
      const { error } = await supabase
        .from("organization_members")
        .update({ role: newRole })
        .eq("id", memberId);
      if (error) throw error;
      toast.success("Đã đổi vai trò");
      fetchMembers();
      onRefresh();
    } catch (err: any) {
      toast.error("Lỗi: " + err.message);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    try {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
      toast.success(`Đã xóa ${memberName} khỏi tổ chức`);
      fetchMembers();
      onRefresh();
    } catch (err: any) {
      toast.error("Lỗi: " + err.message);
    }
  };

  const handleDeleteOrg = async () => {
    if (!org) return;
    try {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", org.id);
      if (error) throw error;
      toast.success("Đã xóa tổ chức");
      onOpenChange(false);
      onRefresh();
    } catch (err: any) {
      toast.error("Lỗi xóa tổ chức: " + err.message);
    }
  };

  if (!org) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-primary-foreground"
              style={{ backgroundColor: org.primary_color || 'hsl(var(--primary))' }}
            >
              {org.name.charAt(0).toUpperCase()}
            </div>
            {org.name}
          </SheetTitle>
          <SheetDescription>ID: {org.id}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Edit Name */}
          <div className="space-y-2">
            <Label>Tên tổ chức</Label>
            <div className="flex gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <Button
                size="sm"
                onClick={handleSaveName}
                disabled={saving || editName === org.name}
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Slug:</span>
              <p className="font-mono text-xs">{org.slug}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Owner:</span>
              <p>{org.owner_name || org.owner_email}</p>
            </div>
          </div>

          {/* Members */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Thành viên ({members.length})
              </h3>
            </div>

            {loadingMembers ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {(m.full_name || m.email).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium flex items-center gap-1">
                          {m.full_name || m.email}
                          {m.user_id === org.owner_id && <Crown className="h-3 w-3 text-amber-500" />}
                        </div>
                        <div className="text-xs text-muted-foreground">{m.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={m.role}
                        onValueChange={(v) => handleChangeRole(m.id, v as OrgRole)}
                      >
                        <SelectTrigger className="h-7 w-[120px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ORG_ROLE_LABELS) as OrgRole[]).map((role) => (
                            <SelectItem key={role} value={role} className="text-xs">
                              {ORG_ROLE_LABELS[role]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {m.user_id !== org.owner_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveMember(m.id, m.full_name || m.email)}
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delete Org */}
          <div className="pt-4 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Xóa tổ chức
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xác nhận xóa tổ chức?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Hành động này sẽ xóa vĩnh viễn tổ chức "{org.name}" và tất cả dữ liệu liên quan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteOrg} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Xóa
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
