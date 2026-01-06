import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FlaskConical, Play, Pause, Trophy, Trash2, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStatusConfig, type ABTest } from '@/types/adCopyABTest';
import { format } from 'date-fns';

interface ABTestCardProps {
  test: ABTest;
  onView: () => void;
  onStart?: () => void;
  onPause?: () => void;
  onDelete?: () => void;
}

export function ABTestCard({ test, onView, onStart, onPause, onDelete }: ABTestCardProps) {
  const statusConfig = getStatusConfig(test.status);

  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={onView}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FlaskConical className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">{test.name}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {test.variation_ids.length} variations · {test.test_variable}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs", statusConfig.color)}>
              {statusConfig.label}
            </Badge>
            {test.winner_variation_id && (
              <Badge variant="outline" className="text-xs text-green-600">
                <Trophy className="h-3 w-3 mr-1" />
                Winner
              </Badge>
            )}
          </div>
        </div>

        {test.hypothesis && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
            {test.hypothesis}
          </p>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <div className="text-xs text-muted-foreground">
            {test.start_date ? (
              <span>Bắt đầu {format(new Date(test.start_date), 'dd/MM/yyyy')}</span>
            ) : (
              <span>Chưa bắt đầu</span>
            )}
          </div>
          
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onView}>
              <BarChart3 className="h-4 w-4" />
            </Button>
            {test.status === 'draft' && onStart && (
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onStart}>
                <Play className="h-4 w-4" />
              </Button>
            )}
            {test.status === 'running' && onPause && (
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onPause}>
                <Pause className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
