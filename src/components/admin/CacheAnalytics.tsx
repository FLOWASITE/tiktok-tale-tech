import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCacheAnalytics } from "@/hooks/useCacheAnalytics";
import { useOrganization } from "@/hooks/useOrganization";
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  TrendingUp, 
  DollarSign,
  Zap,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const FUNCTION_LABELS: Record<string, string> = {
  "generate-multichannel": "Multi-Channel Content",
  "generate-sample-text": "Sample Text",
  "generate-script": "Video Script",
  "generate-carousel": "Carousel",
  "generate-brand-voice": "Brand Voice",
  "generate-brand-guideline": "Brand Guideline",
  "generate-brand-complete": "Brand Complete",
  "regenerate-channel": "Regenerate Channel",
  "ai-edit-channel": "AI Edit",
};

export default function CacheAnalytics() {
  const { currentOrganization } = useOrganization();
  const {
    stats,
    isLoading,
    refetch,
    clearCache,
    isClearing,
    cleanupExpired,
    isCleaningUp,
  } = useCacheAnalytics(currentOrganization?.id);

  const [clearTarget, setClearTarget] = useState<string | undefined>();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Entries</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEntries || 0}</div>
            <p className="text-xs text-muted-foreground">Active cache entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hits</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalHits || 0}</div>
            <p className="text-xs text-muted-foreground">Cache hits served</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hit Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.hitRate?.toFixed(1) || 0}%
            </div>
            <Progress value={stats?.hitRate || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${stats?.estimatedSavings?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">~$0.003/hit saved</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => cleanupExpired()}
          disabled={isCleaningUp}
        >
          <Clock className="h-4 w-4 mr-2" />
          {isCleaningUp ? "Cleaning..." : "Cleanup Expired"}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isClearing}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Cache
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xóa toàn bộ cache?</AlertDialogTitle>
              <AlertDialogDescription>
                Thao tác này sẽ xóa tất cả AI response cache. Các request tiếp theo sẽ
                cần gọi AI mới, có thể tốn thêm chi phí.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => clearCache({ organizationId: currentOrganization?.id })}
              >
                Xóa tất cả
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Stats by Function */}
      <Card>
        <CardHeader>
          <CardTitle>Cache by Function</CardTitle>
          <CardDescription>
            Chi tiết cache entries và hits theo từng function
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.statsByFunction && stats.statsByFunction.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Function</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead className="text-right">Entries</TableHead>
                  <TableHead className="text-right">Hits</TableHead>
                  <TableHead className="text-right">Avg Hits</TableHead>
                  <TableHead>Oldest</TableHead>
                  <TableHead>Newest</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.statsByFunction.map((stat, idx) => (
                  <TableRow key={`${stat.function_name}-${stat.cache_scope}-${idx}`}>
                    <TableCell className="font-medium">
                      {FUNCTION_LABELS[stat.function_name] || stat.function_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={stat.cache_scope === "global" ? "default" : "secondary"}>
                        {stat.cache_scope}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{stat.total_entries}</TableCell>
                    <TableCell className="text-right">{stat.total_hits}</TableCell>
                    <TableCell className="text-right">
                      {stat.avg_hit_count?.toFixed(1) || 0}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {stat.oldest_entry
                        ? format(new Date(stat.oldest_entry), "dd/MM/yyyy", { locale: vi })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {stat.newest_entry
                        ? format(new Date(stat.newest_entry), "dd/MM/yyyy", { locale: vi })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setClearTarget(stat.function_name)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Xóa cache cho {FUNCTION_LABELS[stat.function_name] || stat.function_name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Sẽ xóa {stat.total_entries} entries của function này.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => clearCache({ 
                                functionName: stat.function_name,
                                organizationId: currentOrganization?.id 
                              })}
                            >
                              Xóa
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có cache entries nào</p>
              <p className="text-sm">Cache sẽ được tạo khi sử dụng các tính năng AI</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
