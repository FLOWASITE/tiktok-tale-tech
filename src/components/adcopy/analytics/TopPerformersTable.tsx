import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award } from 'lucide-react';
import { TopPerformer } from '@/hooks/useAdCopyAnalytics';

interface TopPerformersTableProps {
  data: TopPerformer[];
  isLoading?: boolean;
}

const PLATFORM_LABELS: Record<string, string> = {
  facebook_feed: 'FB Feed',
  facebook_stories: 'FB Stories',
  instagram_feed: 'IG Feed',
  instagram_stories: 'IG Stories',
  instagram_reels: 'IG Reels',
  tiktok: 'TikTok',
  google_search: 'Google Search',
  google_display: 'Google Display',
  zalo: 'Zalo',
  youtube: 'YouTube',
};

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />;
    default:
      return <span className="text-sm font-medium text-muted-foreground w-5 text-center">{rank}</span>;
  }
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString('vi-VN');
}

export function TopPerformersTable({ data, isLoading }: TopPerformersTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Chưa có dữ liệu performance
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Ad Copy</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead className="text-right">ROAS</TableHead>
              <TableHead className="text-right">Chi tiêu</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">Conv.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((performer, index) => (
              <TableRow key={performer.adCopyId} className="hover:bg-muted/50">
                <TableCell>{getRankIcon(index + 1)}</TableCell>
                <TableCell className="font-medium max-w-[200px] truncate" title={performer.title}>
                  {performer.title}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {PLATFORM_LABELS[performer.platform] || performer.platform}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={
                      performer.roas >= 3
                        ? 'text-green-600 font-semibold'
                        : performer.roas >= 1
                        ? 'text-yellow-600'
                        : 'text-red-500'
                    }
                  >
                    {performer.roas.toFixed(2)}x
                  </span>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(performer.spend)} ₫</TableCell>
                <TableCell className="text-right">{performer.ctr.toFixed(2)}%</TableCell>
                <TableCell className="text-right">{performer.conversions}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
