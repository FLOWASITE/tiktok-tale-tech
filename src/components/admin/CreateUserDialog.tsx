import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { invokeWithTimeout } from "@/lib/invokeEdgeFunctionWithTimeout";
import { toast } from "sonner";
import { UserPlus, Loader2, Building2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface OrgItem {
  id: string;
  name: string;
}

export function CreateUserDialog({ open, onOpenChange, onCreated }: CreateUserDialogProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("user");
  const [planType, setPlanType] = useState("free");
  const [loading, setLoading] = useState(false);

  const [organizations, setOrganizations] = useState<OrgItem[]>([]);
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
  const [orgRole, setOrgRole] = useState("member");
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  useEffect(() => {
    if (open) {
      fetchOrganizations();
    }
  }, [open]);

  async function fetchOrganizations() {
    setLoadingOrgs(true);
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name");
      if (error) throw error;
      setOrganizations(data || []);
    } catch (err) {
      console.error("Failed to fetch organizations:", err);
    } finally {
      setLoadingOrgs(false);
    }
  }

  function toggleOrg(orgId: string) {
    setSelectedOrgIds((prev) =>
      prev.includes(orgId)
        ? prev.filter((id) => id !== orgId)
        : [...prev, orgId]
    );
  }

  async function handleCreate() {
    if (!email || !password) {
      toast.error("Email và mật khẩu là bắt buộc");
      return;
    }
    if (password.length < 6) {
      toast.error("Mật khẩu ít nhất 6 ký tự");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: {
          action: "create_user",
          email,
          password,
          full_name: fullName,
          role,
          plan_type: planType,
          organization_ids: selectedOrgIds,
          org_role: orgRole,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Đã tạo user: " + email);
      setEmail("");
      setPassword("");
      setFullName("");
      setRole("user");
      setPlanType("free");
      setSelectedOrgIds([]);
      setOrgRole("member");
      onOpenChange(false);
      onCreated();
    } catch (err: unknown) {
      toast.error("Lỗi: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Tạo User Mới
          </DialogTitle>
          <DialogDescription>
            Tạo tài khoản user mới với role, plan và tổ chức tùy chỉnh
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label>Mật khẩu *</Label>
            <Input
              type="password"
              placeholder="Ít nhất 6 ký tự"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <Label>Họ tên</Label>
            <Input
              placeholder="Nguyễn Văn A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plan</Label>
              <Select value={planType} onValueChange={setPlanType}>
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
          </div>

          {/* Organization selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              Thêm vào tổ chức
            </Label>
            {loadingOrgs ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Đang tải...
              </div>
            ) : organizations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Không có tổ chức nào</p>
            ) : (
              <>
                <ScrollArea className="h-[120px] rounded-md border p-2">
                  <div className="space-y-2">
                    {organizations.map((org) => (
                      <label
                        key={org.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
                      >
                        <Checkbox
                          checked={selectedOrgIds.includes(org.id)}
                          onCheckedChange={() => toggleOrg(org.id)}
                        />
                        <span className="text-sm truncate">{org.name}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
                {selectedOrgIds.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      Role trong org ({selectedOrgIds.length} đã chọn):
                    </span>
                    <Select value={orgRole} onValueChange={setOrgRole}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Người xem</SelectItem>
                        <SelectItem value="member">Thành viên</SelectItem>
                        <SelectItem value="admin">Quản trị viên</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
            Tạo User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
