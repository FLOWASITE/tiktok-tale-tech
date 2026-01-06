import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Megaphone, 
  Eye,
  ExternalLink,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useCampaignAdCopies } from '@/hooks/useCampaignAdCopies';
import { AdCopyFormDialog } from '@/components/adcopy/AdCopyFormDialog';
import { AdCopyViewer } from '@/components/adcopy/AdCopyViewer';
import { useAdCopies } from '@/hooks/useAdCopies';
import { 
  type AdCopy,
  getPlatformConfig, 
  getStatusConfig,
  AD_COPY_STATUSES
} from '@/types/adCopy';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface CampaignDetailAdCopiesProps {
  campaignId: string;
}

export function CampaignDetailAdCopies({ campaignId }: CampaignDetailAdCopiesProps) {
  const { adCopies, isLoading, refetch } = useCampaignAdCopies(campaignId);
  const { generateAdCopy, generating } = useAdCopies();
  
  const [showForm, setShowForm] = useState(false);
  const [selectedAdCopy, setSelectedAdCopy] = useState<AdCopy | null>(null);

  const handleCreate = async (formData: Parameters<typeof generateAdCopy>[0]) => {
    const result = await generateAdCopy({
      ...formData,
      campaignId,
    });
    if (result) {
      setShowForm(false);
      refetch();
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Ad Copies ({adCopies.length})
          </CardTitle>
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Tạo Ad Copy
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : adCopies.length === 0 ? (
            <div className="text-center py-8">
              <Megaphone className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium mb-2">Chưa có ad copy nào</p>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                💡 Tạo ad copy để quảng cáo cho chiến dịch này trên các nền tảng như Meta, Google, TikTok...
              </p>
              <Button variant="outline" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Tạo Ad Copy đầu tiên
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {adCopies.map((adCopy) => {
                const platformConfig = getPlatformConfig(adCopy.platform);
                const statusConfig = getStatusConfig(adCopy.status);
                const approvedCount = adCopy.variations?.filter(v => v.is_approved).length || 0;
                const totalVariations = adCopy.variations?.length || 0;

                return (
                  <div
                    key={adCopy.id}
                    className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedAdCopy(adCopy)}
                  >
                    <div className="p-2 rounded-lg bg-primary/10 text-2xl">
                      {platformConfig.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {platformConfig.label}
                        </Badge>
                        <Badge 
                          variant="secondary" 
                          className={cn("text-xs", statusConfig.bgColor, statusConfig.color)}
                        >
                          {statusConfig.label}
                        </Badge>
                        {approvedCount > 0 && (
                          <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {approvedCount}/{totalVariations}
                          </Badge>
                        )}
                      </div>

                      <p className="font-medium text-sm truncate">{adCopy.title}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {adCopy.topic}
                      </p>
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(adCopy.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAdCopy(adCopy);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a href={`/ad-copies?id=${adCopy.id}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Form Dialog */}
      <AdCopyFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={handleCreate}
        isGenerating={generating}
        defaultCampaignId={campaignId}
      />

      {/* Viewer Dialog */}
      {selectedAdCopy && (
        <AdCopyViewer
          open={!!selectedAdCopy}
          onOpenChange={(open) => !open && setSelectedAdCopy(null)}
          adCopy={selectedAdCopy}
        />
      )}
    </>
  );
}
