import { Link } from 'react-router-dom';
import { Sparkles, Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAdmin } from '@/hooks/useAdmin';
import { useFunctionModel } from '@/hooks/useFunctionModel';

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
        <TooltipContent side="top" className="text-xs max-w-[260px]">
          Model AI cho tính năng này do <b>Admin</b> cấu hình tại{' '}
          <span className="font-mono">/admin/ai</span>. Người dùng cuối không tự đổi
          để đảm bảo chất lượng & chi phí đồng nhất.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
