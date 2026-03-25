import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2, Play, RefreshCw, Pencil, Trash2, Plus, GripVertical,
  Calendar, Sparkles, ArrowRight, Loader2
} from 'lucide-react';
import { CampaignContentPlan, CampaignContentPiece } from '@/types/agent';
import { useCampaignPlans } from '@/hooks/useCampaignPlans';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  seed: { label: 'Seed', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  sprout: { label: 'Sprout', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  harvest: { label: 'Harvest', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
};

const ANGLE_LABELS: Record<string, string> = {
  educational: 'Giáo dục',
  comparison: 'So sánh',
  case_study: 'Case study',
  behind_the_scenes: 'Hậu trường',
  tips_tricks: 'Tips & Tricks',
  myth_busting: 'Phá myth',
  testimonial: 'Testimonial',
  seasonal_hook: 'Seasonal',
  cta_offer: 'CTA/Offer',
  storytelling: 'Storytelling',
};

const FORMAT_LABELS: Record<string, string> = {
  post: 'Bài viết',
  carousel: 'Carousel',
  video_script: 'Video Script',
  email: 'Email',
};

const CHANNEL_ICONS: Record<string, string> = {
  facebook: '📘', instagram: '📷', tiktok: '🎵', linkedin: '💼',
  email: '📧', zalo: '💬', twitter: '🐦', blog: '📝',
  threads: '🧵', pinterest: '📌',
};

interface CampaignPlanReviewProps {
  plan: CampaignContentPlan;
  goalName: string;
  onClose?: () => void;
}

export function CampaignPlanReview({ plan, goalName, onClose }: CampaignPlanReviewProps) {
  const { updatePlan, approvePlan, regeneratePlan } = useCampaignPlans();
  const [editingPiece, setEditingPiece] = useState<CampaignContentPiece | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CampaignContentPiece>>({});

  const pieces = (plan.plan_data || []) as CampaignContentPiece[];
  const isEditable = ['planned', 'draft'].includes(plan.status);
  const isApproved = plan.plan_approved;
  const completedCount = pieces.filter(p => p.status === 'completed').length;
  const progressPercent = pieces.length > 0 ? (completedCount / pieces.length) * 100 : 0;

  const handleEditPiece = (piece: CampaignContentPiece) => {
    setEditingPiece(piece);
    setEditForm({ ...piece });
    setEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!editingPiece || !editForm) return;
    const updatedPieces = pieces.map(p =>
      p.piece_number === editingPiece.piece_number ? { ...p, ...editForm } : p
    );
    updatePlan.mutate({ id: plan.id, plan_data: updatedPieces as any });
    setEditDialog(false);
    setEditingPiece(null);
  };

  const handleDeletePiece = (pieceNumber: number) => {
    if (!confirm('Xóa nội dung này khỏi kế hoạch?')) return;
    const updatedPieces = pieces
      .filter(p => p.piece_number !== pieceNumber)
      .map((p, i) => ({ ...p, piece_number: i + 1 }));
    updatePlan.mutate({
      id: plan.id,
      plan_data: updatedPieces as any,
      total_pieces: updatedPieces.length,
    });
  };

  const handleAddPiece = () => {
    const newPiece: CampaignContentPiece = {
      piece_number: pieces.length + 1,
      title: 'Nội dung mới',
      angle: 'educational',
      content_type: 'multichannel',
      target_channel: 'facebook',
      content_role: 'seed',
      format: 'post',
      scheduled_date: null,
      key_message: '',
      estimated_length: null,
      pipeline_id: null,
      status: 'planned',
    };
    const updatedPieces = [...pieces, newPiece];
    updatePlan.mutate({
      id: plan.id,
      plan_data: updatedPieces as any,
      total_pieces: updatedPieces.length,
    });
  };

  const handleApproveAll = () => {
    approvePlan.mutate(plan.id);
  };

  const statusBadge = (status: string) => {
    const config: Record<string, string> = {
      planned: 'bg-muted text-muted-foreground',
      approved: 'bg-blue-500/10 text-blue-600',
      in_progress: 'bg-amber-500/10 text-amber-600',
      completed: 'bg-emerald-500/10 text-emerald-600',
      failed: 'bg-destructive/10 text-destructive',
    };
    const labels: Record<string, string> = {
      planned: 'Chờ', approved: 'Đã duyệt', in_progress: 'Đang chạy',
      completed: 'Hoàn thành', failed: 'Lỗi',
    };
    return (
      <Badge variant="outline" className={cn('text-[9px] h-4 border', config[status] || '')}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Plan Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">{goalName}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {plan.campaign_start_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(plan.campaign_start_date), 'dd/MM')}
                    {plan.campaign_end_date && ` → ${format(new Date(plan.campaign_end_date), 'dd/MM/yyyy')}`}
                  </span>
                )}
                <span>•</span>
                <span>{pieces.length} nội dung</span>
                <span>•</span>
                <Badge variant="outline" className="text-[9px] h-4">
                  {plan.approval_mode === 'full_auto' ? 'Tự động' : plan.approval_mode === 'approve_each' ? 'Duyệt từng bài' : 'Duyệt kế hoạch'}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditable && !isApproved && (
                <>
                  <Button
                    variant="outline" size="sm" className="gap-1.5 text-xs"
                    onClick={handleAddPiece}
                  >
                    <Plus className="w-3 h-3" /> Thêm
                  </Button>
                  <Button
                    size="sm" className="gap-1.5 text-xs"
                    onClick={handleApproveAll}
                    disabled={approvePlan.isPending}
                  >
                    {approvePlan.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                    Duyệt & Chạy tất cả
                  </Button>
                </>
              )}
            </div>
          </div>
          {/* Progress bar */}
          {plan.status === 'executing' && (
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Tiến độ</span>
                <span>{completedCount}/{pieces.length}</span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Pieces */}
      <div className="space-y-2">
        {pieces.map((piece) => (
          <Card key={piece.piece_number} className="group hover:border-primary/30 transition-colors">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                {/* Piece number */}
                <div className="flex items-center gap-1 shrink-0">
                  {isEditable && <GripVertical className="w-3 h-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />}
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                    {piece.piece_number}
                  </span>
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{piece.title}</p>
                    {statusBadge(piece.status)}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Channel */}
                    <Badge variant="outline" className="text-[9px] h-4 gap-0.5">
                      {CHANNEL_ICONS[piece.target_channel] || '📄'} {piece.target_channel}
                    </Badge>
                    {/* Role */}
                    <Badge variant="outline" className={cn('text-[9px] h-4', ROLE_CONFIG[piece.content_role]?.color)}>
                      {ROLE_CONFIG[piece.content_role]?.label || piece.content_role}
                    </Badge>
                    {/* Angle */}
                    <Badge variant="outline" className="text-[9px] h-4">
                      {ANGLE_LABELS[piece.angle] || piece.angle}
                    </Badge>
                    {/* Format */}
                    <Badge variant="outline" className="text-[9px] h-4 bg-muted/50">
                      {FORMAT_LABELS[piece.format] || piece.format}
                    </Badge>
                  </div>
                  {piece.key_message && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{piece.key_message}</p>
                  )}
                </div>

                {/* Date */}
                <div className="shrink-0 text-right">
                  {piece.scheduled_date && (
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(piece.scheduled_date), 'dd/MM')}
                    </span>
                  )}
                </div>

                {/* Actions */}
                {isEditable && (
                  <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleEditPiece(piece)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeletePiece(piece.piece_number)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                )}

                {/* Pipeline link */}
                {piece.pipeline_id && (
                  <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Piece Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Chỉnh sửa nội dung #{editingPiece?.piece_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tiêu đề</label>
              <Input
                value={editForm.title || ''}
                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Key Message</label>
              <Input
                value={editForm.key_message || ''}
                onChange={e => setEditForm(f => ({ ...f, key_message: e.target.value }))}
                className="text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Kênh</label>
                <Select value={editForm.target_channel} onValueChange={v => setEditForm(f => ({ ...f, target_channel: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CHANNEL_ICONS).map(([ch, icon]) => (
                      <SelectItem key={ch} value={ch} className="text-xs">{icon} {ch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Angle</label>
                <Select value={editForm.angle} onValueChange={v => setEditForm(f => ({ ...f, angle: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ANGLE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Content Role</label>
                <Select value={editForm.content_role} onValueChange={v => setEditForm(f => ({ ...f, content_role: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seed" className="text-xs">🌱 Seed (Thu hút)</SelectItem>
                    <SelectItem value="sprout" className="text-xs">🌿 Sprout (Tương tác)</SelectItem>
                    <SelectItem value="harvest" className="text-xs">🌾 Harvest (Chuyển đổi)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Format</label>
                <Select value={editForm.format} onValueChange={v => setEditForm(f => ({ ...f, format: v as any }))}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FORMAT_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Ngày đăng</label>
              <Input
                type="date"
                value={editForm.scheduled_date || ''}
                onChange={e => setEditForm(f => ({ ...f, scheduled_date: e.target.value }))}
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditDialog(false)}>Hủy</Button>
            <Button size="sm" onClick={handleSaveEdit}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
