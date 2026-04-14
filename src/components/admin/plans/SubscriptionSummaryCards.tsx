import { Card, CardContent } from "@/components/ui/card";
import { Users, CheckCircle, XCircle, CreditCard, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryStats {
  total: number;
  active: number;
  cancelledExpired: number;
  paid: number;
  paidRatio: string;
  expiringSoon: number;
}

interface SubscriptionSummaryCardsProps {
  stats: SummaryStats;
  activeFilter: string;
  onFilter: (status: string) => void;
}

const cards = [
  { key: "all", icon: Users, label: "Tổng cộng", stat: "total" as const, color: "bg-blue-100 dark:bg-blue-900/30", iconColor: "text-blue-600 dark:text-blue-400" },
  { key: "active", icon: CheckCircle, label: "Đang hoạt động", stat: "active" as const, color: "bg-green-100 dark:bg-green-900/30", iconColor: "text-green-600 dark:text-green-400" },
  { key: "expiring_soon", icon: AlertTriangle, label: "Sắp hết hạn", stat: "expiringSoon" as const, color: "bg-yellow-100 dark:bg-yellow-900/30", iconColor: "text-yellow-600 dark:text-yellow-400" },
  { key: "cancelled", icon: XCircle, label: "Đã hủy / Hết hạn", stat: "cancelledExpired" as const, color: "bg-red-100 dark:bg-red-900/30", iconColor: "text-red-600 dark:text-red-400" },
] as const;

export default function SubscriptionSummaryCards({ stats, activeFilter, onFilter }: SubscriptionSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        const isActive = activeFilter === c.key;
        return (
          <Card
            key={c.key}
            className={cn(
              "border-border/50 cursor-pointer transition-all hover:shadow-md",
              isActive && "ring-2 ring-primary ring-offset-1"
            )}
            onClick={() => onFilter(isActive ? "all" : c.key)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", c.color)}>
                <Icon className={cn("h-5 w-5", c.iconColor)} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats[c.stat]}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
      <Card className="border-border/50">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.paidRatio}%</p>
            <p className="text-xs text-muted-foreground">Trả phí ({stats.paid})</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
