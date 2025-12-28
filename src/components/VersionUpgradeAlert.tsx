import { ArrowUp, ChevronDown, ChevronUp, Plus, Minus, AlertCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface VersionChange {
  type: 'added' | 'removed' | 'modified';
  category: 'compliance_rule' | 'forbidden_term' | 'claim_restriction';
  description: string;
}

interface VersionUpgradeAlertProps {
  fromVersion: string;
  toVersion: string;
  industryName: string;
  changes?: VersionChange[];
  onDismiss?: () => void;
  className?: string;
}

/**
 * Alert shown when content is edited and Industry Memory has been upgraded
 * Displays changes between versions
 */
export function VersionUpgradeAlert({
  fromVersion,
  toVersion,
  industryName,
  changes = [],
  onDismiss,
  className,
}: VersionUpgradeAlertProps) {
  const [showDetails, setShowDetails] = useState(false);

  const addedChanges = changes.filter(c => c.type === 'added');
  const removedChanges = changes.filter(c => c.type === 'removed');

  return (
    <Alert className={`border-blue-500/50 bg-blue-500/10 ${className}`}>
      <ArrowUp className="h-5 w-5 text-blue-500" />
      <AlertTitle className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
        <span>Industry Rules đã nâng cấp</span>
        <Badge 
          variant="outline" 
          className="text-[10px] border-blue-500/30 text-blue-600 dark:text-blue-400"
        >
          {industryName}
        </Badge>
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="text-xs">
            v{fromVersion}
          </Badge>
          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400">
            v{toVersion}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground">
          Nội dung đã được cập nhật để tuân thủ quy tắc ngành mới nhất.
        </p>

        {changes.length > 0 && (
          <>
            {/* Summary badges */}
            <div className="flex flex-wrap gap-1.5">
              {addedChanges.length > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-emerald-600 border-emerald-500/30">
                  <Plus className="w-2.5 h-2.5 mr-0.5" />
                  {addedChanges.length} thay đổi mới
                </Badge>
              )}
              {removedChanges.length > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-amber-600 border-amber-500/30">
                  <Minus className="w-2.5 h-2.5 mr-0.5" />
                  {removedChanges.length} quy tắc đã loại bỏ
                </Badge>
              )}
            </div>

            {/* Expandable details */}
            {showDetails && (
              <div className="space-y-2 text-xs bg-background/50 rounded-lg p-3 border border-blue-500/20">
                {addedChanges.length > 0 && (
                  <div>
                    <p className="font-medium text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                      <Plus className="w-3 h-3" />
                      Thay đổi mới
                    </p>
                    <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                      {addedChanges.map((change, i) => (
                        <li key={i}>{change.description}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {removedChanges.length > 0 && (
                  <div>
                    <p className="font-medium text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                      <Minus className="w-3 h-3" />
                      Đã loại bỏ
                    </p>
                    <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                      {removedChanges.map((change, i) => (
                        <li key={i}>{change.description}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="h-7 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-500/10 px-2"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5 mr-1" />
                  Ẩn chi tiết
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5 mr-1" />
                  Xem chi tiết thay đổi
                </>
              )}
            </Button>
          </>
        )}

        {onDismiss && (
          <div className="flex justify-end pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onDismiss}
              className="h-7 text-xs"
            >
              Đã hiểu
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Compact badge for showing version outdated warning in viewers
 */
export function VersionOutdatedBadge({
  currentVersion,
  latestVersion,
  onUpgrade,
  className,
}: {
  currentVersion: string;
  latestVersion: string;
  onUpgrade?: () => void;
  className?: string;
}) {
  if (currentVersion === latestVersion) return null;

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <Badge 
        variant="outline" 
        className="text-[10px] px-1.5 py-0.5 text-amber-600 border-amber-500/30 bg-amber-500/10"
      >
        <AlertCircle className="w-3 h-3 mr-1" />
        v{currentVersion} → v{latestVersion} available
      </Badge>
      {onUpgrade && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onUpgrade}
          className="h-5 text-[10px] px-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-500/10"
        >
          <ArrowUp className="w-3 h-3 mr-0.5" />
          Upgrade
        </Button>
      )}
    </div>
  );
}
