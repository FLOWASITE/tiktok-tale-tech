import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  CheckCircle2, Plus, GripVertical, Calendar, Pencil, Trash2,
  ArrowRight, Loader2, LayoutList, LayoutGrid, CalendarDays,
  FileText, Film, Images, Mail
} from 'lucide-react';
import { CampaignContentPlan, CampaignContentPiece } from '@/types/agent';
import { useCampaignPlans } from '@/hooks/useCampaignPlans';
import { ChannelIcon, getChannelLabel } from '@/components/multichannel/streaming/ChannelIcon';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

type ViewMode = 'channel' | 'timeline' | 'list';

const ROLE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  seed: { label: 'Seed', emoji: '🌱', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  sprout: { label: 'Sprout', emoji: '🌿', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  harvest: { label: 'Harvest', emoji: '🌾', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
};

const ANGLE_LABELS: Record<string, string> = {
  educational: 'Giáo dục', comparison: 'So sánh', case_study: 'Case study',
  behind_the_scenes: 'Hậu trường', tips_tricks: 'Tips & Tricks', myth_busting: 'Phá myth',
  testimonial: 'Testimonial', seasonal_hook: 'Seasonal', cta_offer: 'CTA/Offer', storytelling: 'Storytelling',
};

const FORMAT_CONFIG: Record<string, { label: string; icon: typeof FileText }> = {
  post: { label: 'Bài viết', icon: FileText },
  carousel: { label: 'Carousel', icon: Images },
  video_script: { label: 'Video', icon: Film },
  email: { label: 'Email', icon: Mail },
};

const CHANNEL_LIST = ['facebook', 'instagram', 'tiktok', 'linkedin', 'email', 'zalo', 'twitter', 'blog', 'threads', 'pinterest'];

interface CampaignPlanReviewProps {
  plan: CampaignContentPlan;
  goalName: string;
  onClose?: () => void;
}

// ─── Helpers ───
function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    (acc[key] ||= []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

function sortedPieces(pieces: CampaignContentPiece[]) {
  return [...pieces].sort((a, b) => {
    if (!a.scheduled_date && !b.scheduled_date) return a.piece_number - b.piece_number;
    if (!a.scheduled_date) return 1;
    if (!b.scheduled_date) return -1;
    return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
  });
}

function statusBadge(status: string) {
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
}

// ─── Piece Card (shared across views) ───
function PieceCard({
  piece, isEditable, showChannel = false,
  onEdit, onDelete,
}: {
  piece: CampaignContentPiece;
  isEditable: boolean;
  showChannel?: boolean;
  onEdit: (p: CampaignContentPiece) => void;
  onDelete: (n: number) => void;
}) {
  const role = ROLE_CONFIG[piece.content_role];
  const fmt = FORMAT_CONFIG[piece.format] || FORMAT_CONFIG.post;
  const FormatIcon = fmt.icon;

  return (
    <Card className="group hover:border-primary/30 transition-colors h-full">
      <CardContent className="p-3 space-y-2">
        {/* Top row: date + status */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-medium">
            {piece.scheduled_date
              ? format(new Date(piece.scheduled_date), 'dd/MM (EEEE)', { locale: vi })
              : 'Chưa lên lịch'}
          </span>
          {statusBadge(piece.status)}
        </div>

        {/* Role badge */}
        {role && (
          <Badge variant="outline" className={cn('text-[9px] h-4', role.color)}>
            {role.emoji} {role.label}
          </Badge>
        )}

        {/* Title */}
        <p className="text-sm font-medium leading-tight line-clamp-2">{piece.title}</p>

        {/* Key message */}
        {piece.key_message && (
          <p className="text-[11px] text-muted-foreground line-clamp-2">{piece.key_message}</p>
        )}

        {/* Bottom row: format + channel + actions */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[9px] h-4 gap-0.5 bg-muted/50">
              <FormatIcon className="w-2.5 h-2.5" />
              {fmt.label}
            </Badge>
            {showChannel && (
              <ChannelIcon channel={piece.target_channel} size="sm" />
            )}
          </div>
          {isEditable && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => onEdit(piece)}>
                <Pencil className="w-2.5 h-2.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => onDelete(piece.piece_number)}>
                <Trash2 className="w-2.5 h-2.5 text-destructive" />
              </Button>
            </div>
          )}
          {piece.pipeline_id && (
            <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Channel View ───
function ChannelView({
  pieces, isEditable, onEdit, onDelete,
}: {
  pieces: CampaignContentPiece[];
  isEditable: boolean;
  onEdit: (p: CampaignContentPiece) => void;
  onDelete: (n: number) => void;
}) {
  const grouped = groupBy(sortedPieces(pieces), p => p.target_channel);
  const channels = Object.keys(grouped).sort((a, b) => {
    const ai = CHANNEL_LIST.indexOf(a);
    const bi = CHANNEL_LIST.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <div className="space-y-4">
      {channels.map(channel => (
        <Card key={channel}>
          <CardContent className="p-4 space-y-3">
            {/* Channel header */}
            <div className="flex items-center gap-2">
              <ChannelIcon channel={channel} size="md" />
              <span className="text-sm font-semibold">{getChannelLabel(channel)}</span>
              <Badge variant="secondary" className="text-[10px] h-4 ml-auto">
                {grouped[channel].length} bài
              </Badge>
            </div>

            {/* Piece cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {grouped[channel].map(piece => (
                <PieceCard
                  key={piece.piece_number}
                  piece={piece}
                  isEditable={isEditable}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Timeline View ───
function TimelineView({
  pieces, isEditable, onEdit, onDelete,
}: {
  pieces: CampaignContentPiece[];
  isEditable: boolean;
  onEdit: (p: CampaignContentPiece) => void;
  onDelete: (n: number) => void;
}) {
  const sorted = sortedPieces(pieces);
  const grouped = groupBy(sorted, p => p.scheduled_date || '__unscheduled__');
  const dateKeys = Object.keys(grouped).sort((a, b) => {
    if (a === '__unscheduled__') return 1;
    if (b === '__unscheduled__') return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  return (
    <div className="space-y-1">
      {dateKeys.map((dateKey, idx) => {
        const isUnscheduled = dateKey === '__unscheduled__';
        const dateLabel = isUnscheduled
          ? 'Chưa lên lịch'
          : format(new Date(dateKey), "dd/MM (EEEE)", { locale: vi });

        return (
          <div key={dateKey} className="relative">
            {/* Timeline connector */}
            <div className="flex items-start gap-3">
              {/* Dot + line */}
              <div className="flex flex-col items-center pt-1.5 shrink-0">
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full border-2",
                  isUnscheduled ? "border-muted-foreground bg-muted" : "border-primary bg-primary"
                )} />
                {idx < dateKeys.length - 1 && (
                  <div className="w-px flex-1 bg-border min-h-[2rem]" />
                )}
              </div>

              {/* Date content */}
              <div className="flex-1 pb-4 space-y-2">
                <p className="text-xs font-semibold text-foreground">{dateLabel}</p>
                <div className="space-y-1.5">
                  {grouped[dateKey].map(piece => {
                    const role = ROLE_CONFIG[piece.content_role];
                    const fmt = FORMAT_CONFIG[piece.format] || FORMAT_CONFIG.post;
                    const FormatIcon = fmt.icon;
                    return (
                      <div
                        key={piece.piece_number}
                        className="group flex items-center gap-2 p-2 rounded-md border bg-card hover:border-primary/30 transition-colors"
                      >
                        <ChannelIcon channel={piece.target_channel} size="sm" />
                        <p className="text-sm font-medium flex-1 truncate">{piece.title}</p>
                        {role && (
                          <Badge variant="outline" className={cn('text-[9px] h-4 shrink-0', role.color)}>
                            {role.emoji} {role.label}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[9px] h-4 gap-0.5 bg-muted/50 shrink-0">
                          <FormatIcon className="w-2.5 h-2.5" />
                          {fmt.label}
                        </Badge>
                        {statusBadge(piece.status)}
                        {isEditable && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => onEdit(piece)}>
                              <Pencil className="w-2.5 h-2.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => onDelete(piece.piece_number)}>
                              <Trash2 className="w-2.5 h-2.5 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── List View (original) ───
function ListView({
  pieces, isEditable, onEdit, onDelete,
}: {
  pieces: CampaignContentPiece[];
  isEditable: boolean;
  onEdit: (p: CampaignContentPiece) => void;
  onDelete: (n: number) => void;
}) {
  return (
    <div className="space-y-2">
      {pieces.map((piece) => (
        <Card key={piece.piece_number} className="group hover:border-primary/30 transition-colors">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 shrink-0">
                {isEditable && <GripVertical className="w-3 h-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />}
                <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                  {piece.piece_number}
                </span>
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium truncate">{piece.title}</p>
                  {statusBadge(piece.status)}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <ChannelIcon channel={piece.target_channel} size="sm" />
                  <span className="text-[10px] text-muted-foreground">{getChannelLabel(piece.target_channel)}</span>
                  <Badge variant="outline" className={cn('text-[9px] h-4', ROLE_CONFIG[piece.content_role]?.color)}>
                    {ROLE_CONFIG[piece.content_role]?.label || piece.content_role}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] h-4">
                    {ANGLE_LABELS[piece.angle] || piece.angle}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] h-4 bg-muted/50">
                    {(FORMAT_CONFIG[piece.format] || FORMAT_CONFIG.post).label}
                  </Badge>
                </div>
                {piece.key_message && (
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{piece.key_message}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                {piece.scheduled_date && (
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(piece.scheduled_date), 'dd/MM')}
                  </span>
                )}
              </div>
              {isEditable && (
                <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onEdit(piece)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onDelete(piece.piece_number)}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              )}
              {piece.pipeline_id && (
                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Component ───
export function CampaignPlanReview({ plan, goalName, onClose }: CampaignPlanReviewProps) {
  const { updatePlan, approvePlan } = useCampaignPlans();
  const [viewMode, setViewMode] = useState<ViewMode>('channel');
  const [editingPiece, setEditingPiece] = useState<CampaignContentPiece | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CampaignContentPiece>>({});

  const [localPieces, setLocalPieces] = useState<CampaignContentPiece[]>(
    (plan.plan_data || []) as CampaignContentPiece[]
  );

  // Sync local pieces when plan data changes (e.g. after mutation + refetch)
  const planDataJson = JSON.stringify(plan.plan_data);
  useState(() => {}); // placeholder
  // Use a ref-like approach: update localPieces when plan.plan_data changes
  if (JSON.stringify(localPieces) !== planDataJson && !updatePlan.isPending) {
    setLocalPieces((plan.plan_data || []) as CampaignContentPiece[]);
  }

  const pieces = localPieces;
  const isEditable = ['planned', 'draft'].includes(plan.status);
  const isApproved = plan.plan_approved;
  const completedCount = pieces.filter(p => p.status === 'completed').length;
  const progressPercent = pieces.length > 0 ? (completedCount / pieces.length) * 100 : 0;

  // Unique channels for summary
  const uniqueChannels = [...new Set(pieces.map(p => p.target_channel))];

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
    // Optimistic update: apply locally immediately
    setLocalPieces(updatedPieces);
    updatePlan.mutate({ id: plan.id, plan_data: updatedPieces as any });
    setEditDialog(false);
    setEditingPiece(null);
  };

  const handleDeletePiece = (pieceNumber: number) => {
    if (!confirm('Xóa nội dung này khỏi kế hoạch?')) return;
    const updatedPieces = pieces
      .filter(p => p.piece_number !== pieceNumber)
      .map((p, i) => ({ ...p, piece_number: i + 1 }));
    setLocalPieces(updatedPieces);
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
    setLocalPieces(updatedPieces);
    updatePlan.mutate({
      id: plan.id,
      plan_data: updatedPieces as any,
      total_pieces: updatedPieces.length,
    });
  };

  const handleApproveAll = () => {
    approvePlan.mutate(plan.id);
  };

  return (
    <div className="space-y-4">
      {/* Plan Header */}
      <Card>
        <CardContent className="p-4 space-y-3">
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
              {/* Channel summary */}
              <div className="flex items-center gap-1 pt-1">
                {uniqueChannels.map(ch => (
                  <ChannelIcon key={ch} channel={ch} size="sm" />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditable && !isApproved && !approvePlan.isSuccess && (
                <>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleAddPiece}>
                    <Plus className="w-3 h-3" /> Thêm
                  </Button>
                  <Button size="sm" className="gap-1.5 text-xs" onClick={handleApproveAll} disabled={approvePlan.isPending}>
                    {approvePlan.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    Duyệt & Chạy tất cả
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {plan.status === 'executing' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Tiến độ</span>
                <span>{completedCount}/{pieces.length}</span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>
          )}

          {/* View mode toggle */}
          <div className="flex items-center justify-between border-t border-border/50 pt-3">
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)} size="sm">
              <ToggleGroupItem value="channel" className="gap-1 text-xs px-2.5 h-7">
                <LayoutGrid className="w-3 h-3" /> Theo kênh
              </ToggleGroupItem>
              <ToggleGroupItem value="timeline" className="gap-1 text-xs px-2.5 h-7">
                <CalendarDays className="w-3 h-3" /> Timeline
              </ToggleGroupItem>
              <ToggleGroupItem value="list" className="gap-1 text-xs px-2.5 h-7">
                <LayoutList className="w-3 h-3" /> Danh sách
              </ToggleGroupItem>
            </ToggleGroup>
            {plan.strategy_summary && (
              <p className="text-[10px] text-muted-foreground max-w-xs truncate hidden sm:block">
                {plan.strategy_summary}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content Views */}
      {viewMode === 'channel' && (
        <ChannelView pieces={pieces} isEditable={isEditable} onEdit={handleEditPiece} onDelete={handleDeletePiece} />
      )}
      {viewMode === 'timeline' && (
        <TimelineView pieces={pieces} isEditable={isEditable} onEdit={handleEditPiece} onDelete={handleDeletePiece} />
      )}
      {viewMode === 'list' && (
        <ListView pieces={pieces} isEditable={isEditable} onEdit={handleEditPiece} onDelete={handleDeletePiece} />
      )}

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
                    {CHANNEL_LIST.map(ch => (
                      <SelectItem key={ch} value={ch} className="text-xs flex items-center gap-1">
                        {getChannelLabel(ch)}
                      </SelectItem>
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
                    {Object.entries(FORMAT_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
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
