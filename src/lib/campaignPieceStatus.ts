import type { CampaignContentPiece } from '@/types/agent';
import type { AgentPipelineLite } from '@/hooks/useCampaignPlanPipelines';

export type DerivedPieceStatus =
  | 'not_started'
  | 'queued'
  | 'generating'
  | 'awaiting_approval'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'completed';

export interface DerivedPieceState {
  status: DerivedPieceStatus;
  flagReason?: string | null;
}

const FIVE_MIN = 5 * 60 * 1000;

export function derivePieceStatus(
  piece: CampaignContentPiece,
  pipeline?: AgentPipelineLite | null,
): DerivedPieceState {
  // Priority 1: failed
  if (pipeline?.is_flagged) {
    return { status: 'failed', flagReason: pipeline.flag_reason };
  }
  // Priority 2: completed (pipeline done)
  if (pipeline?.completed_at) {
    return { status: 'published' };
  }
  if (piece.status === 'completed') {
    return { status: 'completed' };
  }
  // Priority 3: real stage from pipeline
  if (pipeline) {
    const stage = pipeline.current_stage;
    if (stage === 'publish') return { status: 'publishing' };
    if (stage === 'approval') return { status: 'awaiting_approval' };
    if (stage === 'create') {
      const last = new Date(pipeline.updated_at).getTime();
      const fresh = Date.now() - last < FIVE_MIN;
      return { status: fresh ? 'generating' : 'queued' };
    }
    return { status: 'queued' };
  }
  // Priority 4: piece.status fallback
  if (piece.pipeline_id) return { status: 'queued' };
  if (piece.status === 'in_progress') return { status: 'queued' };
  return { status: 'not_started' };
}

export interface PieceStatusVisual {
  label: string;
  className: string;
  pulse?: boolean;
}

export const PIECE_STATUS_VISUAL: Record<DerivedPieceStatus, PieceStatusVisual> = {
  not_started: { label: 'Chưa bắt đầu', className: 'bg-muted text-muted-foreground' },
  queued: { label: 'Trong hàng đợi', className: 'bg-slate-500/10 text-slate-600' },
  generating: { label: 'Đang tạo', className: 'bg-blue-500/10 text-blue-600', pulse: true },
  awaiting_approval: { label: 'Chờ duyệt', className: 'bg-amber-500/10 text-amber-600' },
  publishing: { label: 'Đang đăng', className: 'bg-indigo-500/10 text-indigo-600', pulse: true },
  published: { label: 'Đã đăng', className: 'bg-emerald-500/10 text-emerald-600' },
  failed: { label: 'Lỗi', className: 'bg-destructive/10 text-destructive' },
  completed: { label: 'Hoàn tất', className: 'bg-emerald-500/10 text-emerald-600' },
};

export interface PieceStatusSummary {
  not_started: number;
  queued: number;
  generating: number;
  awaiting_approval: number;
  publishing: number;
  published: number;
  failed: number;
  completed: number;
  doneCount: number; // published + completed
}

export function summarizePieceStatuses(states: DerivedPieceState[]): PieceStatusSummary {
  const s: PieceStatusSummary = {
    not_started: 0, queued: 0, generating: 0, awaiting_approval: 0,
    publishing: 0, published: 0, failed: 0, completed: 0, doneCount: 0,
  };
  for (const st of states) {
    s[st.status] = (s[st.status] || 0) + 1;
  }
  s.doneCount = s.published + s.completed;
  return s;
}
