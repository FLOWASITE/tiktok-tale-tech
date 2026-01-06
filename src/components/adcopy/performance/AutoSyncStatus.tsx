import { useState } from 'react';
import { RefreshCw, Clock, CheckCircle, AlertCircle, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAdSyncConfig } from '@/hooks/useAdSyncConfig';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface AutoSyncStatusProps {
  adCopyId: string;
  onLinkClick?: () => void;
  onConnectClick?: () => void;
  hasMetaConnection?: boolean;
}

export function AutoSyncStatus({
  adCopyId,
  onLinkClick,
  onConnectClick,
  hasMetaConnection = false,
}: AutoSyncStatusProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const {
    syncConfig,
    isLoading,
    hasSyncConfig,
    triggerSync,
    updateSyncConfig,
    deleteSyncConfig,
    isSyncing,
    isUpdating,
    isDeleting,
  } = useAdSyncConfig(adCopyId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Đang tải...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No sync config - show connect/link options
  if (!hasSyncConfig) {
    return (
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base">Đồng bộ Meta Ads</CardTitle>
          <CardDescription>
            Liên kết với quảng cáo Meta để tự động cập nhật dữ liệu hiệu suất
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {hasMetaConnection ? (
            <Button variant="outline" onClick={onLinkClick}>
              Liên kết với Meta Ad
            </Button>
          ) : (
            <Button variant="outline" onClick={onConnectClick}>
              Kết nối Meta Ads
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = () => {
    switch (syncConfig?.sync_status) {
      case 'success':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Thành công
          </Badge>
        );
      case 'syncing':
        return (
          <Badge variant="secondary">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Đang đồng bộ
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Lỗi
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Chờ đồng bộ
          </Badge>
        );
    }
  };

  const getFrequencyLabel = () => {
    switch (syncConfig?.sync_frequency) {
      case 'hourly':
        return 'Mỗi giờ';
      case 'daily':
        return 'Mỗi ngày';
      case 'manual':
        return 'Thủ công';
      default:
        return syncConfig?.sync_frequency;
    }
  };

  const handleToggleSync = () => {
    if (syncConfig) {
      updateSyncConfig({
        id: syncConfig.id,
        syncEnabled: !syncConfig.sync_enabled,
      });
    }
  };

  const handleDelete = () => {
    if (syncConfig) {
      deleteSyncConfig(syncConfig.id, {
        onSuccess: () => setShowDeleteDialog(false),
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Đồng bộ Meta Ads
                {getStatusBadge()}
              </CardTitle>
              <CardDescription>
                Ad ID: {syncConfig?.external_ad_id}
                {syncConfig?.external_ad_name && ` • ${syncConfig.external_ad_name}`}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleToggleSync} disabled={isUpdating}>
                  {syncConfig?.sync_enabled ? 'Tắt tự động đồng bộ' : 'Bật tự động đồng bộ'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Xóa liên kết
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>Tần suất: {getFrequencyLabel()}</span>
                {syncConfig?.sync_enabled ? (
                  <Badge variant="outline" className="text-green-600">
                    Đang bật
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Đã tắt
                  </Badge>
                )}
              </div>
              {syncConfig?.last_synced_at && (
                <div className="text-muted-foreground">
                  Đồng bộ lần cuối:{' '}
                  {formatDistanceToNow(new Date(syncConfig.last_synced_at), {
                    addSuffix: true,
                    locale: vi,
                  })}
                </div>
              )}
              {syncConfig?.next_sync_at && syncConfig.sync_enabled && (
                <div className="text-muted-foreground">
                  Đồng bộ tiếp theo:{' '}
                  {formatDistanceToNow(new Date(syncConfig.next_sync_at), {
                    addSuffix: true,
                    locale: vi,
                  })}
                </div>
              )}
              {syncConfig?.last_error && (
                <div className="text-destructive text-xs mt-1">
                  Lỗi: {syncConfig.last_error}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerSync()}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Đồng bộ ngay
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa liên kết?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa liên kết với Meta Ad. Dữ liệu đã đồng bộ sẽ được giữ lại nhưng sẽ không còn tự động cập nhật.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground"
            >
              {isDeleting ? 'Đang xóa...' : 'Xóa liên kết'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
