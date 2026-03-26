import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Check, X, Edit3, Eye, Clock, Shield, BarChart3 } from 'lucide-react';
import { AgentApproval } from '@/types/agent';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ApprovalQueueProps {
  approvals: AgentApproval[];
  onApprove: (id: string, notes?: string) => void;
  onReject: (id: string, notes: string) => void;
}

export function ApprovalQueue({ approvals, onApprove, onReject }: ApprovalQueueProps) {
  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);

  const pending = approvals.filter(a => a.status === 'pending');
  const reviewed = approvals.filter(a => a.status !== 'pending');
  const previewApproval = approvals.find(a => a.id === previewId);

  const handleReject = () => {
    if (rejectDialog && rejectNotes.trim()) {
      onReject(rejectDialog, rejectNotes);
      setRejectDialog(null);
      setRejectNotes('');
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    rejected: 'bg-red-500/10 text-red-600 border-red-500/30',
    edited: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
    edited: 'Đã sửa',
  };

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Chờ duyệt ({pending.length})
          </h3>
          {pending.map(approval => (
            <Card key={approval.id} className="border-l-[3px] border-l-amber-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-medium line-clamp-2">{approval.content_preview || 'Nội dung chưa có preview'}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {approval.scores?.seo != null && (
                        <Badge variant="outline" className="text-[10px] h-5 gap-1">
                          <BarChart3 className="w-2.5 h-2.5" /> SEO: {approval.scores.seo}
                        </Badge>
                      )}
                      {approval.scores?.geo != null && (
                        <Badge variant="outline" className="text-[10px] h-5 gap-1">
                          <BarChart3 className="w-2.5 h-2.5" /> GEO: {approval.scores.geo}
                        </Badge>
                      )}
                      {approval.scores?.compliance && (
                        <Badge variant="outline" className={cn('text-[10px] h-5 gap-1',
                          approval.scores.compliance === 'pass' ? 'text-emerald-600' : 'text-red-600'
                        )}>
                          <Shield className="w-2.5 h-2.5" /> {approval.scores.compliance}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(approval.created_at), { locale: vi, addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setPreviewId(approval.id)}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="default" className="h-8 gap-1 text-xs" onClick={() => onApprove(approval.id)}>
                      <Check className="w-3 h-3" /> Duyệt
                    </Button>
                    <Button size="sm" variant="destructive" className="h-8 gap-1 text-xs" onClick={() => setRejectDialog(approval.id)}>
                      <X className="w-3 h-3" /> Từ chối
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Đã xử lý ({reviewed.length})</h3>
          {reviewed.slice(0, 10).map(approval => (
            <Card key={approval.id} className="opacity-60">
              <CardContent className="p-3 flex items-center justify-between">
                <p className="text-xs line-clamp-1 flex-1">{approval.content_preview || 'N/A'}</p>
                <Badge variant="outline" className={cn('text-[10px]', statusColors[approval.status])}>
                  {statusLabels[approval.status]}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {approvals.length === 0 && (
        <div className="text-center py-12">
          <Check className="w-10 h-10 text-emerald-500/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Không có nội dung nào cần duyệt</p>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối nội dung</DialogTitle>
            <DialogDescription>Vui lòng nhập lý do từ chối để gửi phản hồi cho AI.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Lý do từ chối (bắt buộc)..."
            value={rejectNotes}
            onChange={e => setRejectNotes(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectDialog(null)}>Hủy</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectNotes.trim()}>Từ chối</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewId} onOpenChange={() => setPreviewId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Xem trước nội dung</DialogTitle>
            <DialogDescription>Nội dung đang chờ duyệt từ pipeline AI Agent.</DialogDescription>
          </DialogHeader>
          {previewApproval && (
            <div className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <p>{previewApproval.content_preview}</p>
              </div>
              {previewApproval.channel_versions && Object.keys(previewApproval.channel_versions).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Phiên bản theo kênh</h4>
                  {Object.entries(previewApproval.channel_versions).map(([channel, content]) => (
                    <Card key={channel}>
                      <CardHeader className="py-2 px-3">
                        <CardTitle className="text-xs uppercase">{channel}</CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 pb-3">
                        <p className="text-xs text-muted-foreground line-clamp-4">{String(content)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
