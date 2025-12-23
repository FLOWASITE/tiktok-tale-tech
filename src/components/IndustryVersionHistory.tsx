import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { History, Clock, User, Plus, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface VersionEntry {
  id: string;
  version: string;
  compliance_rules?: { rule: string }[];
  forbidden_terms?: string[];
  claim_restrictions?: { claim: string }[];
  change_notes?: string | null;
  created_at: string;
}

interface IndustryVersionHistoryProps {
  versions: VersionEntry[];
  currentVersion?: string;
  industryName?: string;
  isLoading?: boolean;
  className?: string;
  maxHeight?: string;
}

function VersionItem({ 
  version, 
  isCurrent, 
  previousVersion 
}: { 
  version: VersionEntry; 
  isCurrent: boolean; 
  previousVersion?: VersionEntry;
}) {
  const [expanded, setExpanded] = useState(false);

  // Calculate changes from previous version
  const newRules = version.compliance_rules?.length || 0;
  const prevRules = previousVersion?.compliance_rules?.length || 0;
  const rulesAdded = Math.max(0, newRules - prevRules);
  const rulesRemoved = Math.max(0, prevRules - newRules);

  const newTerms = version.forbidden_terms?.length || 0;
  const prevTerms = previousVersion?.forbidden_terms?.length || 0;
  const termsAdded = Math.max(0, newTerms - prevTerms);

  const hasChanges = rulesAdded > 0 || rulesRemoved > 0 || termsAdded > 0;

  return (
    <div className={cn(
      'relative p-3 rounded-lg border transition-all',
      isCurrent 
        ? 'bg-emerald-500/10 border-emerald-500/30' 
        : 'bg-muted/30 border-border/50 hover:bg-muted/50'
    )}>
      {/* Timeline dot */}
      <div className={cn(
        'absolute -left-[21px] top-4 w-3 h-3 rounded-full border-2 border-background',
        isCurrent ? 'bg-emerald-500' : 'bg-muted-foreground/50'
      )} />

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">v{version.version}</span>
            {isCurrent && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                Current
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <time>
              {format(new Date(version.created_at), "dd/MM/yyyy", { locale: vi })}
            </time>
          </div>

          {/* Changes summary */}
          {hasChanges && !previousVersion && (
            <p className="text-xs text-muted-foreground mt-2 italic">Initial version</p>
          )}
          
          {hasChanges && previousVersion && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {rulesAdded > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-500/30">
                  <Plus className="w-2.5 h-2.5 mr-0.5" />
                  {rulesAdded} quy tắc mới
                </Badge>
              )}
              {rulesRemoved > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive/30">
                  <Minus className="w-2.5 h-2.5 mr-0.5" />
                  {rulesRemoved} quy tắc loại bỏ
                </Badge>
              )}
              {termsAdded > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-500/30">
                  <Plus className="w-2.5 h-2.5 mr-0.5" />
                  {termsAdded} từ cấm mới
                </Badge>
              )}
            </div>
          )}

          {/* Change notes */}
          {version.change_notes && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              "{version.change_notes}"
            </p>
          )}

          {/* Expandable details */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-border/50 space-y-2 text-xs">
              {version.compliance_rules && version.compliance_rules.length > 0 && (
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Quy tắc tuân thủ:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                    {version.compliance_rules.slice(0, 5).map((r, i) => (
                      <li key={i} className="truncate">{r.rule}</li>
                    ))}
                    {version.compliance_rules.length > 5 && (
                      <li className="text-muted-foreground/70">
                        +{version.compliance_rules.length - 5} quy tắc khác
                      </li>
                    )}
                  </ul>
                </div>
              )}
              {version.forbidden_terms && version.forbidden_terms.length > 0 && (
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Từ cấm ngành:</p>
                  <div className="flex flex-wrap gap-1">
                    {version.forbidden_terms.slice(0, 8).map((term, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] px-1 py-0">
                        {term}
                      </Badge>
                    ))}
                    {version.forbidden_terms.length > 8 && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        +{version.forbidden_terms.length - 8}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 shrink-0"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function IndustryVersionHistory({
  versions,
  currentVersion,
  industryName,
  isLoading = false,
  className,
  maxHeight = '300px',
}: IndustryVersionHistoryProps) {
  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <History className="w-4 h-4" />
          Industry Memory History
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 rounded-lg border">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className={cn('', className)}>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
          <History className="w-4 h-4" />
          Industry Memory History
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center border rounded-lg bg-muted/30">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
            <History className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">Chưa có lịch sử version</p>
        </div>
      </div>
    );
  }

  // Sort versions by date descending
  const sortedVersions = [...versions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className={cn('', className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
        <History className="w-4 h-4" />
        Industry Memory History
        {industryName && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {industryName}
          </Badge>
        )}
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {versions.length} versions
        </Badge>
      </div>

      <ScrollArea style={{ maxHeight }} className="pr-2">
        <div className="relative pl-5 border-l-2 border-muted space-y-3">
          {sortedVersions.map((version, index) => (
            <VersionItem
              key={version.id}
              version={version}
              isCurrent={version.version === currentVersion}
              previousVersion={sortedVersions[index + 1]}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
