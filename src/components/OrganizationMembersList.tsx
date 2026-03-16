import React, { useState, useMemo } from "react";
import { OrganizationMember, OrgRole, ORG_ROLE_LABELS, ORG_ROLE_COLORS, canManageMembers } from "@/types/organization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
  Users, UserPlus, Trash2, Crown, Shield, User, Eye, Search, Calendar, Info, UserCog, Key, UsersRound, CheckCircle2, XCircle, Wifi, WifiOff
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemberAvatar } from "@/components/MemberAvatar";
import { usePresence } from "@/hooks/usePresence";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

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
  onBulkCreateMembers?: (
    emails: string[],
    role: OrgRole,
    password: string,
    onProgress?: (completed: number, total: number, results: { success: string[]; failed: { email: string; error: string }[] }) => void
  ) => Promise<{ success: string[]; failed: { email: string; error: string }[] }>;
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
  onBulkCreateMembers,
  onUpdateRole,
  onRemoveMember,
  updating,
}: OrganizationMembersListProps) {
  const { currentOrganization } = useOrganizationContext();
  const { isOnline, onlineCount } = usePresence(currentOrganization?.id);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<OrgRole | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "online" | "offline">("all");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("member");
  
  // State for manual creation
  const [createEmail, setCreateEmail] = useState("");
  const [createFullName, setCreateFullName] = useState("");
  const [createRole, setCreateRole] = useState<OrgRole>("member");
  const [createPassword, setCreatePassword] = useState("abc123");
  const [addMode, setAddMode] = useState<"create" | "invite" | "bulk">("create");

  // Bulk invite state
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkRole, setBulkRole] = useState<OrgRole>("member");
  const [bulkPassword, setBulkPassword] = useState("abc123");
  const [bulkProgress, setBulkProgress] = useState<{ completed: number; total: number } | null>(null);
  const [bulkResults, setBulkResults] = useState<{ success: string[]; failed: { email: string; error: string }[] } | null>(null);

  const canManage = canManageMembers(currentRole);

  // Role counts
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: members.length };
    members.forEach(m => { counts[m.role] = (counts[m.role] || 0) + 1; });
    return counts;
  }, [members]);

  const offlineCount = members.length - onlineCount;

  const filteredMembers = useMemo(() => {
    return members
      .filter((member) => {
        const matchesSearch = 
          member.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = filterRole === "all" || member.role === filterRole;
        const matchesStatus = filterStatus === "all" 
          || (filterStatus === "online" && isOnline(member.user_id))
          || (filterStatus === "offline" && !isOnline(member.user_id));
        return matchesSearch && matchesRole && matchesStatus;
      })
      .sort((a, b) => {
        // Online users first
        const aOnline = isOnline(a.user_id) ? 0 : 1;
        const bOnline = isOnline(b.user_id) ? 0 : 1;
        return aOnline - bOnline;
      });
  }, [members, searchQuery, filterRole, filterStatus, isOnline]);

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
      createEmail.trim(), createRole, createPassword || "abc123", createFullName.trim() || undefined
    );
    if (success) {
      setShowInviteDialog(false);
      setCreateEmail("");
      setCreateFullName("");
      setCreateRole("member");
      setCreatePassword("abc123");
    }
  };

  const handleBulkCreate = async () => {
    if (!onBulkCreateMembers) return;
    const emails = bulkEmails.split('\n').map(e => e.trim()).filter(e => e && e.includes('@'));
    if (emails.length === 0) return;

    setBulkResults(null);
    setBulkProgress({ completed: 0, total: emails.length });

    const results = await onBulkCreateMembers(emails, bulkRole, bulkPassword || "abc123", (completed, total, partialResults) => {
      setBulkProgress({ completed, total });
      setBulkResults({ ...partialResults });
    });

    setBulkResults(results);
    setBulkProgress(null);
    if (results.success.length > 0) {
      setBulkEmails("");
    }
  };

  const parsedBulkCount = bulkEmails.split('\n').map(e => e.trim()).filter(e => e && e.includes('@')).length;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Thành viên
            </CardTitle>
            <CardDescription className="flex items-center gap-3">
              <span>{members.length} thành viên trong tổ chức</span>
              {onlineCount > 0 && (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {onlineCount} đang hoạt động
                </span>
              )}
            </CardDescription>
          </div>
          {canManage && (
            <Dialog open={showInviteDialog} onOpenChange={(open) => {
              setShowInviteDialog(open);
              if (!open) { setBulkResults(null); setBulkProgress(null); }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="shrink-0">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Thêm thành viên
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Thêm thành viên mới</DialogTitle>
                  <DialogDescription>
                    Tạo tài khoản mới, mời người dùng có sẵn, hoặc thêm hàng loạt.
                  </DialogDescription>
                </DialogHeader>
                <Tabs value={addMode} onValueChange={(v) => setAddMode(v as typeof addMode)} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="create" className="flex items-center gap-1.5 text-xs">
                      <UserCog className="h-3.5 w-3.5" />
                      Tạo mới
                    </TabsTrigger>
                    <TabsTrigger value="invite" className="flex items-center gap-1.5 text-xs">
                      <UserPlus className="h-3.5 w-3.5" />
                      Mời có sẵn
                    </TabsTrigger>
                    <TabsTrigger value="bulk" className="flex items-center gap-1.5 text-xs">
                      <UsersRound className="h-3.5 w-3.5" />
                      Hàng loạt
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Tab: Create new */}
                  <TabsContent value="create" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-email">Email *</Label>
                      <Input id="create-email" type="email" placeholder="example@email.com" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-fullname">Họ và tên</Label>
                      <Input id="create-fullname" type="text" placeholder="Nguyễn Văn A" value={createFullName} onChange={(e) => setCreateFullName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-password" className="flex items-center gap-1.5"><Key className="h-3.5 w-3.5" />Mật khẩu mặc định</Label>
                      <Input id="create-password" type="text" placeholder="abc123" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} />
                      <p className="text-xs text-muted-foreground">Thành viên nên đổi mật khẩu sau khi đăng nhập lần đầu</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Vai trò</Label>
                      <RoleSelect value={createRole} onChange={setCreateRole} />
                      <p className="text-xs text-muted-foreground mt-1">{ROLE_DESCRIPTIONS[createRole]}</p>
                    </div>
                  </TabsContent>
                  
                  {/* Tab: Invite existing */}
                  <TabsContent value="invite" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email</Label>
                      <Input id="invite-email" type="email" placeholder="example@email.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                      <p className="text-xs text-muted-foreground">Người dùng cần có tài khoản trong hệ thống</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Vai trò</Label>
                      <RoleSelect value={inviteRole} onChange={setInviteRole} />
                      <p className="text-xs text-muted-foreground mt-1">{ROLE_DESCRIPTIONS[inviteRole]}</p>
                    </div>
                  </TabsContent>

                  {/* Tab: Bulk invite */}
                  <TabsContent value="bulk" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label className="flex items-center justify-between">
                        <span>Danh sách email (mỗi dòng 1 email)</span>
                        {parsedBulkCount > 0 && (
                          <Badge variant="secondary" className="text-xs">{parsedBulkCount} email</Badge>
                        )}
                      </Label>
                      <Textarea
                        placeholder={"user1@email.com\nuser2@email.com\nuser3@email.com"}
                        value={bulkEmails}
                        onChange={(e) => setBulkEmails(e.target.value)}
                        rows={5}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Vai trò chung</Label>
                        <RoleSelect value={bulkRole} onChange={setBulkRole} />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><Key className="h-3.5 w-3.5" />Mật khẩu</Label>
                        <Input type="text" placeholder="abc123" value={bulkPassword} onChange={(e) => setBulkPassword(e.target.value)} />
                      </div>
                    </div>

                    {/* Progress */}
                    {bulkProgress && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Đang xử lý...</span>
                          <span className="font-medium">{bulkProgress.completed}/{bulkProgress.total}</span>
                        </div>
                        <Progress value={(bulkProgress.completed / bulkProgress.total) * 100} className="h-2" />
                      </div>
                    )}

                    {/* Results */}
                    {bulkResults && !bulkProgress && (
                      <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/30">
                        <p className="text-sm font-medium">Kết quả:</p>
                        {bulkResults.success.length > 0 && (
                          <div className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {bulkResults.success.length} thành công: {bulkResults.success.join(', ')}
                            </span>
                          </div>
                        )}
                        {bulkResults.failed.length > 0 && (
                          <div className="space-y-1">
                            {bulkResults.failed.map((f, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                                <span className="text-destructive">{f.email}: {f.error}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Hủy</Button>
                  {addMode === "create" && (
                    <Button onClick={handleCreateMember} disabled={updating || !createEmail.trim()}>
                      {updating ? 'Đang tạo...' : 'Tạo tài khoản'}
                    </Button>
                  )}
                  {addMode === "invite" && (
                    <Button onClick={handleInviteMember} disabled={updating || !inviteEmail.trim()}>
                      {updating ? 'Đang mời...' : 'Mời thành viên'}
                    </Button>
                  )}
                  {addMode === "bulk" && (
                    <Button onClick={handleBulkCreate} disabled={updating || parsedBulkCount === 0 || !!bulkProgress}>
                      {bulkProgress ? `Đang xử lý ${bulkProgress.completed}/${bulkProgress.total}...` : `Thêm ${parsedBulkCount} thành viên`}
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {([['all', 'Tất cả'], ['owner', ORG_ROLE_LABELS.owner], ['admin', ORG_ROLE_LABELS.admin], ['member', ORG_ROLE_LABELS.member], ['viewer', ORG_ROLE_LABELS.viewer]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilterRole(key as OrgRole | "all")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                filterRole === key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {key !== 'all' && React.createElement(ROLE_ICONS[key as OrgRole], { className: "h-3 w-3" })}
              {label}
              <span className="opacity-70">({roleCounts[key] || 0})</span>
            </button>
          ))}
        </div>

        {/* Search & Status filter */}
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
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Tất cả trạng thái</span>
              </SelectItem>
              <SelectItem value="online">
                <span className="flex items-center gap-2"><Wifi className="h-3.5 w-3.5 text-emerald-500" /> Đang hoạt động ({onlineCount})</span>
              </SelectItem>
              <SelectItem value="offline">
                <span className="flex items-center gap-2"><WifiOff className="h-3.5 w-3.5 text-muted-foreground" /> Ngoại tuyến ({offlineCount})</span>
              </SelectItem>
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
              {searchQuery || filterRole !== "all" || filterStatus !== "all"
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
                    <MemberAvatar
                      avatarUrl={member.profile?.avatar_url}
                      name={member.profile?.full_name}
                      email={member.profile?.email}
                      isOnline={isOnline(member.user_id)}
                      size="md"
                    />
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
                            <SelectValue>
                              <div className="flex items-center gap-2">
                                {React.createElement(ROLE_ICONS[member.role], { className: "h-3 w-3" })}
                                <span>{ORG_ROLE_LABELS[member.role]}</span>
                              </div>
                            </SelectValue>
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

// Shared role select component
function RoleSelect({ value, onChange }: { value: OrgRole; onChange: (v: OrgRole) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as OrgRole)}>
      <SelectTrigger>
        <SelectValue>
          <div className="flex items-center gap-2">
            {React.createElement(ROLE_ICONS[value], { className: "h-4 w-4" })}
            <span>{ORG_ROLE_LABELS[value]}</span>
          </div>
        </SelectValue>
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
  );
}
