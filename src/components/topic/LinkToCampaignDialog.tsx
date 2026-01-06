import { useState } from 'react';
import { Target, Link, Unlink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CampaignSelector } from '@/components/campaign/CampaignSelector';
import { useCampaigns } from '@/hooks/useCampaigns';

interface LinkToCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId: string;
  topicTitle: string;
  currentCampaignId?: string | null;
  onLink: (campaignId: string | null) => Promise<void>;
}

export function LinkToCampaignDialog({
  open,
  onOpenChange,
  topicId,
  topicTitle,
  currentCampaignId,
  onLink,
}: LinkToCampaignDialogProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | undefined>(
    currentCampaignId || undefined
  );
  const [isLoading, setIsLoading] = useState(false);
  const { campaigns } = useCampaigns();

  const selectedCampaign = campaigns?.find(c => c.id === selectedCampaignId);

  const handleLink = async () => {
    setIsLoading(true);
    try {
      await onLink(selectedCampaignId || null);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlink = async () => {
    setIsLoading(true);
    try {
      await onLink(null);
      setSelectedCampaignId(undefined);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Liên kết với Chiến dịch
          </DialogTitle>
          <DialogDescription>
            Liên kết topic "{topicTitle}" với một chiến dịch để quản lý nội dung tốt hơn.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <CampaignSelector
            value={selectedCampaignId}
            onValueChange={setSelectedCampaignId}
            placeholder="Chọn chiến dịch"
            showActiveOnly
            className="w-full"
          />

          {selectedCampaign && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{selectedCampaign.name}</span>
              </div>
              {selectedCampaign.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {selectedCampaign.description}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {currentCampaignId && (
            <Button
              variant="outline"
              onClick={handleUnlink}
              disabled={isLoading}
              className="text-destructive hover:text-destructive"
            >
              <Unlink className="h-4 w-4 mr-2" />
              Bỏ liên kết
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Hủy
          </Button>
          <Button onClick={handleLink} disabled={isLoading || !selectedCampaignId}>
            <Link className="h-4 w-4 mr-2" />
            {isLoading ? 'Đang lưu...' : 'Liên kết'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
