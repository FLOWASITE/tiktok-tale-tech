import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { History, Send, Save, Loader2, Users } from 'lucide-react';
import { Script } from '@/types/script';
import { ScriptApprovalStatus } from '@/types/scriptCollaboration';
import { useScriptVersions } from '@/hooks/useScriptVersions';
import { useScriptApproval } from '@/hooks/useScriptApproval';
import { ApprovalStatusBadge } from './ApprovalStatusBadge';
import { VersionHistoryDialog } from './VersionHistoryDialog';
import { ApprovalRequestDialog } from './ApprovalRequestDialog';
import { ShareWithTeamToggle } from './ShareWithTeamToggle';

interface ScriptCollaborationPanelProps {
  script: Script;
  onScriptUpdate?: () => void;
}

export function ScriptCollaborationPanel({
  script,
  onScriptUpdate,
}: ScriptCollaborationPanelProps) {
  const { saveVersion, saving } = useScriptVersions(script.id);
  const { approval, fetchApproval, cancelApproval, submitting } = useScriptApproval(script.id);
  
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showApprovalRequest, setShowApprovalRequest] = useState(false);

  // Get collaboration info from script (with type safety)
  const scriptWithCollab = script as Script & {
    status?: string;
    version?: number;
    shared_with_org?: boolean;
    rejection_reason?: string;
  };
  
  const status = (scriptWithCollab.status || 'draft') as ScriptApprovalStatus;
  const version = scriptWithCollab.version || 1;
  const sharedWithOrg = scriptWithCollab.shared_with_org ?? true;

  useEffect(() => {
    fetchApproval();
  }, [fetchApproval]);

  const handleSaveVersion = async () => {
    await saveVersion(script, `Lưu thủ công v${version + 1}`);
    onScriptUpdate?.();
  };

  const handleCancelApproval = async () => {
    if (approval) {
      await cancelApproval(approval.id);
      onScriptUpdate?.();
    }
  };

  const isPending = status === 'pending_approval';
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Hợp tác & Phê duyệt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status & Version */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ApprovalStatusBadge status={status} />
              <span className="text-xs text-muted-foreground">v{version}</span>
            </div>
          </div>

          {/* Share toggle */}
          <ShareWithTeamToggle
            scriptId={script.id}
            initialValue={sharedWithOrg}
            onUpdate={onScriptUpdate}
          />

          <Separator />

          {/* Version actions */}
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={handleSaveVersion}
              disabled={saving || isPending}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Lưu phiên bản
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => setShowVersionHistory(true)}
            >
              <History className="h-4 w-4 mr-2" />
              Lịch sử phiên bản
            </Button>
          </div>

          <Separator />

          {/* Approval actions */}
          <div className="space-y-2">
            {isPending ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Đang chờ phê duyệt từ admin/editor...
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleCancelApproval}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Hủy yêu cầu
                </Button>
              </div>
            ) : isApproved ? (
              <p className="text-xs text-primary">
                ✅ Kịch bản đã được phê duyệt
              </p>
            ) : (
              <Button
                size="sm"
                className="w-full"
                onClick={() => setShowApprovalRequest(true)}
              >
                <Send className="h-4 w-4 mr-2" />
                Gửi phê duyệt
              </Button>
            )}
          </div>

          {/* Rejection reason */}
          {isRejected && scriptWithCollab.rejection_reason && (
            <div className="p-3 bg-destructive/10 rounded-lg">
              <p className="text-xs font-medium text-destructive mb-1">Lý do từ chối:</p>
              <p className="text-xs text-muted-foreground">
                {scriptWithCollab.rejection_reason}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <VersionHistoryDialog
        open={showVersionHistory}
        onOpenChange={setShowVersionHistory}
        script={script}
        onRestore={onScriptUpdate}
      />

      <ApprovalRequestDialog
        open={showApprovalRequest}
        onOpenChange={setShowApprovalRequest}
        script={script}
        onSuccess={onScriptUpdate}
      />
    </>
  );
}
