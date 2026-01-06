import { useState } from 'react';
import { Link2, Loader2, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdSyncConfig } from '@/hooks/useAdSyncConfig';
import { useMetaAdsConnection } from '@/hooks/useMetaAdsConnection';

interface ExternalAdLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adCopyId: string;
  organizationId: string;
  onSuccess?: () => void;
}

export function ExternalAdLinkDialog({
  open,
  onOpenChange,
  adCopyId,
  organizationId,
  onSuccess,
}: ExternalAdLinkDialogProps) {
  const [externalAdId, setExternalAdId] = useState('');
  const [externalAdName, setExternalAdName] = useState('');
  const [syncFrequency, setSyncFrequency] = useState<'hourly' | 'daily' | 'manual'>('daily');
  const [error, setError] = useState('');

  const { connections, isLoading: isLoadingConnections } = useMetaAdsConnection({ organizationId });
  const { createSyncConfig, isCreating } = useAdSyncConfig(adCopyId);

  const activeConnection = connections?.find(c => c.is_active);

  const handleSubmit = () => {
    if (!externalAdId) {
      setError('Vui lòng nhập Ad ID');
      return;
    }

    if (!activeConnection) {
      setError('Không tìm thấy kết nối Meta Ads');
      return;
    }

    setError('');
    createSyncConfig({
      adCopyId,
      organizationId,
      connectionId: activeConnection.id,
      externalAdId: externalAdId.trim(),
      externalAdName: externalAdName.trim() || undefined,
      syncFrequency,
    }, {
      onSuccess: () => {
        onSuccess?.();
        handleClose();
      },
      onError: (err: Error) => {
        setError(err.message);
      },
    });
  };

  const handleClose = () => {
    setExternalAdId('');
    setExternalAdName('');
    setSyncFrequency('daily');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Liên kết với Meta Ad
          </DialogTitle>
          <DialogDescription>
            Liên kết Ad Copy với một quảng cáo đang chạy trên Meta để tự động đồng bộ dữ liệu hiệu suất
          </DialogDescription>
        </DialogHeader>

        {!activeConnection && !isLoadingConnections && (
          <Alert variant="destructive">
            <AlertDescription>
              Bạn cần kết nối Meta Ads trước khi có thể liên kết quảng cáo.
            </AlertDescription>
          </Alert>
        )}

        {activeConnection && (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Đang sử dụng Ad Account: <strong>{activeConnection.ad_account_name}</strong>
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="externalAdId">Meta Ad ID *</Label>
              <Input
                id="externalAdId"
                value={externalAdId}
                onChange={(e) => setExternalAdId(e.target.value)}
                placeholder="23850000000000000"
              />
              <p className="text-xs text-muted-foreground">
                Bạn có thể tìm Ad ID trong Ads Manager hoặc URL của quảng cáo
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="externalAdName">Tên quảng cáo (tùy chọn)</Label>
              <Input
                id="externalAdName"
                value={externalAdName}
                onChange={(e) => setExternalAdName(e.target.value)}
                placeholder="VD: Summer Sale 2024"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="syncFrequency">Tần suất đồng bộ</Label>
              <Select value={syncFrequency} onValueChange={(v: any) => setSyncFrequency(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Mỗi giờ</SelectItem>
                  <SelectItem value="daily">Mỗi ngày</SelectItem>
                  <SelectItem value="manual">Thủ công</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {syncFrequency === 'hourly' && 'Dữ liệu sẽ được cập nhật mỗi giờ'}
                {syncFrequency === 'daily' && 'Dữ liệu sẽ được cập nhật mỗi ngày'}
                {syncFrequency === 'manual' && 'Bạn sẽ cần nhấn nút đồng bộ thủ công'}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Hủy
              </Button>
              <Button onClick={handleSubmit} disabled={isCreating}>
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Liên kết
              </Button>
            </div>
          </div>
        )}

        {!activeConnection && !isLoadingConnections && (
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={handleClose}>
              Đóng
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
