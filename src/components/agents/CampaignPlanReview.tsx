import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FileText, Film, Images, Mail, ChevronRight
} from 'lucide-react';
import { getPieceTarget } from '@/lib/campaignPieceNav';
import { CampaignContentPlan, CampaignContentPiece } from '@/types/agent';
import { useCampaignPlans } from '@/hooks/useCampaignPlans';
import { useCampaignPlanPipelines } from '@/hooks/useCampaignPlanPipelines';
import {
  derivePieceStatus,
  PIECE_STATUS_VISUAL,
  summarizePieceStatuses,
  type DerivedPieceState,
} from '@/lib/campaignPieceStatus';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChannelIcon, getChannelLabel } from '@/components/multichannel/streaming/ChannelIcon';
import { PieceTopicSuggestPopover } from './PieceTopicSuggestPopover';
import type { PieceTopicSuggestion, SuggestPieceTopicsInput } from '@/hooks/agents/useSuggestPieceTopics';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { ReactNode } from 'react';

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
  brandTemplateId?: string | null;
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

function statusBadge(derived: DerivedPieceState) {
  const v = PIECE_STATUS_VISUAL[derived.status];
  const badge = (
    <Badge
      variant="outline"
      className={cn('text-[9px] h-4 border gap-1', v.className)}
    >
      {v.pulse && <span className="w-1 h-1 rounded-full bg-current animate-pulse" />}
      {v.label}
    </Badge>
  );
  if (derived.status === 'failed' && derived.flagReason) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild><span>{badge}</span></TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-[11px]">
            {derived.flagReason}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return badge;
}

// ─── Piece Card (shared across views) ───
function PieceCard({
  piece, isEditable, showChannel = false,
  onEdit, onDelete, onOpen, renderSuggest, derivedFor,
}: {
  piece: CampaignContentPiece;
  isEditable: boolean;
  showChannel?: boolean;
  onEdit: (p: CampaignContentPiece) => void;
  onDelete: (n: number) => void;
  onOpen: (p: CampaignContentPiece) => void;
  renderSuggest?: (p: CampaignContentPiece) => ReactNode;
  derivedFor: (p: CampaignContentPiece) => DerivedPieceState;
}) {
  const role = ROLE_CONFIG[piece.content_role];
  const fmt = FORMAT_CONFIG[piece.format] || FORMAT_CONFIG.post;
  const FormatIcon = fmt.icon;
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <Card
      className="group hover:border-primary/40 hover:shadow-sm transition-all h-full cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(piece)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(piece); } }}
      title="Mở Content Studio"
    >
      <CardContent className="p-3 space-y-2">
        {/* Top row: date + status */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-medium">
            {piece.scheduled_date
              ? format(new Date(piece.scheduled_date), 'dd/MM (EEEE)', { locale: vi })
              : 'Chưa lên lịch'}
          </span>
          {statusBadge(derivedFor(piece))}
        </div>

        {/* Role badge */}
        {role && (
          <Badge variant="outline" className={cn('text-[9px] h-4', role.color)}>
            {role.emoji} {role.label}
          </Badge>
        )}

        {/* Title + suggest */}
        <div className="flex items-start gap-1">
          <p className="text-sm font-medium leading-tight line-clamp-2 flex-1">{piece.title}</p>
          {isEditable && <span onClick={stop}>{renderSuggest?.(piece)}</span>}
        </div>

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
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={stop}>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { stop(e); onEdit(piece); }}>
                <Pencil className="w-2.5 h-2.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { stop(e); onDelete(piece.piece_number); }}>
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
  pieces, isEditable, onEdit, onDelete, onOpen, renderSuggest,
}: {
  pieces: CampaignContentPiece[];
  isEditable: boolean;
  onEdit: (p: CampaignContentPiece) => void;
  onDelete: (n: number) => void;
  onOpen: (p: CampaignContentPiece) => void;
  renderSuggest?: (p: CampaignContentPiece) => ReactNode;
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
                  onOpen={onOpen}
                  renderSuggest={renderSuggest}
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
  pieces, isEditable, onEdit, onDelete, onOpen, renderSuggest,
}: {
  pieces: CampaignContentPiece[];
  isEditable: boolean;
  onEdit: (p: CampaignContentPiece) => void;
  onDelete: (n: number) => void;
  onOpen: (p: CampaignContentPiece) => void;
  renderSuggest?: (p: CampaignContentPiece) => ReactNode;
}) {
  const sorted = sortedPieces(pieces);
  const grouped = groupBy(sorted, p => p.scheduled_date || '__unscheduled__');
  const dateKeys = Object.keys(grouped).sort((a, b) => {
    if (a === '__unscheduled__') return 1;
    if (b === '__unscheduled__') return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });
  const stop = (e: React.MouseEvent) => e.stopPropagation();

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
                        role="button"
                        tabIndex={0}
                        onClick={() => onOpen(piece)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(piece); } }}
                        title="Mở Content Studio"
                        className="group flex items-center gap-2 p-2 rounded-md border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer"
                      >
                        <ChannelIcon channel={piece.target_channel} size="sm" />
                        <p className="text-sm font-medium flex-1 truncate">{piece.title}</p>
                        {isEditable && <span onClick={stop}>{renderSuggest?.(piece)}</span>}
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
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={stop}>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { stop(e); onEdit(piece); }}>
                              <Pencil className="w-2.5 h-2.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { stop(e); onDelete(piece.piece_number); }}>
                              <Trash2 className="w-2.5 h-2.5 text-destructive" />
                            </Button>
                          </div>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
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

// ─── List View (default, polished) ───
function ListView({
  pieces, isEditable, onEdit, onDelete, onOpen, renderSuggest,
}: {
  pieces: CampaignContentPiece[];
  isEditable: boolean;
  onEdit: (p: CampaignContentPiece) => void;
  onDelete: (n: number) => void;
  onOpen: (p: CampaignContentPiece) => void;
  renderSuggest?: (p: CampaignContentPiece) => ReactNode;
}) {
  const sorted = sortedPieces(pieces);
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className="space-y-1.5">
      {/* Table header */}
      <div className="hidden sm:grid grid-cols-[2rem_1fr_auto_auto_auto_auto_auto] gap-2 px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        <span>#</span>
        <span>Nội dung</span>
        <span>Kênh</span>
        <span>Vai trò</span>
        <span>Format</span>
        <span>Ngày</span>
        <span>Trạng thái</span>
      </div>
      {sorted.map((piece) => {
        const role = ROLE_CONFIG[piece.content_role];
        const fmt = FORMAT_CONFIG[piece.format] || FORMAT_CONFIG.post;
        const FormatIcon = fmt.icon;
        const angle = ANGLE_LABELS[piece.angle] || piece.angle;

        return (
          <Card
            key={piece.piece_number}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(piece)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(piece); } }}
            title="Mở Content Studio"
            className="group hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer"
          >
            <CardContent className="p-0">
              {/* Desktop row */}
              <div className="hidden sm:grid grid-cols-[2rem_1fr_auto_auto_auto_auto_auto] gap-2 items-center px-3 py-2.5">
                <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
                  {piece.piece_number}
                </span>
                <div className="min-w-0 space-y-0.5 flex items-start gap-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate leading-tight">{piece.title}</p>
                    {piece.key_message && (
                      <p className="text-[10px] text-muted-foreground truncate">{piece.key_message}</p>
                    )}
                  </div>
                  {isEditable && <span onClick={stop}>{renderSuggest?.(piece)}</span>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <ChannelIcon channel={piece.target_channel} size="sm" />
                  <span className="text-[10px] text-muted-foreground">{getChannelLabel(piece.target_channel)}</span>
                </div>
                <div className="shrink-0">
                  {role && (
                    <Badge variant="outline" className={cn('text-[9px] h-4', role.color)}>
                      {role.emoji} {role.label}
                    </Badge>
                  )}
                </div>
                <Badge variant="outline" className="text-[9px] h-4 gap-0.5 bg-muted/50 shrink-0">
                  <FormatIcon className="w-2.5 h-2.5" />
                  {fmt.label}
                </Badge>
                <span className="text-[10px] text-muted-foreground shrink-0 min-w-[3rem] text-right">
                  {piece.scheduled_date ? format(new Date(piece.scheduled_date), 'dd/MM') : '—'}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {statusBadge(piece.status)}
                  {isEditable && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={stop}>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { stop(e); onEdit(piece); }}>
                        <Pencil className="w-2.5 h-2.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { stop(e); onDelete(piece.piece_number); }}>
                        <Trash2 className="w-2.5 h-2.5 text-destructive" />
                      </Button>
                    </div>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Mobile layout */}
              <div className="sm:hidden p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0 mt-0.5">
                    {piece.piece_number}
                  </span>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate flex-1">{piece.title}</p>
                      {isEditable && <span onClick={stop}>{renderSuggest?.(piece)}</span>}
                      {statusBadge(piece.status)}
                    </div>
                    {piece.key_message && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{piece.key_message}</p>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <ChannelIcon channel={piece.target_channel} size="sm" />
                      <span className="text-[10px] text-muted-foreground">{getChannelLabel(piece.target_channel)}</span>
                      {role && (
                        <Badge variant="outline" className={cn('text-[9px] h-4', role.color)}>
                          {role.emoji} {role.label}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[9px] h-4 gap-0.5 bg-muted/50">
                        <FormatIcon className="w-2.5 h-2.5" />
                        {fmt.label}
                      </Badge>
                      {piece.scheduled_date && (
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {format(new Date(piece.scheduled_date), 'dd/MM')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {isEditable && (
                  <div className="flex items-center gap-1 justify-end" onClick={stop}>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { stop(e); onEdit(piece); }}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { stop(e); onDelete(piece.piece_number); }}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Main Component ───
export function CampaignPlanReview({ plan, goalName, brandTemplateId, onClose }: CampaignPlanReviewProps) {
  const navigate = useNavigate();
  const { updatePlan, approvePlan } = useCampaignPlans();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingPiece, setEditingPiece] = useState<CampaignContentPiece | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CampaignContentPiece>>({});

  const handleOpenPiece = (piece: CampaignContentPiece) => {
    const { path } = getPieceTarget(piece, {
      planId: plan.id,
      brandTemplateId: brandTemplateId || null,
      organizationId: plan.organization_id,
    });
    navigate(path);
  };

  const [localPieces, setLocalPieces] = useState<CampaignContentPiece[]>(
    (plan.plan_data || []) as CampaignContentPiece[]
  );

  // Sync local pieces when plan data changes from server (after mutation + refetch)
  useEffect(() => {
    if (!updatePlan.isPending) {
      setLocalPieces((plan.plan_data || []) as CampaignContentPiece[]);
    }
  }, [plan.plan_data, updatePlan.isPending]);

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

  const handleApplySuggestion = (pieceNumber: number, s: PieceTopicSuggestion) => {
    const updated = pieces.map(p =>
      p.piece_number === pieceNumber
        ? { ...p, title: s.title, key_message: s.key_message || p.key_message }
        : p,
    );
    setLocalPieces(updated);
    updatePlan.mutate({ id: plan.id, plan_data: updated as any });
  };

  const renderSuggest = (piece: CampaignContentPiece) => (
    <PieceTopicSuggestPopover
      variant="icon-xs"
      input={{
        piece: {
          angle: piece.angle,
          content_role: piece.content_role,
          target_channel: piece.target_channel,
          title: piece.title,
          key_message: piece.key_message ?? undefined,
          pillar: (piece as any).pillar,
        } as SuggestPieceTopicsInput['piece'],
        brand_template_id: brandTemplateId || undefined,
        organization_id: plan.organization_id,
        campaign_title: goalName,
        existing_titles: pieces
          .filter(p => p.piece_number !== piece.piece_number)
          .map(p => p.title)
          .filter(Boolean),
        clarification_context: plan.clarification_context || undefined,
      }}
      onPick={(s) => handleApplySuggestion(piece.piece_number, s)}
    />
  );

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
        <ChannelView pieces={pieces} isEditable={isEditable} onEdit={handleEditPiece} onDelete={handleDeletePiece} onOpen={handleOpenPiece} renderSuggest={renderSuggest} />
      )}
      {viewMode === 'timeline' && (
        <TimelineView pieces={pieces} isEditable={isEditable} onEdit={handleEditPiece} onDelete={handleDeletePiece} onOpen={handleOpenPiece} renderSuggest={renderSuggest} />
      )}
      {viewMode === 'list' && (
        <ListView pieces={pieces} isEditable={isEditable} onEdit={handleEditPiece} onDelete={handleDeletePiece} onOpen={handleOpenPiece} renderSuggest={renderSuggest} />
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
