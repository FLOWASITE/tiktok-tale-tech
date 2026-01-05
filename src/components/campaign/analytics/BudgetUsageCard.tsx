import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BudgetUsageCardProps {
  budgetTotal?: number | null;
  budgetSpent?: number | null;
  currency?: string | null;
}

export function BudgetUsageCard({ budgetTotal, budgetSpent, currency = 'VND' }: BudgetUsageCardProps) {
  const total = budgetTotal ?? 0;
  const spent = budgetSpent ?? 0;
  const remaining = Math.max(0, total - spent);
  const percentage = total > 0 ? Math.min(Math.round((spent / total) * 100), 100) : 0;
  
  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)}B`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(0)}K`;
    }
    return value.toLocaleString();
  };

  const isOverBudget = spent > total && total > 0;
  const isNearLimit = percentage >= 80 && percentage < 100;

  if (!budgetTotal || budgetTotal === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4" />
            Ngân sách
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">
            Chưa thiết lập ngân sách
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="h-4 w-4" />
          Ngân sách
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Đã chi</span>
            <span className={cn(
              "font-medium",
              isOverBudget && "text-destructive",
              isNearLimit && "text-yellow-600"
            )}>
              {formatCurrency(spent)} {currency}
            </span>
          </div>
          
          <Progress 
            value={percentage} 
            className={cn(
              "h-3",
              isOverBudget && "[&>div]:bg-destructive",
              isNearLimit && "[&>div]:bg-yellow-500"
            )}
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{percentage}% sử dụng</span>
            <span>Tổng: {formatCurrency(total)} {currency}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Còn lại</p>
            <p className={cn(
              "font-bold",
              isOverBudget ? "text-destructive" : "text-green-600"
            )}>
              {isOverBudget ? '-' : ''}{formatCurrency(isOverBudget ? spent - total : remaining)}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Trạng thái</p>
            <p className={cn(
              "font-medium text-sm",
              isOverBudget && "text-destructive",
              isNearLimit && "text-yellow-600",
              !isOverBudget && !isNearLimit && "text-green-600"
            )}>
              {isOverBudget ? 'Vượt ngân sách' : isNearLimit ? 'Gần hết' : 'Bình thường'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
