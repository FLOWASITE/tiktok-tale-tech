import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, History, RotateCcw, GitCompare, Clock } from 'lucide-react';
import { useScriptVersions } from '@/hooks/useScriptVersions';
import { Script } from '@/types/script';
import { ScriptVersion } from '@/types/scriptCollaboration';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  script: Script;
  onRestore?: () => void;
}

export function VersionHistoryDialog({
  open,
  onOpenChange,
  script,
  onRestore,
}: VersionHistoryDialogProps) {
  const { versions, loading, fetchVersions, restoreVersion, compareVersions } = useScriptVersions(script.id);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<string[] | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (open) {
      fetchVersions();
    }
  }, [open, fetchVersions]);

  const handleCompare = () => {
    if (selectedVersions.length !== 2) return;
    
    const v1 = versions.find(v => v.id === selectedVersions[0]);
    const v2 = versions.find(v => v.id === selectedVersions[1]);
    
    if (v1 && v2) {
      setComparing(true);
      const changes = compareVersions(v1, v2);
      setComparisonResult(changes);
    }
  };

  const handleRestore = async (version: ScriptVersion) => {
    setRestoring(true);
    const success = await restoreVersion(version, script);
    setRestoring(false);
    
    if (success) {
      onOpenChange(false);
      onRestore?.();
    }
  };

  const toggleVersionSelection = (versionId: string) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId);
      }
      if (prev.length >= 2) {
        return [prev[1], versionId];
      }
      return [...prev, versionId];
    });
    setComparisonResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Lịch sử phiên bản
          </DialogTitle>
          <DialogDescription>
            Xem và khôi phục các phiên bản trước của kịch bản
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Chưa có phiên bản nào được lưu</p>
            <p className="text-sm mt-1">Phiên bản sẽ được tự động lưu khi bạn chỉnh sửa</p>
          </div>
        ) : (
          <>
            {/* Compare controls */}
            {selectedVersions.length === 2 && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg mb-4">
                <span className="text-sm">Đã chọn 2 phiên bản để so sánh</span>
                <Button size="sm" onClick={handleCompare}>
                  <GitCompare className="h-4 w-4 mr-1" />
                  So sánh
                </Button>
              </div>
            )}

            {/* Comparison result */}
            {comparisonResult !== null && (
              <div className="p-3 bg-accent/50 rounded-lg mb-4">
                <p className="text-sm font-medium mb-2">Thay đổi giữa 2 phiên bản:</p>
                {comparisonResult.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Không có thay đổi</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {comparisonResult.map(change => (
                      <Badge key={change} variant="outline">{change}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={`p-4 border rounded-lg transition-colors cursor-pointer ${
                      selectedVersions.includes(version.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleVersionSelection(version.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary">v{version.version}</Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(version.created_at), {
                              addSuffix: true,
                              locale: vi,
                            })}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{version.change_summary}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {version.content?.substring(0, 150)}...
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(version);
                        }}
                        disabled={restoring}
                      >
                        {restoring ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Khôi phục
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
