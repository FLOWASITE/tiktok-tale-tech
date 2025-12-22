import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { useApprovalAssignments } from '@/hooks/useApprovalAssignments';
import { MemberAvatar } from '@/components/MemberAvatar';
import { Plus, X, UserCheck, Users, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ApproverAssignmentManagerProps {
  canEdit: boolean;
}

export function ApproverAssignmentManager({ canEdit }: ApproverAssignmentManagerProps) {
  const { members, loading: membersLoading } = useOrganizationMembers();
  const { 
    assignments, 
    loading: assignmentsLoading, 
    addAssignment, 
    removeAssignment 
  } = useApprovalAssignments();
  
  const [selectedApprover, setSelectedApprover] = useState<string>('');
  const [selectedCreator, setSelectedCreator] = useState<string>('');
  const [adding, setAdding] = useState(false);

  // Get admins/owners who can be approvers
  const approvers = members.filter(m => m.role === 'owner' || m.role === 'admin');
  
  // Get members/creators (non-viewer)
  const creators = members.filter(m => m.role !== 'viewer');

  const handleAddAssignment = async () => {
    if (!selectedApprover || !selectedCreator) return;
    
    setAdding(true);
    const success = await addAssignment(selectedApprover, selectedCreator);
    if (success) {
      setSelectedApprover('');
      setSelectedCreator('');
    }
    setAdding(false);
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    await removeAssignment(assignmentId);
  };

  // Group assignments by approver
  const groupedAssignments = approvers.map(approver => ({
    approver,
    creatorIds: assignments
      .filter(a => a.approver_id === approver.user_id)
      .map(a => ({ id: a.id, creatorId: a.creator_id })),
  })).filter(g => g.creatorIds.length > 0);

  if (membersLoading || assignmentsLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const getCreatorProfile = (creatorId: string) => {
    return members.find(m => m.user_id === creatorId);
  };

  return (
    <div className="space-y-4">
      {/* Add new assignment */}
      {canEdit && (
        <div className="p-4 border border-dashed border-border rounded-lg bg-muted/20 space-y-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Thêm phân công mới
          </p>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedApprover} onValueChange={setSelectedApprover}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Chọn người duyệt..." />
              </SelectTrigger>
              <SelectContent>
                {approvers.map(approver => (
                  <SelectItem key={approver.user_id} value={approver.user_id}>
                    <div className="flex items-center gap-2">
                      <MemberAvatar 
                        avatarUrl={approver.profile?.avatar_url}
                        name={approver.profile?.full_name}
                        email={approver.profile?.email}
                        size="sm"
                        showStatus={false}
                      />
                      <span>{approver.profile?.full_name || approver.profile?.email}</span>
                      <Badge variant="outline" className="text-xs">
                        {approver.role === 'owner' ? 'Chủ' : 'Admin'}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-sm text-muted-foreground self-center hidden sm:block">duyệt cho</span>

            <Select value={selectedCreator} onValueChange={setSelectedCreator}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Chọn người tạo..." />
              </SelectTrigger>
              <SelectContent>
                {creators.map(creator => (
                  <SelectItem key={creator.user_id} value={creator.user_id}>
                    <div className="flex items-center gap-2">
                      <MemberAvatar 
                        avatarUrl={creator.profile?.avatar_url}
                        name={creator.profile?.full_name}
                        email={creator.profile?.email}
                        size="sm"
                        showStatus={false}
                      />
                      <span>{creator.profile?.full_name || creator.profile?.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              onClick={handleAddAssignment}
              disabled={!selectedApprover || !selectedCreator || adding}
              size="sm"
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Grouped assignments list */}
      {groupedAssignments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Chưa có phân công nào</p>
          <p className="text-xs mt-1">Thêm phân công để chỉ định ai duyệt nội dung của ai</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedAssignments.map(({ approver, creatorIds }) => (
            <div 
              key={approver.user_id}
              className="p-3 border rounded-lg bg-background"
            >
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="h-4 w-4 text-primary" />
                <MemberAvatar 
                  avatarUrl={approver.profile?.avatar_url}
                  name={approver.profile?.full_name}
                  email={approver.profile?.email}
                  size="sm"
                  showStatus={false}
                />
                <span className="font-medium text-sm">
                  {approver.profile?.full_name || approver.profile?.email}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {approver.role === 'owner' ? 'Chủ sở hữu' : 'Quản trị viên'}
                </Badge>
              </div>
              
              <div className="pl-6 space-y-2">
                <p className="text-xs text-muted-foreground mb-2">Duyệt nội dung của:</p>
                <div className="flex flex-wrap gap-2">
                  {creatorIds.map(({ id, creatorId }) => {
                    const creator = getCreatorProfile(creatorId);
                    if (!creator) return null;
                    
                    return (
                      <Badge 
                        key={id} 
                        variant="outline"
                        className="flex items-center gap-1 py-1"
                      >
                        <MemberAvatar 
                          avatarUrl={creator.profile?.avatar_url}
                          name={creator.profile?.full_name}
                          email={creator.profile?.email}
                          size="sm"
                          showStatus={false}
                          className="scale-75"
                        />
                        <span className="text-xs">
                          {creator.profile?.full_name || creator.profile?.email}
                        </span>
                        {canEdit && (
                          <button
                            onClick={() => handleRemoveAssignment(id)}
                            className="ml-1 hover:text-destructive transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
