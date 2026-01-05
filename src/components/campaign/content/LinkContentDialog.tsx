import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Layers, Video, Images, Search, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useCampaignDetail } from '@/hooks/useCampaigns';
import { cn } from '@/lib/utils';
import { CampaignContentType } from '@/types/campaign';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface LinkContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

export function LinkContentDialog({ open, onOpenChange, campaignId }: LinkContentDialogProps) {
  const { currentOrganization } = useOrganizationContext();
  const { linkContent } = useCampaignDetail(campaignId);
  
  const [activeTab, setActiveTab] = useState<CampaignContentType>('multichannel');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [plannedDate, setPlannedDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  // Fetch multichannel contents
  const { data: multichannelContents = [] } = useQuery({
    queryKey: ['multichannel-contents', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const { data } = await supabase
        .from('multi_channel_contents')
        .select('id, title, status, created_at')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: open && !!currentOrganization?.id,
  });

  // Fetch scripts
  const { data: scripts = [] } = useQuery({
    queryKey: ['scripts', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const { data } = await supabase
        .from('scripts')
        .select('id, title, status, created_at')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: open && !!currentOrganization?.id,
  });

  // Fetch carousels
  const { data: carousels = [] } = useQuery({
    queryKey: ['carousels', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const { data } = await supabase
        .from('carousels')
        .select('id, title, status, created_at')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: open && !!currentOrganization?.id,
  });

  const getContentList = () => {
    switch (activeTab) {
      case 'multichannel': return multichannelContents;
      case 'script': return scripts;
      case 'carousel': return carousels;
      default: return [];
    }
  };

  const filteredContents = getContentList().filter(content => 
    content.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
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
                  return (
                    <div
                      key={content.id}
                      onClick={() => toggleSelect(content.id)}
                      className={cn(
                        "p-3 cursor-pointer transition-colors flex items-center gap-3",
                        isSelected ? "bg-primary/10" : "hover:bg-muted/50"
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
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(content.created_at), 'dd/MM/yyyy', { locale: vi })}
                          {content.status && ` • ${content.status}`}
                        </p>
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
