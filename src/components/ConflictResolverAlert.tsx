import { AlertTriangle, Lock, ShieldX, ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface ConflictItem {
  term: string;
  reason?: string;
}

interface ConflictResolverAlertProps {
  conflicts: ConflictItem[];
  industryName: string;
  countryName?: string;
  className?: string;
}

/**
 * Displays conflicts between Brand Voice and Industry Memory
 * NO OVERRIDE ALLOWED - Industry rules are immutable
 */
export function ConflictResolverAlert({
  conflicts,
  industryName,
  countryName = 'Việt Nam',
  className,
}: ConflictResolverAlertProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (conflicts.length === 0) return null;

  return (
    <Alert variant="destructive" className={`border-destructive/50 bg-destructive/10 ${className}`}>
      <ShieldX className="h-5 w-5" />
      <AlertTitle className="flex items-center gap-2 text-sm font-semibold">
        <span>Bị chặn bởi Industry Rule</span>
        <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
          {industryName} – {countryName}
        </Badge>
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {conflicts.slice(0, showDetails ? conflicts.length : 3).map((conflict, index) => (
            <Badge 
              key={index} 
              variant="secondary" 
              className="bg-destructive/20 text-destructive border-destructive/30 text-xs"
            >
              <Lock className="h-3 w-3 mr-1" />
              {conflict.term}
            </Badge>
          ))}
          {!showDetails && conflicts.length > 3 && (
            <Badge variant="outline" className="text-xs border-destructive/30 text-destructive">
              +{conflicts.length - 3} từ khác
            </Badge>
          )}
        </div>

        {showDetails && conflicts.length > 0 && (
          <div className="space-y-2 text-xs bg-background/50 rounded-lg p-3 border border-destructive/20">
            <p className="font-medium text-destructive">Lý do từ chối:</p>
            <ul className="space-y-1 list-disc list-inside text-muted-foreground">
              {conflicts.map((conflict, index) => (
                <li key={index}>
                  <span className="font-medium text-foreground">"{conflict.term}"</span>
                  {conflict.reason && <span> – {conflict.reason}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
          >
            {showDetails ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 mr-1" />
                Ẩn chi tiết
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5 mr-1" />
                Xem lý do
              </>
            )}
          </Button>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Không thể override quy tắc này</span>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
