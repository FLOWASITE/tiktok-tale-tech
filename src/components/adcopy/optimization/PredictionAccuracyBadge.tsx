import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Target, TrendingUp, HelpCircle } from "lucide-react";

interface PredictionAccuracyBadgeProps {
  accuracy: number | null;
  validatedCount?: number;
  className?: string;
  showTooltip?: boolean;
}

export function PredictionAccuracyBadge({
  accuracy,
  validatedCount = 0,
  className,
  showTooltip = true,
}: PredictionAccuracyBadgeProps) {
  if (accuracy === null) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn("gap-1 text-muted-foreground", className)}
            >
              <HelpCircle className="h-3 w-3" />
              Chưa có dữ liệu
            </Badge>
          </TooltipTrigger>
          {showTooltip && (
            <TooltipContent>
              <p>Cần có hiệu suất thực tế để tính độ chính xác</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  }

  const getAccuracyColor = (acc: number) => {
    if (acc >= 85) return "bg-green-100 text-green-700 border-green-300";
    if (acc >= 70) return "bg-yellow-100 text-yellow-700 border-yellow-300";
    if (acc >= 50) return "bg-orange-100 text-orange-700 border-orange-300";
    return "bg-red-100 text-red-700 border-red-300";
  };

  const getAccuracyLabel = (acc: number) => {
    if (acc >= 85) return "Rất chính xác";
    if (acc >= 70) return "Khá chính xác";
    if (acc >= 50) return "Trung bình";
    return "Cần cải thiện";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline"
            className={cn("gap-1", getAccuracyColor(accuracy), className)}
          >
            <Target className="h-3 w-3" />
            {accuracy}%
          </Badge>
        </TooltipTrigger>
        {showTooltip && (
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{getAccuracyLabel(accuracy)}</p>
              <p className="text-xs text-muted-foreground">
                Dựa trên {validatedCount} predictions đã xác thực
              </p>
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

// Larger display variant for dashboards
interface PredictionAccuracyDisplayProps {
  accuracy: number | null;
  validatedCount: number;
  className?: string;
}

export function PredictionAccuracyDisplay({
  accuracy,
  validatedCount,
  className,
}: PredictionAccuracyDisplayProps) {
  if (accuracy === null) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center p-4 rounded-lg border border-dashed",
        className
      )}>
        <HelpCircle className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground text-center">
          Chưa có dữ liệu độ chính xác
        </p>
        <p className="text-xs text-muted-foreground">
          Cần nhập hiệu suất thực tế để so sánh
        </p>
      </div>
    );
  }

  const getColor = (acc: number) => {
    if (acc >= 85) return "text-green-600";
    if (acc >= 70) return "text-yellow-600";
    if (acc >= 50) return "text-orange-600";
    return "text-red-600";
  };

  const getBgColor = (acc: number) => {
    if (acc >= 85) return "bg-green-50 dark:bg-green-900/20";
    if (acc >= 70) return "bg-yellow-50 dark:bg-yellow-900/20";
    if (acc >= 50) return "bg-orange-50 dark:bg-orange-900/20";
    return "bg-red-50 dark:bg-red-900/20";
  };

  return (
    <div className={cn(
      "flex items-center gap-4 p-4 rounded-lg",
      getBgColor(accuracy),
      className
    )}>
      <div className="flex flex-col items-center">
        <Target className={cn("h-8 w-8 mb-1", getColor(accuracy))} />
        <span className={cn("text-2xl font-bold", getColor(accuracy))}>
          {accuracy}%
        </span>
      </div>
      <div className="flex-1">
        <p className="font-medium">Độ chính xác prediction</p>
        <p className="text-sm text-muted-foreground">
          Dựa trên {validatedCount} predictions đã xác thực
        </p>
        {accuracy >= 70 && (
          <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
            <TrendingUp className="h-3 w-3" />
            <span>Mô hình hoạt động tốt</span>
          </div>
        )}
      </div>
    </div>
  );
}
