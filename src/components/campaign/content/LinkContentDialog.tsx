import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Layers, Video, Images, Search, Check, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useCampaignDetail } from '@/hooks/useCampaigns';
import { cn } from '@/lib/utils';
import { CampaignContentType } from '@/types/campaign';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ContentWithChannels {
  id: string;
  title: string;
  status?: string | null;
  created_at: string;
  selected_channels?: string[];
  platform?: string;
}

interface LinkContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

export function LinkContentDialog({ open, onOpenChange, campaignId }: LinkContentDialogProps) {
  const { currentOrganization } = useOrganizationContext();
  const { linkContent, campaign } = useCampaignDetail(campaignId);
  
  const [activeTab, setActiveTab] = useState<CampaignContentType>('multichannel');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [plannedDate, setPlannedDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [showMatchingOnly, setShowMatchingOnly] = useState(false);

  const targetChannels = campaign?.target_channels || [];

  // Fetch multichannel contents
  const { data: multichannelContents = [] } = useQuery({
    queryKey: ['multichannel-contents-with-channels', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const { data } = await supabase
        .from('multi_channel_contents')
        .select('id, title, status, created_at, selected_channels')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return (data || []) as ContentWithChannels[];
    },
    enabled: open && !!currentOrganization?.id,
  });

  // Fetch scripts
  const { data: scripts = [] } = useQuery({
    queryKey: ['scripts-for-campaign', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const { data } = await supabase
        .from('scripts')
        .select('id, title, status, created_at')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return (data || []) as ContentWithChannels[];
    },
    enabled: open && !!currentOrganization?.id,
  });

  // Fetch carousels
  const { data: carousels = [] } = useQuery({
    queryKey: ['carousels-for-campaign', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const { data } = await supabase
        .from('carousels')
        .select('id, title, status, created_at, platform')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return (data || []).map(c => ({
        ...c,
        selected_channels: c.platform ? [c.platform] : [],
      })) as ContentWithChannels[];
    },
    enabled: open && !!currentOrganization?.id,
  });

  const getContentList = (): ContentWithChannels[] => {
    switch (activeTab) {
      case 'multichannel': return multichannelContents;
      case 'script': return scripts;
      case 'carousel': return carousels;
      default: return [];
    }
  };

  // Check if content channels match any of the campaign's target channels
  const hasMatchingChannels = (content: ContentWithChannels) => {
    if (!targetChannels.length) return true;
    const contentChannels = content.selected_channels || [];
    return contentChannels.some(ch => 
      targetChannels.some(tc => tc.toLowerCase() === ch.toLowerCase())
    );
  };

  const filteredContents = useMemo(() => {
    let list = getContentList().filter(content => 
      content.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (showMatchingOnly && targetChannels.length > 0) {
      list = list.filter(hasMatchingChannels);
    }
    
    // Sort matching contents first
    return list.sort((a, b) => {
      const aMatches = hasMatchingChannels(a);
      const bMatches = hasMatchingChannels(b);
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return 0;
    });
  }, [getContentList(), searchQuery, showMatchingOnly, targetChannels]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleLink = async () => {
    if (selectedIds.length === 0) return;
    
    setIsLinking(true);
    try {
      for (const contentId of selectedIds) {
        await linkContent?.({
          content_type: activeTab,
          content_id: contentId,
          planned_publish_date: plannedDate || undefined,
        });
      }
      setSelectedIds([]);
      setPlannedDate('');
      setSearchQuery('');
      onOpenChange(false);
    } finally {
      setIsLinking(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as CampaignContentType);
    setSelectedIds([]);
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Liên kết nội dung</DialogTitle>
          <DialogDescription>
            Chọn nội dung để liên kết với chiến dịch
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="multichannel" className="gap-2">
              <Layers className="h-4 w-4" />
              Multichannel
            </TabsTrigger>
            <TabsTrigger value="script" className="gap-2">
              <Video className="h-4 w-4" />
              Scripts
            </TabsTrigger>
            <TabsTrigger value="carousel" className="gap-2">
              <Images className="h-4 w-4" />
              Carousels
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {targetChannels.length > 0 && (
              <div className="flex items-center gap-2">
                <Switch
                  id="show-matching"
                  checked={showMatchingOnly}
                  onCheckedChange={setShowMatchingOnly}
                />
                <Label htmlFor="show-matching" className="text-sm cursor-pointer">
                  <Sparkles className="h-3.5 w-3.5 inline mr-1" />
                  Phù hợp
                </Label>
              </div>
            )}
          </div>

          <div className="mt-4 flex-1 overflow-y-auto min-h-0 border rounded-lg">
            {filteredContents.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Không có nội dung nào
              </div>
            ) : (
              <div className="divide-y">
                {filteredContents.map((content) => {
                  const isSelected = selectedIds.includes(content.id);
                  const isMatching = hasMatchingChannels(content);
                  const contentChannels = content.selected_channels || [];
                  
                  return (
                    <div
                      key={content.id}
                      onClick={() => toggleSelect(content.id)}
                      className={cn(
                        "p-3 cursor-pointer transition-colors flex items-center gap-3",
                        isSelected ? "bg-primary/10" : "hover:bg-muted/50",
                        isMatching && targetChannels.length > 0 && !isSelected && "bg-green-500/5"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center shrink-0",
                        isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{content.title || 'Không có tiêu đề'}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(content.created_at), 'dd/MM/yyyy', { locale: vi })}
                            {content.status && ` • ${content.status}`}
                          </span>
                          {contentChannels.slice(0, 3).map(ch => (
                            <Badge 
                              key={ch} 
                              variant={targetChannels.some(tc => tc.toLowerCase() === ch.toLowerCase()) ? "default" : "outline"}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {ch}
                            </Badge>
                          ))}
                          {contentChannels.length > 3 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              +{contentChannels.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50">
              <p className="text-sm mb-2">Đã chọn {selectedIds.length} nội dung</p>
              <div className="flex items-center gap-2">
                <Label htmlFor="planned_date" className="text-sm shrink-0">Ngày dự kiến:</Label>
                <Input
                  id="planned_date"
                  type="date"
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          )}
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button 
            onClick={handleLink} 
            disabled={selectedIds.length === 0 || isLinking}
          >
            {isLinking ? 'Đang liên kết...' : `Liên kết (${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
