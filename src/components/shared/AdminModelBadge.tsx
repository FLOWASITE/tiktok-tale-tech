import { Link } from 'react-router-dom';
import { Sparkles, Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAdmin } from '@/hooks/useAdmin';
import { useFunctionModel } from '@/hooks/useFunctionModel';
import { getVideoModelCaps, VIDEO_PROVIDER_LABEL } from '@/lib/videoModelCaps';

interface AdminModelBadgeProps {
  functionName: string;
  defaultModel: string;
  organizationId?: string | null;
  /** Optional friendly label override, e.g. "Veo 3.1 Fast" */
  labelMap?: Record<string, string>;
}

/**
 * Read-only badge that surfaces which AI model an Admin has chosen
 * for a given backend function. Users cannot change the model here.
 * Admins see a quick link to `/admin/ai` to reconfigure.
 *
 * For `generate-video`, the tooltip also surfaces provider/aspect/duration caps
 * so users know what the configured model can produce.
 */
export function AdminModelBadge({
  functionName,
  defaultModel,
  organizationId,
  labelMap,
}: AdminModelBadgeProps) {
  const { data } = useFunctionModel(functionName, defaultModel, organizationId);
  const { isAdmin } = useAdmin();

  const model = data?.model ?? defaultModel;
  const friendly = labelMap?.[model] ?? model;
  const isVideoFn = functionName === 'generate-video';
  const caps = isVideoFn ? getVideoModelCaps(model) : null;

  const inner = (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/40 border border-border/50 text-[11px] text-muted-foreground">
      <Sparkles className="w-3 h-3 text-foreground/60" />
      <span className="font-medium text-foreground">Model:</span>
      <span className="font-mono">{friendly}</span>
      <Lock className="w-2.5 h-2.5 ml-0.5 opacity-60" />
    </span>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {isAdmin ? (
            <Link to="/admin/ai" className="hover:opacity-80 transition-opacity">
              {inner}
            </Link>
          ) : (
            inner
          )}
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[280px] space-y-1.5">
          {caps && (
            <div className="space-y-1 pb-1.5 border-b border-border/40">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Provider:</span>
                <b>{VIDEO_PROVIDER_LABEL[caps.provider]}</b>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Aspect:</span>
                <span className="font-mono">{caps.aspectRatios.join(' · ')}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Max duration:</span>
                <span className="font-mono">{caps.maxDuration}s</span>
              </div>
            </div>
          )}
          <p>
            Model AI cho tính năng này do <b>Admin</b> cấu hình tại{' '}
            <span className="font-mono">/admin/ai{isVideoFn ? ' → Video' : ''}</span>. Người dùng cuối không tự đổi
            để đảm bảo chất lượng & chi phí đồng nhất.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
