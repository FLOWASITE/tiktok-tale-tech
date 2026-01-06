import { Eye, Trash2, Clock, Target, Layers, Megaphone } from 'lucide-react';
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
  getFunnelStageConfig
} from '@/types/adCopy';

interface AdCopyCardProps {
  adCopy: AdCopy;
  viewMode: 'grid' | 'list';
  onView: () => void;
  onDelete: () => void;
}

export function AdCopyCard({ adCopy, viewMode, onView, onDelete }: AdCopyCardProps) {
  const platformConfig = getPlatformConfig(adCopy.platform);
  const objectiveConfig = getObjectiveConfig(adCopy.objective);
  const statusConfig = getStatusConfig(adCopy.status);
  const funnelConfig = getFunnelStageConfig(adCopy.funnel_stage);

  if (viewMode === 'list') {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{platformConfig.icon}</span>
                <h3 className="font-semibold truncate">{adCopy.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground truncate">{adCopy.topic}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn(statusConfig.color, statusConfig.bgColor)}>
                {statusConfig.label}
              </Badge>
              <Badge variant="secondary">
                {objectiveConfig.icon} {objectiveConfig.label}
              </Badge>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {format(new Date(adCopy.created_at), 'dd/MM/yyyy', { locale: vi })}
            </div>
            
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={onView}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onDelete}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden">
      <CardContent className="p-0">
        {/* Header with platform icon */}
        <div className="p-4 pb-3 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{platformConfig.icon}</span>
              <div>
                <Badge variant="secondary" className="text-xs">
                  {platformConfig.label}
                </Badge>
              </div>
            </div>
            <Badge variant="outline" className={cn(statusConfig.color, statusConfig.bgColor, 'text-xs')}>
              {statusConfig.label}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold mb-2 line-clamp-2">{adCopy.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{adCopy.topic}</p>

          {/* Meta info */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="gap-1 text-xs">
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
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Megaphone className="h-3 w-3" />
                      {adCopy.campaign.name.length > 15 
                        ? adCopy.campaign.name.slice(0, 15) + '...' 
                        : adCopy.campaign.name}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>{adCopy.campaign.name}</TooltipContent>
                </Tooltip>
              )}
              {adCopy.brand_template && (
                <span className="truncate max-w-[100px]">
                  {adCopy.brand_template.brand_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t border-border/50 bg-muted/30 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={onView} className="gap-1">
            <Eye className="h-4 w-4" />
            Xem chi tiết
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
