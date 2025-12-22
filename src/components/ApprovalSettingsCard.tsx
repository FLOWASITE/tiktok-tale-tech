import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ClipboardCheck, Save, Loader2, Info } from 'lucide-react';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { OrgRole, ORG_ROLE_LABELS } from '@/types/organization';
import { Skeleton } from '@/components/ui/skeleton';

interface ApprovalSettingsCardProps {
  canEdit: boolean;
}

const ROLE_OPTIONS: { value: OrgRole; label: string; description: string }[] = [
  { value: 'owner', label: 'Chủ sở hữu', description: 'Luôn có quyền duyệt' },
  { value: 'admin', label: 'Quản trị viên', description: 'Quản lý tổ chức' },
  { value: 'member', label: 'Thành viên', description: 'Thành viên thường' },
];

export function ApprovalSettingsCard({ canEdit }: ApprovalSettingsCardProps) {
  const { skipApproval, approverRoles, loading, updating, updateApprovalSettings } = useOrganizationSettings();
  
  const [localSkipApproval, setLocalSkipApproval] = useState(skipApproval);
  const [localApproverRoles, setLocalApproverRoles] = useState<OrgRole[]>(approverRoles);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalSkipApproval(skipApproval);
    setLocalApproverRoles(approverRoles);
  }, [skipApproval, approverRoles]);

  useEffect(() => {
    const skipChanged = localSkipApproval !== skipApproval;
    const rolesChanged = 
      localApproverRoles.length !== approverRoles.length ||
      !localApproverRoles.every(r => approverRoles.includes(r));
    setHasChanges(skipChanged || rolesChanged);
  }, [localSkipApproval, localApproverRoles, skipApproval, approverRoles]);

  const handleRoleToggle = (role: OrgRole) => {
    if (role === 'owner') return; // Owner always has permission
    
    setLocalApproverRoles(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role);
      }
      return [...prev, role];
    });
  };

  const handleSave = async () => {
    await updateApprovalSettings(localSkipApproval, localApproverRoles);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Quy trình phê duyệt
        </CardTitle>
        <CardDescription>
          Cài đặt quy trình duyệt nội dung trong tổ chức
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Skip Approval Toggle */}
        <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-muted/30">
          <Checkbox
            id="skip-approval"
            checked={localSkipApproval}
            onCheckedChange={(checked) => setLocalSkipApproval(!!checked)}
            disabled={!canEdit}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="skip-approval"
              className="text-sm font-medium cursor-pointer"
            >
              Bỏ qua bước phê duyệt
            </Label>
            <p className="text-xs text-muted-foreground">
              Nội dung tạo mới sẽ tự động chuyển sang trạng thái "Đã duyệt"
            </p>
          </div>
        </div>

        {!localSkipApproval && (
          <>
            <Separator />
            
            {/* Approver Roles Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">
                  Ai được phép duyệt nội dung?
                </Label>
                <Badge variant="secondary" className="text-xs">
                  {localApproverRoles.length} vai trò
                </Badge>
              </div>
              
              <div className="space-y-2">
                {ROLE_OPTIONS.map((option) => {
                  const isOwner = option.value === 'owner';
                  const isChecked = localApproverRoles.includes(option.value);
                  
                  return (
                    <div
                      key={option.value}
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                        isChecked 
                          ? 'border-primary/50 bg-primary/5' 
                          : 'border-border bg-background'
                      }`}
                    >
                      <Checkbox
                        id={`role-${option.value}`}
                        checked={isChecked}
                        onCheckedChange={() => handleRoleToggle(option.value)}
                        disabled={!canEdit || isOwner}
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={`role-${option.value}`}
                          className="text-sm font-medium cursor-pointer flex items-center gap-2"
                        >
                          {option.label}
                          {isOwner && (
                            <Badge variant="outline" className="text-xs">
                              Mặc định
                            </Badge>
                          )}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-xs">
                  Người có vai trò được chọn sẽ thấy nút "Duyệt" và "Từ chối" khi có nội dung chờ duyệt.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Save Button */}
        {canEdit && hasChanges && (
          <Button 
            onClick={handleSave} 
            disabled={updating}
            className="w-full"
          >
            {updating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Lưu thay đổi
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
