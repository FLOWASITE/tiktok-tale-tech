import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ModelUsedBadgeProps {
  modelUsed: string;
  className?: string;
}

/** Parse modelUsed string to extract model name and fallback info */
function parseModelUsed(raw: string) {
  const fallbackMatch = raw.match(/^(.+?)\s*\(fallback from (.+?)\)$/);
  if (fallbackMatch) {
    return {
      model: fallbackMatch[1].trim(),
      isFallback: true,
      originalModel: fallbackMatch[2].trim(),
    };
  }
  return { model: raw.trim(), isFallback: false, originalModel: null };
}

/** Get provider info from model name */
function getProviderInfo(model: string): { name: string; emoji: string; color: string } {
  if (model.startsWith('poyo/')) return { name: 'PoYo.ai', emoji: '🐱', color: 'text-teal-600 dark:text-teal-400' };
  if (model.startsWith('qwen-') || model.startsWith('qwen2')) return { name: 'DashScope', emoji: '☁️', color: 'text-orange-600 dark:text-orange-400' };
  if (model.startsWith('qwen/')) return { name: 'Qwen (OpenRouter)', emoji: '☁️', color: 'text-orange-600 dark:text-orange-400' };
  if (model.includes('kie') || model.includes('flux-kontext')) return { name: 'KIE.ai', emoji: '🔮', color: 'text-violet-600 dark:text-violet-400' };
  if (model.includes('google/') || model.includes('gemini')) return { name: 'Lovable AI', emoji: '✨', color: 'text-blue-600 dark:text-blue-400' };
  if (model.includes('openai/') || model.includes('dall-e') || model.includes('gpt-image')) return { name: 'OpenAI', emoji: '🤖', color: 'text-green-600 dark:text-green-400' };
  if (model.includes('replicate') || model.includes('flux-schnell') || model.includes('sdxl')) return { name: 'Replicate', emoji: '🎨', color: 'text-orange-600 dark:text-orange-400' };
  return { name: 'AI', emoji: '⚡', color: 'text-muted-foreground' };
}

/** Short display name for a model */
function shortModelName(model: string): string {
  // Remove provider prefix for cleaner display
  const parts = model.split('/');
  return parts.length > 1 ? parts[1] : model;
}

export function ModelUsedBadge({ modelUsed, className }: ModelUsedBadgeProps) {
  if (!modelUsed) return null;

  const { model, isFallback, originalModel } = parseModelUsed(modelUsed);
  const provider = getProviderInfo(model);
  const displayName = shortModelName(model);

  const tooltipText = isFallback
    ? `⚠️ Fallback: Model "${originalModel}" thất bại, đã dùng "${model}" thay thế`
    : `✅ Model: ${model} (${provider.name})`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border cursor-default transition-colors',
              isFallback
                ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
              className,
            )}
          >
            {isFallback ? (
              <AlertTriangle className="w-3 h-3" />
            ) : (
              <CheckCircle2 className="w-3 h-3" />
            )}
            <span>{provider.emoji}</span>
            <span className="max-w-[120px] truncate">{displayName}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { parseModelUsed };
