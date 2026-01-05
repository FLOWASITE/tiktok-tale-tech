import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getCampaignStatusConfig, type CampaignStatus } from '@/types/campaign';

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
  className?: string;
}

export function CampaignStatusBadge({ status, className }: CampaignStatusBadgeProps) {
  const config = getCampaignStatusConfig(status);
  
  return (
    <Badge 
      variant="secondary" 
      className={cn(config.bgColor, config.color, 'font-medium', className)}
    >
      {config.label}
    </Badge>
  );
}
