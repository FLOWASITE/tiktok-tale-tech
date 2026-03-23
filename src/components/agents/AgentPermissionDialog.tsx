import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AgentTeamMember, AgentAutonomyLevel, AUTONOMY_LEVELS } from '@/types/agent';
import { ORG_ROLE_LABELS } from '@/types/organization';
import { PenTool, CheckCircle, Settings2 } from 'lucide-react';

interface AgentPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: AgentTeamMember | null;
  onSave: (userId: string, data: {
    can_create_goals: boolean;
    can_approve: boolean;
    can_override: boolean;
    max_autonomy_level: AgentAutonomyLevel;
    monthly_pipeline_limit: number | null;
    is_active: boolean;
  }) => Promise<void>;
}

export function AgentPermissionDialog({ open, onOpenChange, member, onSave }: AgentPermissionDialogProps) {
  const [canCreateGoals, setCanCreateGoals] = useState(false);
  const [canApprove, setCanApprove] = useState(false);
  const [canOverride, setCanOverride] = useState(false);
  const [maxAutonomy, setMaxAutonomy] = useState<AgentAutonomyLevel>('human_in_loop');
  const [pipelineLimit, setPipelineLimit] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (member?.permission) {
      setCanCreateGoals(member.permission.can_create_goals);
      setCanApprove(member.permission.can_approve);
      setCanOverride(member.permission.can_override);
      setMaxAutonomy(member.permission.max_autonomy_level);
      setPipelineLimit(member.permission.monthly_pipeline_limit?.toString() || '');
      setIsActive(member.permission.is_active);
    } else {
      setCanCreateGoals(false);
      setCanApprove(false);
      setCanOverride(false);
      setMaxAutonomy('human_in_loop');
      setPipelineLimit('');
      setIsActive(true);
    }
  }, [member]);

  const handleSave = async () => {
    if (!member) return;
    setSaving(true);
    try {
      await onSave(member.user_id, {
        can_create_goals: canCreateGoals,
        can_approve: canApprove,
        can_override: canOverride,
        max_autonomy_level: maxAutonomy,
        monthly_pipeline_limit: pipelineLimit ? parseInt(pipelineLimit) : null,
        is_active: isActive,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  if (!member) return null;

  const initials = (member.full_name || member.email)?.slice(0, 2).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Phân quyền AI Agent</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <Avatar className="h-10 w-10">
            <AvatarImage src={member.avatar_url || ''} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{member.full_name || member.email}</p>
            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {ORG_ROLE_LABELS[member.org_role as keyof typeof ORG_ROLE_LABELS] || member.org_role}
          </Badge>
        </div>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Kích hoạt quyền Agent</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Quyền hạn</p>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={canCreateGoals} onCheckedChange={(v) => setCanCreateGoals(!!v)} />
              <div className="flex items-center gap-2">
                <PenTool className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Tạo Campaign mới</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={canApprove} onCheckedChange={(v) => setCanApprove(!!v)} />
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Duyệt content trong pipeline</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={canOverride} onCheckedChange={(v) => setCanOverride(!!v)} />
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Pause/Resume/Skip pipeline</span>
              </div>
            </label>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Mức tự động tối đa</Label>
            <Select value={maxAutonomy} onValueChange={(v) => setMaxAutonomy(v as AgentAutonomyLevel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUTONOMY_LEVELS.map(level => (
                  <SelectItem key={level.id} value={level.id}>
                    <div>
                      <span className="font-medium">{level.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">{level.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Giới hạn pipeline/tháng</Label>
            <Input
              type="number"
              placeholder="Không giới hạn"
              value={pipelineLimit}
              onChange={(e) => setPipelineLimit(e.target.value)}
              min={0}
            />
            <p className="text-xs text-muted-foreground">Để trống = không giới hạn</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu quyền'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
