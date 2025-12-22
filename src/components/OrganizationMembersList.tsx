import React, { useState, useMemo } from "react";
import { OrganizationMember, OrgRole, ORG_ROLE_LABELS, ORG_ROLE_COLORS, canManageMembers } from "@/types/organization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Users, UserPlus, Trash2, Crown, Shield, User, Eye, Search, Calendar, Info, UserCog, Key
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ROLE_ICONS: Record<OrgRole, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
};

const ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  owner: "Toàn quyền quản lý tổ chức, thành viên và nội dung. Không thể bị xóa.",
  admin: "Quản lý thành viên, tạo và chỉnh sửa nội dung, phân công công việc.",
  member: "Tạo và chỉnh sửa nội dung được phân công, không thể quản lý thành viên.",
  viewer: "Chỉ xem nội dung, không thể tạo hoặc chỉnh sửa.",
};

interface OrganizationMembersListProps {
  members: OrganizationMember[];
  loading: boolean;
  currentRole: OrgRole;
  onInviteMember: (email: string, role: OrgRole) => Promise<boolean>;
  onCreateMember: (email: string, role: OrgRole, password: string, fullName?: string) => Promise<boolean>;
  onUpdateRole: (memberId: string, role: OrgRole) => Promise<boolean>;
  onRemoveMember: (memberId: string) => Promise<boolean>;
  updating: boolean;
}

export function OrganizationMembersList({
  members,
  loading,
  currentRole,
  onInviteMember,
  onCreateMember,
  onUpdateRole,
  onRemoveMember,
  updating,
}: OrganizationMembersListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<OrgRole | "all">("all");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("member");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  
  // State for manual creation
  const [createEmail, setCreateEmail] = useState("");
  const [createFullName, setCreateFullName] = useState("");
  const [createRole, setCreateRole] = useState<OrgRole>("member");
  const [createPassword, setCreatePassword] = useState("abc123");
  const [addMode, setAddMode] = useState<"invite" | "create">("create");

  const canManage = canManageMembers(currentRole);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch = 
        member.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = filterRole === "all" || member.role === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [members, searchQuery, filterRole]);

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;
    
    const success = await onInviteMember(inviteEmail.trim(), inviteRole);
    if (success) {
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteRole("member");
    }
  };

  const handleCreateMember = async () => {
    if (!createEmail.trim()) return;
    
    const success = await onCreateMember(
      createEmail.trim(), 
      createRole, 
      createPassword || "abc123",
      createFullName.trim() || undefined
    );
    if (success) {
      setShowInviteDialog(false);
      setCreateEmail("");
      setCreateFullName("");
      setCreateRole("member");
      setCreatePassword("abc123");
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Thành viên
            </CardTitle>
            <CardDescription>{members.length} thành viên trong tổ chức</CardDescription>
          </div>
          {canManage && (
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="shrink-0">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Thêm thành viên
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Thêm thành viên mới</DialogTitle>
                  <DialogDescription>
                    Tạo tài khoản mới hoặc mời người dùng đã có tài khoản.
                  </DialogDescription>
                </DialogHeader>
                <Tabs value={addMode} onValueChange={(v) => setAddMode(v as "invite" | "create")} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="create" className="flex items-center gap-1.5">
                      <UserCog className="h-4 w-4" />
                      Tạo mới
                    </TabsTrigger>
                    <TabsTrigger value="invite" className="flex items-center gap-1.5">
                      <UserPlus className="h-4 w-4" />
                      Mời có sẵn
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="create" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-email">Email *</Label>
                      <Input
                        id="create-email"
                        type="email"
                        placeholder="example@email.com"
                        value={createEmail}
                        onChange={(e) => setCreateEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-fullname">Họ và tên</Label>
                      <Input
                        id="create-fullname"
                        type="text"
                        placeholder="Nguyễn Văn A"
                        value={createFullName}
                        onChange={(e) => setCreateFullName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-password" className="flex items-center gap-1.5">
                        <Key className="h-3.5 w-3.5" />
                        Mật khẩu mặc định
                      </Label>
                      <Input
                        id="create-password"
                        type="text"
                        placeholder="abc123"
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Thành viên nên đổi mật khẩu sau khi đăng nhập lần đầu
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-role">Vai trò</Label>
                      <Select value={createRole} onValueChange={(v) => setCreateRole(v as OrgRole)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(['admin', 'member', 'viewer'] as OrgRole[]).map((role) => (
                            <SelectItem key={role} value={role}>
                              <div className="flex items-center gap-2">
                                {React.createElement(ROLE_ICONS[role], { className: "h-4 w-4" })}
                                <span>{ORG_ROLE_LABELS[role]}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        {ROLE_DESCRIPTIONS[createRole]}
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="invite" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="example@email.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Người dùng cần có tài khoản trong hệ thống
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-role">Vai trò</Label>
                      <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as OrgRole)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(['admin', 'member', 'viewer'] as OrgRole[]).map((role) => (
                            <SelectItem key={role} value={role}>
                              <div className="flex items-center gap-2">
                                {React.createElement(ROLE_ICONS[role], { className: "h-4 w-4" })}
                                <span>{ORG_ROLE_LABELS[role]}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        {ROLE_DESCRIPTIONS[inviteRole]}
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                    Hủy
                  </Button>
                  {addMode === "create" ? (
                    <Button onClick={handleCreateMember} disabled={updating || !createEmail.trim()}>
                      {updating ? 'Đang tạo...' : 'Tạo tài khoản'}
                    </Button>
                  ) : (
                    <Button onClick={handleInviteMember} disabled={updating || !inviteEmail.trim()}>
                      {updating ? 'Đang mời...' : 'Mời thành viên'}
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên hoặc email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterRole} onValueChange={(v) => setFilterRole(v as OrgRole | "all")}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Lọc vai trò" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {(['owner', 'admin', 'member', 'viewer'] as OrgRole[]).map((role) => (
                <SelectItem key={role} value={role}>{ORG_ROLE_LABELS[role]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Members List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {searchQuery || filterRole !== "all" 
                ? "Không tìm thấy thành viên phù hợp" 
                : "Chưa có thành viên nào"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMembers.map((member) => {
              const RoleIcon = ROLE_ICONS[member.role];
              const isOwner = member.role === 'owner';
              const joinedDate = member.joined_at 
                ? format(new Date(member.joined_at), "dd MMM yyyy", { locale: vi })
                : member.created_at 
                ? format(new Date(member.created_at), "dd MMM yyyy", { locale: vi })
                : null;
              
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-sm bg-primary/10 text-primary">
                        {member.profile?.full_name?.[0] || member.profile?.email?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {member.profile?.full_name || 'Chưa đặt tên'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.profile?.email}
                      </p>
                      {joinedDate && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          Tham gia {joinedDate}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {canManage && !isOwner ? (
                      <div className="flex items-center gap-1">
                        <Select
                          value={member.role}
                          onValueChange={(v) => onUpdateRole(member.id, v as OrgRole)}
                        >
                          <SelectTrigger className="w-36 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(['admin', 'member', 'viewer'] as OrgRole[]).map((role) => (
                              <SelectItem key={role} value={role}>
                                <div className="flex items-center gap-2">
                                  {React.createElement(ROLE_ICONS[role], { className: "h-3 w-3" })}
                                  <span>{ORG_ROLE_LABELS[role]}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <p className="text-xs">{ROLE_DESCRIPTIONS[member.role]}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className={ORG_ROLE_COLORS[member.role]}>
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {ORG_ROLE_LABELS[member.role]}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <p className="text-xs">{ROLE_DESCRIPTIONS[member.role]}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {canManage && !isOwner && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xóa thành viên?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Bạn có chắc muốn xóa {member.profile?.full_name || member.profile?.email} khỏi tổ chức?
                              Họ sẽ không thể truy cập nội dung của tổ chức nữa.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onRemoveMember(member.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Xóa
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
