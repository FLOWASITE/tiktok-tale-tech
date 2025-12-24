import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Copy, 
  Star, 
  StarOff, 
  ArrowRight, 
  Eye,
  Trash2 
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  HookTemplate, 
  UserSavedHook, 
  GeneratedHook,
  FRAMEWORK_LABELS, 
  FRAMEWORK_ICONS, 
  ENGAGEMENT_COLORS 
} from '@/types/hook';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HookCardProps {
  hook: HookTemplate | UserSavedHook | GeneratedHook;
  type: 'template' | 'saved' | 'generated';
  brandCompatible?: boolean;
  onSave?: () => void;
  onUse?: () => void;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
  onPreview?: () => void;
}

export function HookCard({
  hook,
  type,
  brandCompatible,
  onSave,
  onUse,
  onToggleFavorite,
  onDelete,
  onPreview,
}: HookCardProps) {
  const framework = hook.framework;
  const openingLine = type === 'saved' 
    ? (hook as UserSavedHook).customized_opening_line || (hook as UserSavedHook).original_opening_line
    : (hook as HookTemplate | GeneratedHook).opening_line;
  const visualDirection = hook.visual_direction;
  const textOverlay = hook.text_overlay;
  const psychologyReason = 'psychology_reason' in hook ? hook.psychology_reason : null;
  const engagementLevel = 'engagement_level' in hook ? hook.engagement_level : 'medium';
  const isFavorite = type === 'saved' ? (hook as UserSavedHook).is_favorite : false;
  const usageCount = type === 'saved' ? (hook as UserSavedHook).usage_count : 0;
  const name = 'name' in hook ? hook.name : FRAMEWORK_LABELS[framework] || framework;

  const handleCopy = () => {
    navigator.clipboard.writeText(openingLine);
    toast.success('Đã copy hook');
  };

  return (
    <Card className="group hover:border-primary/50 transition-all duration-200">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{FRAMEWORK_ICONS[framework] || '📝'}</span>
            <span className="font-medium text-sm text-foreground">
              {name}
            </span>
            {brandCompatible && (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                Phù hợp Brand
              </Badge>
            )}
          </div>
          <Badge 
            variant="outline" 
            className={`text-xs ${ENGAGEMENT_COLORS[engagementLevel] || ENGAGEMENT_COLORS.medium}`}
          >
            {engagementLevel === 'high' ? '🔥 High' : engagementLevel === 'medium' ? '⚡ Medium' : '📊 Low'}
          </Badge>
        </div>

        {/* Opening Line */}
        <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
          <p className="text-sm font-medium text-foreground leading-relaxed">
            🎬 "{openingLine}"
          </p>
        </div>

        {/* Details */}
        {(visualDirection || textOverlay) && (
          <div className="space-y-1.5 text-xs text-muted-foreground">
            {visualDirection && (
              <p>👁️ <span className="text-foreground/80">{visualDirection}</span></p>
            )}
            {textOverlay && (
              <p>📱 <span className="text-foreground/80">{textOverlay}</span></p>
            )}
          </div>
        )}

        {/* Psychology */}
        {psychologyReason && (
          <div className="text-xs text-muted-foreground bg-secondary/30 rounded-md p-2">
            🧠 {psychologyReason}
          </div>
        )}

        {/* Metadata for templates */}
        {'platforms' in hook && hook.platforms?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {hook.platforms.slice(0, 3).map((platform: string) => (
              <Badge key={platform} variant="secondary" className="text-xs">
                {platform}
              </Badge>
            ))}
            {'duration_fit' in hook && hook.duration_fit?.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                ⏱️ {hook.duration_fit.join(', ')}
              </Badge>
            )}
          </div>
        )}

        {/* Usage count for saved hooks */}
        {type === 'saved' && usageCount > 0 && (
          <div className="text-xs text-muted-foreground">
            Đã sử dụng {usageCount} lần
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleCopy}
                  className="h-8 px-2"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy hook</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {type === 'saved' && onToggleFavorite && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onToggleFavorite}
                    className="h-8 px-2"
                  >
                    {isFavorite ? (
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    ) : (
                      <StarOff className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {onPreview && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onPreview}
                    className="h-8 px-2"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Xem chi tiết</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {type === 'saved' && onDelete && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onDelete}
                    className="h-8 px-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Xóa</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <div className="flex-1" />

          {type !== 'saved' && onSave && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onSave}
              className="h-8"
            >
              💾 Lưu
            </Button>
          )}

          {onUse && (
            <Button 
              size="sm" 
              onClick={onUse}
              className="h-8"
            >
              Sử dụng <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
