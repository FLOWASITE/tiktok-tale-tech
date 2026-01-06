import { format, parseISO } from 'date-fns';
import { Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdCopyPerformance, formatNumber, formatCurrency, formatPercent } from '@/types/adCopyPerformance';
import { AdCopyVariation } from '@/types/adCopy';

interface PerformanceTableProps {
  data: AdCopyPerformance[];
  variations?: AdCopyVariation[];
  onDelete?: (id: string) => void;
}

export function PerformanceTable({ data, variations = [], onDelete }: PerformanceTableProps) {
  const getVariationLabel = (variationId: string | null) => {
    if (!variationId) return 'Tất cả';
    const variation = variations.find(v => v.id === variationId);
    return variation?.variation_label || 'N/A';
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lịch sử Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Chưa có dữ liệu performance được ghi nhận
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lịch sử Performance</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Ngày</TableHead>
                <TableHead>Variation</TableHead>
                <TableHead className="text-right">Impr.</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Conv.</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {format(parseISO(record.logged_at), 'dd/MM/yy')}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {getVariationLabel(record.variation_id)}
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(record.impressions)}</TableCell>
                  <TableCell className="text-right">{formatNumber(record.clicks)}</TableCell>
                  <TableCell className="text-right">{formatPercent(Number(record.ctr))}</TableCell>
                  <TableCell className="text-right">{formatNumber(record.conversions)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(record.spend))}</TableCell>
                  <TableCell className="text-right">
                    {Number(record.roas).toFixed(2)}x
                  </TableCell>
                  <TableCell>
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(record.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
