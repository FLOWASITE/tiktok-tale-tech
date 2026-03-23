import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Users, ShieldCheck, Zap, Settings2 } from 'lucide-react';
import { useAgentTeam } from '@/hooks/useAgentTeam';
import { AgentPermissionDialog } from '@/components/agents/AgentPermissionDialog';
import { AgentTeamMember, AUTONOMY_LEVELS } from '@/types/agent';
import { ORG_ROLE_LABELS, ORG_ROLE_COLORS, canManageMembers } from '@/types/organization';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export default function AgentTeamPage() {
  const { members, loading, stats, upsertPermission } = useAgentTeam();
  const { currentRole } = useOrganizationContext();
  const [editMember, setEditMember] = useState<AgentTeamMember | null>(null);
  const isAdmin = currentRole ? canManageMembers(currentRole) : false;

  const getAutonomyLabel = (level: string) => {
    return AUTONOMY_LEVELS.find(l => l.id === level)?.label || level;
  };

  const handleToggleActive = async (member: AgentTeamMember) => {
    if (!member.permission) return;
    await upsertPermission(member.user_id, {
      ...member.permission,
      is_active: !member.permission.is_active,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quản lý Team AI Agent</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Phân quyền và quản lý thành viên sử dụng AI Agents
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalWithPermissions}</p>
              <p className="text-xs text-muted-foreground">Thành viên có quyền</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.canApproveCount}</p>
              <p className="text-xs text-muted-foreground">Có quyền duyệt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pipelinesThisMonth}</p>
              <p className="text-xs text-muted-foreground">Pipelines tháng này</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Danh sách thành viên</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Đang tải...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thành viên</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Quyền Agent</TableHead>
                  <TableHead>Mức tự động</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  {isAdmin && <TableHead className="w-[80px]">Sửa</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const initials = (member.full_name || member.email)?.slice(0, 2).toUpperCase();
                  const perm = member.permission;
                  const permBadges: string[] = [];
                  if (perm?.can_create_goals) permBadges.push('Tạo');
                  if (perm?.can_approve) permBadges.push('Duyệt');
                  if (perm?.can_override) permBadges.push('Override');

                  return (
                    <TableRow key={member.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatar_url || ''} />
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{member.full_name || member.email}</p>
                            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${ORG_ROLE_COLORS[member.org_role as keyof typeof ORG_ROLE_COLORS] || ''}`}
                        >
                          {ORG_ROLE_LABELS[member.org_role as keyof typeof ORG_ROLE_LABELS] || member.org_role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {permBadges.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {permBadges.map(b => (
                              <Badge key={b} variant="secondary" className="text-xs">{b}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Chưa cấp</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {perm ? (
                          <span className="text-xs">{getAutonomyLabel(perm.max_autonomy_level)}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {perm ? (
                          isAdmin ? (
                            <Switch
                              checked={perm.is_active}
                              onCheckedChange={() => handleToggleActive(member)}
                            />
                          ) : (
                            <Badge variant={perm.is_active ? 'default' : 'outline'} className="text-xs">
                              {perm.is_active ? 'Hoạt động' : 'Tạm dừng'}
                            </Badge>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditMember(member)}
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AgentPermissionDialog
        open={!!editMember}
        onOpenChange={(open) => !open && setEditMember(null)}
        member={editMember}
        onSave={upsertPermission}
      />
    </div>
  );
}
