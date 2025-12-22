import { useState, useRef } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";
import { useMultiChannelContents } from "@/hooks/useMultiChannelContents";
import { canEditOrganization, canDeleteOrganization, canManageMembers, ORG_ROLE_LABELS, ORG_ROLE_COLORS, OrgRole } from "@/types/organization";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Building2, Save, Upload, Palette, Users, Trash2, Settings, Zap 
} from "lucide-react";
import { toast } from "sonner";
import { OrganizationStats } from "@/components/OrganizationStats";
import { OrganizationMembersList } from "@/components/OrganizationMembersList";
import { ApprovalSettingsCard } from "@/components/ApprovalSettingsCard";

export default function OrganizationSettings() {
  const { currentOrganization, currentRole, updateOrganization, deleteOrganization, updating } = useOrganization();
  const { members, loading: membersLoading, inviteMember, createMember, updateMemberRole, removeMember, updating: membersUpdating } = useOrganizationMembers();
  const { contents } = useMultiChannelContents();
  
  const [orgName, setOrgName] = useState(currentOrganization?.name || "");
  const [primaryColor, setPrimaryColor] = useState(currentOrganization?.primary_color || "#000000");
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = currentRole ? canEditOrganization(currentRole) : false;
  const canDelete = currentRole ? canDeleteOrganization(currentRole) : false;

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

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }

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

  const handleDeleteOrganization = async () => {
    if (!currentOrganization) return;
    await deleteOrganization(currentOrganization.id);
  };

  if (!currentOrganization || !currentRole) {
    return (
      <div className="container max-w-5xl py-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="container max-w-5xl py-8 space-y-6 relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div
                className="h-16 w-16 rounded-xl border-2 border-border flex items-center justify-center overflow-hidden shadow-lg"
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
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-xl cursor-pointer transition-opacity">
                  <Upload className="h-5 w-5 text-white" />
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
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{currentOrganization.name}</h1>
                <Badge className={ORG_ROLE_COLORS[currentRole]}>
                  {ORG_ROLE_LABELS[currentRole]}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                Quản lý thông tin và thành viên tổ chức
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="h-8 w-8 rounded-lg border border-border shrink-0 shadow-sm"
              style={{ backgroundColor: currentOrganization.primary_color }}
            />
          </div>
        </div>

        {/* Stats */}
        <OrganizationStats members={members} totalContent={contents.length} />

        {/* Tabs Content */}
        <Tabs defaultValue="members" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Thành viên
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Cài đặt
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <OrganizationMembersList
              members={members}
              loading={membersLoading}
              currentRole={currentRole}
              onInviteMember={inviteMember}
              onCreateMember={createMember}
              onUpdateRole={updateMemberRole}
              onRemoveMember={removeMember}
              updating={membersUpdating}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            {/* Approval Settings Card */}
            <ApprovalSettingsCard canEdit={canEdit} />

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Thông tin tổ chức
                </CardTitle>
                <CardDescription>Cập nhật thông tin cơ bản của tổ chức</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium text-destructive">Vùng nguy hiểm</h4>
                        <p className="text-xs text-muted-foreground">
                          Xóa tổ chức sẽ xóa tất cả dữ liệu, nội dung và thành viên.
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="w-full sm:w-auto">
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
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
