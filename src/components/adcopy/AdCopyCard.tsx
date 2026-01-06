import { motion } from 'framer-motion';
import { Eye, Trash2, Clock, Target, Layers, Megaphone, FileText, Copy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  type AdCopy, 
  getPlatformConfig, 
  getObjectiveConfig, 
  getStatusConfig,
  getFunnelStageConfig,
  getPlatformLabel
} from '@/types/adCopy';

interface AdCopyCardProps {
  adCopy: AdCopy;
  viewMode: 'grid' | 'list';
  onView: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function AdCopyCard({ adCopy, viewMode, onView, onDelete, onDuplicate }: AdCopyCardProps) {
  const platformConfig = getPlatformConfig(adCopy.platform);
  const objectiveConfig = getObjectiveConfig(adCopy.objective);
  const statusConfig = getStatusConfig(adCopy.status);
  const funnelConfig = getFunnelStageConfig(adCopy.funnel_stage);

  const variationCount = adCopy.variations?.length || 0;

  if (viewMode === 'list') {
    return (
      <Card className="group hover:shadow-md hover:border-primary/30 transition-all duration-200 bg-background/60 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Platform Icon */}
            <div className="shrink-0 p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <span className="text-xl">{platformConfig.icon}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{adCopy.title}</h3>
                {variationCount > 0 && (
                  <Badge variant="secondary" className="shrink-0 gap-1 text-xs">
                    <FileText className="h-3 w-3" />
                    {variationCount}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{adCopy.topic}</p>
            </div>
            
            <div className="hidden sm:flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  statusConfig.color, 
                  statusConfig.bgColor,
                  adCopy.status === 'review' && "animate-pulse"
                )}
              >
                {statusConfig.label}
              </Badge>
              <Badge variant="secondary" className="gap-1 text-xs">
                <Target className="h-3 w-3" />
                {objectiveConfig.label}
              </Badge>
            </div>
            
            <div className="hidden md:block text-sm text-muted-foreground">
              {format(new Date(adCopy.created_at), 'dd/MM/yyyy', { locale: vi })}
            </div>
            
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onView} className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Xem chi tiết</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onDuplicate} className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-500">
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Nhân bản</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Xóa</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group relative hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300 overflow-hidden bg-background/60 backdrop-blur-sm">
      <CardContent className="p-0">
        {/* Header with platform icon */}
        <div className="p-4 pb-3 border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
                <span className="text-xl">{platformConfig.icon}</span>
              </div>
              <div>
                <Badge variant="secondary" className="text-xs">
                  {getPlatformLabel(adCopy.platform)}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {variationCount > 0 && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="gap-1 text-xs">
                      <FileText className="h-3 w-3" />
                      {variationCount}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>{variationCount} biến thể</TooltipContent>
                </Tooltip>
              )}
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs font-medium",
                  statusConfig.color, 
                  statusConfig.bgColor,
                  adCopy.status === 'review' && "animate-pulse"
                )}
              >
                {statusConfig.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">{adCopy.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{adCopy.topic}</p>

          {/* Meta info */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="gap-1 text-xs hover:bg-muted transition-colors">
                  <Target className="h-3 w-3" />
                  {objectiveConfig.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>{objectiveConfig.description}</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className={cn("gap-1 text-xs", funnelConfig.color.replace('bg-', 'text-'))}>
                  <Layers className="h-3 w-3" />
                  {funnelConfig.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>{funnelConfig.description}</TooltipContent>
            </Tooltip>
          </div>

          {/* Brand, Campaign & timestamp */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(adCopy.created_at), 'dd/MM/yyyy', { locale: vi })}
            </div>
            <div className="flex items-center gap-2">
              {adCopy.campaign && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="gap-1 text-xs max-w-[100px]">
                      <Megaphone className="h-3 w-3 shrink-0" />
                      <span className="truncate">{adCopy.campaign.name}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>{adCopy.campaign.name}</TooltipContent>
                </Tooltip>
              )}
              {adCopy.brand_template && (
                <span className="truncate max-w-[80px]">
                  {adCopy.brand_template.brand_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions - Always visible */}
        <div className="px-4 py-3 border-t border-border/50 bg-gradient-to-r from-muted/30 to-muted/10 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onView} 
            className="gap-1 hover:bg-primary/10 hover:text-primary"
          >
            <Eye className="h-4 w-4" />
            Xem chi tiết
          </Button>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onDuplicate}
                  className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-500"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Nhân bản</TooltipContent>
            </Tooltip>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onDelete}
              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </Card>
  );
}
