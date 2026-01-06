import { useState } from 'react';
import { ExternalLink, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useMetaAdsConnection } from '@/hooks/useMetaAdsConnection';
import { MetaAdAccount, getAccountStatusLabel } from '@/types/metaAds';
import { formatNumber } from '@/types/adCopyPerformance';

interface MetaAdsConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId?: string;
  brandTemplateId?: string;
  onSuccess?: () => void;
}

type Step = 'credentials' | 'select_account' | 'success';

export function MetaAdsConnectDialog({
  open,
  onOpenChange,
  organizationId,
  brandTemplateId,
  onSuccess,
}: MetaAdsConnectDialogProps) {
  const [step, setStep] = useState<Step>('credentials');
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [tempConnectionId, setTempConnectionId] = useState('');
  const [error, setError] = useState('');

  const { 
    adAccounts, 
    clearAdAccounts, 
    connect, 
    isConnecting,
  } = useMetaAdsConnection({ organizationId, brandTemplateId });

  const handleCredentialsSubmit = () => {
    if (!appId || !appSecret || !accessToken) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setError('');
    connect({
      appId,
      appSecret,
      accessToken,
      organizationId,
      brandTemplateId,
    }, {
      onSuccess: (data) => {
        if (data.needsAccountSelection && data.adAccounts) {
          setTempConnectionId(data.connectionId || '');
          setStep('select_account');
        } else if (data.success) {
          setStep('success');
          onSuccess?.();
        }
      },
      onError: (err) => {
        setError(err.message);
      },
    });
  };

  const handleAccountSelect = () => {
    if (!selectedAccountId) {
      setError('Vui lòng chọn một Ad Account');
      return;
    }

    setError('');
    connect({
      action: 'select_account',
      connectionId: tempConnectionId,
      adAccountId: selectedAccountId,
    } as any, {
      onSuccess: () => {
        setStep('success');
        onSuccess?.();
      },
      onError: (err) => {
        setError(err.message);
      },
    });
  };

  const handleClose = () => {
    setStep('credentials');
    setAppId('');
    setAppSecret('');
    setAccessToken('');
    setSelectedAccountId('');
    setTempConnectionId('');
    setError('');
    clearAdAccounts();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'credentials' && 'Kết nối Meta Ads'}
            {step === 'select_account' && 'Chọn Ad Account'}
            {step === 'success' && 'Kết nối thành công'}
          </DialogTitle>
          <DialogDescription>
            {step === 'credentials' && 'Nhập thông tin xác thực từ Meta Developer để kết nối'}
            {step === 'select_account' && 'Chọn Ad Account bạn muốn sử dụng'}
            {step === 'success' && 'Meta Ads đã được kết nối thành công'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'credentials' && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription className="text-sm">
                <strong>Hướng dẫn lấy credentials:</strong>
                <ol className="list-decimal ml-4 mt-2 space-y-1">
                  <li>Truy cập <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary underline">developers.facebook.com/apps</a></li>
                  <li>Chọn hoặc tạo App mới</li>
                  <li>Lấy App ID và App Secret từ Settings → Basic</li>
                  <li>Sử dụng <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Graph API Explorer</a> để tạo Access Token với quyền ads_read</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="appId">App ID</Label>
              <Input
                id="appId"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="123456789012345"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appSecret">App Secret</Label>
              <Input
                id="appSecret"
                type="password"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                placeholder="••••••••••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token</Label>
              <Input
                id="accessToken"
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="EAA..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Hủy
              </Button>
              <Button onClick={handleCredentialsSubmit} disabled={isConnecting}>
                {isConnecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Kết nối
              </Button>
            </div>
          </div>
        )}

        {step === 'select_account' && (
          <div className="space-y-4">
            <RadioGroup
              value={selectedAccountId}
              onValueChange={setSelectedAccountId}
              className="space-y-2"
            >
              {adAccounts.map((account: MetaAdAccount) => (
                <div
                  key={account.id}
                  className="flex items-center space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedAccountId(account.id)}
                >
                  <RadioGroupItem value={account.id} id={account.id} />
                  <div className="flex-1">
                    <Label htmlFor={account.id} className="font-medium cursor-pointer">
                      {account.name}
                    </Label>
                    <div className="text-sm text-muted-foreground">
                      ID: {account.account_id} • {account.currency} • {getAccountStatusLabel(account.account_status)}
                    </div>
                    {account.amount_spent && (
                      <div className="text-sm text-muted-foreground">
                        Đã chi: {formatNumber(parseFloat(account.amount_spent))} {account.currency}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </RadioGroup>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep('credentials')}>
                Quay lại
              </Button>
              <Button onClick={handleAccountSelect} disabled={isConnecting}>
                {isConnecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Chọn Account
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <p className="text-lg font-medium">Kết nối thành công!</p>
            <p className="text-muted-foreground">
              Bạn có thể bắt đầu liên kết Ad Copy với Meta Ads để theo dõi hiệu suất tự động.
            </p>
            <Button onClick={handleClose} className="mt-4">
              Đóng
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
