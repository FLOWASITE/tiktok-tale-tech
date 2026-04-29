import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Share2, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  ExternalLink
} from 'lucide-react';
import { ChannelStatus } from '@/hooks/useCampaignChannelIntegration';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { ChannelIcon } from '@/components/multichannel/streaming/ChannelIcon';

interface CampaignChannelStatusProps {
  channelStatuses: ChannelStatus[];
  brandTemplateId?: string | null;
  isLoading?: boolean;
}

// Icons rendered via shared <ChannelIcon /> for brand consistency

export function CampaignChannelStatus({ 
  channelStatuses, 
  brandTemplateId,
  isLoading 
}: CampaignChannelStatusProps) {
  if (channelStatuses.length === 0) {
    return null;
  }

  const connectedCount = channelStatuses.filter(s => s.isConnected).length;
  const totalCount = channelStatuses.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Kênh phân phối
          </div>
          <Badge variant={connectedCount === totalCount ? "default" : "secondary"}>
            {connectedCount}/{totalCount} đã kết nối
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {channelStatuses.map((status) => {
              return (
                <div 
                  key={status.channel}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    !status.isConnected && "border-yellow-500/30 bg-yellow-500/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {status.isConnected && status.connectionAvatar ? (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={status.connectionAvatar} />
                        <AvatarFallback>
                          <ChannelIcon channel={status.channel} size="sm" />
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <ChannelIcon channel={status.channel} size="md" />
                    )}
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm capitalize">
                          {status.channel}
                        </span>
                        {status.isConnected ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      {status.connectionUsername && (
                        <p className="text-xs text-muted-foreground">
                          @{status.connectionUsername}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      <span>{status.contentCount}</span>
                    </div>
                    
                    {!status.isConnected && brandTemplateId && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="h-7 text-xs"
                      >
                        <Link to={`/brands/${brandTemplateId}?tab=connections`}>
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Kết nối
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
