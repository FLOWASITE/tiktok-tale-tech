import { useState, useRef } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";
import { canEditOrganization, canDeleteOrganization, canManageMembers, ORG_ROLE_LABELS, ORG_ROLE_COLORS, OrgRole } from "@/types/organization";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Building2, Save, Upload, Palette, Users, 
  UserPlus, Trash2, Crown, Shield, User, Eye 
} from "lucide-react";
import { toast } from "sonner";

const ROLE_ICONS: Record<OrgRole, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
};

export default function OrganizationSettings() {
  const { currentOrganization, currentRole, updateOrganization, deleteOrganization, updating } = useOrganization();
  const { members, loading: membersLoading, inviteMember, updateMemberRole, removeMember, updating: membersUpdating } = useOrganizationMembers();
  
  const [orgName, setOrgName] = useState(currentOrganization?.name || "");
  const [primaryColor, setPrimaryColor] = useState(currentOrganization?.primary_color || "#000000");
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("member");
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = currentRole ? canEditOrganization(currentRole) : false;
  const canDelete = currentRole ? canDeleteOrganization(currentRole) : false;
  const canManage = currentRole ? canManageMembers(currentRole) : false;

  const handleSaveSettings = async () => {
    if (!currentOrganization) return;
    
    const success = await updateOrganization(currentOrganization.id, {
      name: orgName,
      primary_color: primaryColor,
    });
    
    if (success) {
      setIsEditing(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentOrganization) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Kích thước file tối đa 2MB');
      return;
    }

    try {
      setUploadingLogo(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${currentOrganization.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('brand-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('brand-logos')
        .getPublicUrl(fileName);

      await updateOrganization(currentOrganization.id, {
        logo_url: urlData.publicUrl + '?v=' + Date.now(),
      });

      toast.success('Đã cập nhật logo!');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error('Lỗi khi upload logo: ' + error.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;
    
    const success = await inviteMember(inviteEmail.trim(), inviteRole);
    if (success) {
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteRole("member");
    }
  };

  const handleDeleteOrganization = async () => {
    if (!currentOrganization) return;
    await deleteOrganization(currentOrganization.id);
  };

  if (!currentOrganization || !currentRole) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cài đặt tổ chức</h1>
        <p className="text-muted-foreground">
          Quản lý thông tin và thành viên của {currentOrganization.name}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Organization Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Thông tin tổ chức
            </CardTitle>
            <CardDescription>Cập nhật thông tin cơ bản</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div
                  className="h-20 w-20 rounded-lg border-2 border-border flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: currentOrganization.primary_color + '20' }}
                >
                  {currentOrganization.logo_url ? (
                    <img
                      src={currentOrganization.logo_url}
                      alt={currentOrganization.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Building2 
                      className="h-8 w-8" 
                      style={{ color: currentOrganization.primary_color }}
                    />
                  )}
                </div>
                {canEdit && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-lg cursor-pointer transition-opacity">
                    <Upload className="h-6 w-6 text-white" />
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                    />
                  </label>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{currentOrganization.name}</p>
                <Badge className={ORG_ROLE_COLORS[currentRole]}>
                  {ORG_ROLE_LABELS[currentRole]}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="orgName" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Tên tổ chức
              </Label>
              {isEditing && canEdit ? (
                <div className="flex gap-2">
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Nhập tên tổ chức"
                  />
                  <Button onClick={handleSaveSettings} disabled={updating}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    id="orgName"
                    value={currentOrganization.name}
                    disabled
                  />
                  {canEdit && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setOrgName(currentOrganization.name);
                        setPrimaryColor(currentOrganization.primary_color);
                        setIsEditing(true);
                      }}
                    >
                      Sửa
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Primary Color */}
            <div className="space-y-2">
              <Label htmlFor="primaryColor" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Màu chủ đạo
              </Label>
              <div className="flex gap-2">
                <div 
                  className="h-10 w-10 rounded-md border border-border shrink-0"
                  style={{ backgroundColor: isEditing ? primaryColor : currentOrganization.primary_color }}
                />
                {isEditing && canEdit ? (
                  <Input
                    id="primaryColor"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-20 p-1 cursor-pointer"
                  />
                ) : (
                  <Input
                    value={currentOrganization.primary_color}
                    disabled
                    className="flex-1"
                  />
                )}
              </div>
            </div>

            {/* Delete Organization */}
            {canDelete && (
              <>
                <Separator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Xóa tổ chức
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Xác nhận xóa tổ chức?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Hành động này không thể hoàn tác. Tất cả dữ liệu, nội dung và thành viên 
                        liên quan đến tổ chức sẽ bị xóa vĩnh viễn.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteOrganization}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Xóa tổ chức
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </CardContent>
        </Card>

        {/* Members Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Thành viên
                </CardTitle>
                <CardDescription>{members.length} thành viên</CardDescription>
              </div>
              {canManage && (
                <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Mời
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Mời thành viên mới</DialogTitle>
                      <DialogDescription>
                        Nhập email của người bạn muốn mời vào tổ chức
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="invite-email">Email</Label>
                        <Input
                          id="invite-email"
                          type="email"
                          placeholder="example@email.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="invite-role">Vai trò</Label>
                        <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as OrgRole)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Quản trị viên</SelectItem>
                            <SelectItem value="member">Thành viên</SelectItem>
                            <SelectItem value="viewer">Người xem</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                        Hủy
                      </Button>
                      <Button onClick={handleInviteMember} disabled={membersUpdating || !inviteEmail.trim()}>
                        {membersUpdating ? 'Đang mời...' : 'Gửi lời mời'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => {
                  const RoleIcon = ROLE_ICONS[member.role];
                  const isOwner = member.role === 'owner';
                  
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-sm">
                            {member.profile?.full_name?.[0] || member.profile?.email?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {member.profile?.full_name || 'Chưa đặt tên'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.profile?.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canManage && !isOwner ? (
                          <Select
                            value={member.role}
                            onValueChange={(v) => updateMemberRole(member.id, v as OrgRole)}
                          >
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Quản trị viên</SelectItem>
                              <SelectItem value="member">Thành viên</SelectItem>
                              <SelectItem value="viewer">Người xem</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={ORG_ROLE_COLORS[member.role]}>
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {ORG_ROLE_LABELS[member.role]}
                          </Badge>
                        )}
                        {canManage && !isOwner && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Xóa thành viên?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Bạn có chắc muốn xóa {member.profile?.full_name || member.profile?.email} khỏi tổ chức?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Hủy</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => removeMember(member.id)}
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
      </div>
    </div>
  );
}
