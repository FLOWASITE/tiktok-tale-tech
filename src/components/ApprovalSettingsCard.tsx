import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ClipboardCheck, Save, Loader2, Info, Users, UserCog } from 'lucide-react';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { OrgRole, ORG_ROLE_LABELS } from '@/types/organization';
import { Skeleton } from '@/components/ui/skeleton';
import { ApproverAssignmentManager } from '@/components/ApproverAssignmentManager';

interface ApprovalSettingsCardProps {
  canEdit: boolean;
}

const ROLE_OPTIONS: { value: OrgRole; label: string; description: string }[] = [
  { value: 'owner', label: 'Chủ sở hữu', description: 'Luôn có quyền duyệt' },
  { value: 'admin', label: 'Quản trị viên', description: 'Quản lý tổ chức' },
  { value: 'member', label: 'Thành viên', description: 'Thành viên thường' },
];

export function ApprovalSettingsCard({ canEdit }: ApprovalSettingsCardProps) {
  const { 
    skipApproval, 
    approverRoles, 
    useSpecificApprovers,
    loading, 
    updating, 
    updateApprovalSettings,
    updateUseSpecificApprovers 
  } = useOrganizationSettings();
  
  const [localSkipApproval, setLocalSkipApproval] = useState(skipApproval);
  const [localApproverRoles, setLocalApproverRoles] = useState<OrgRole[]>(approverRoles);
  const [localUseSpecificApprovers, setLocalUseSpecificApprovers] = useState(useSpecificApprovers);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalSkipApproval(skipApproval);
    setLocalApproverRoles(approverRoles);
    setLocalUseSpecificApprovers(useSpecificApprovers);
  }, [skipApproval, approverRoles, useSpecificApprovers]);

  useEffect(() => {
    const skipChanged = localSkipApproval !== skipApproval;
    const rolesChanged = 
      localApproverRoles.length !== approverRoles.length ||
      !localApproverRoles.every(r => approverRoles.includes(r));
    const modeChanged = localUseSpecificApprovers !== useSpecificApprovers;
    setHasChanges(skipChanged || rolesChanged || modeChanged);
  }, [localSkipApproval, localApproverRoles, localUseSpecificApprovers, skipApproval, approverRoles, useSpecificApprovers]);

  const handleRoleToggle = (role: OrgRole) => {
    if (role === 'owner') return; // Owner always has permission
    
    setLocalApproverRoles(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role);
      }
      return [...prev, role];
    });
  };

  const handleModeChange = (value: string) => {
    setLocalUseSpecificApprovers(value === 'specific');
  };

  const handleSave = async () => {
    await updateApprovalSettings(localSkipApproval, localApproverRoles, localUseSpecificApprovers);
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
            
            {/* Approval Mode Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Chế độ phân quyền duyệt
              </Label>
              
              <RadioGroup 
                value={localUseSpecificApprovers ? 'specific' : 'role'}
                onValueChange={handleModeChange}
                disabled={!canEdit}
                className="space-y-2"
              >
                <div className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                  !localUseSpecificApprovers 
                    ? 'border-primary/50 bg-primary/5' 
                    : 'border-border bg-background'
                }`}>
                  <RadioGroupItem value="role" id="mode-role" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="mode-role" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Theo vai trò
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ai có vai trò được chọn đều có thể duyệt mọi nội dung
                    </p>
                  </div>
                </div>
                
                <div className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                  localUseSpecificApprovers 
                    ? 'border-primary/50 bg-primary/5' 
                    : 'border-border bg-background'
                }`}>
                  <RadioGroupItem value="specific" id="mode-specific" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="mode-specific" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                      <UserCog className="h-4 w-4" />
                      Phân công người duyệt cụ thể
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Chỉ định admin nào duyệt nội dung của thành viên nào
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Role-based approvers */}
            {!localUseSpecificApprovers && (
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
            )}

            {/* Specific approver assignments */}
            {localUseSpecificApprovers && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">
                    Phân công người duyệt
                  </Label>
                </div>
                
                <ApproverAssignmentManager canEdit={canEdit} />
                
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <p className="text-xs">
                    Chủ sở hữu luôn có quyền duyệt tất cả nội dung. Các admin chỉ duyệt được nội dung của những người được phân công.
                  </p>
                </div>
              </div>
            )}
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
