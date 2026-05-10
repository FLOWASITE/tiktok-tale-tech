/**
 * GlobalPacksTable - v2 Admin component for managing Industry Global Packs
 */

import { useState } from 'react';
import { useGlobalPacksList, useUpdateGlobalPack } from '@/hooks/useGlobalPack';
import { useAvailableJurisdictions } from '@/hooks/useJurisdictionProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  MoreHorizontal,
  Eye,
  Settings,
  Globe,
  MapPin,
  Users,
  Briefcase,
  RefreshCw,
  CheckCircle,
  XCircle,
  Star,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface GlobalPacksTableProps {
  onSelectPack?: (packId: string) => void;
  selectedPackId?: string | null;
}

export function GlobalPacksTable({ onSelectPack, selectedPackId }: GlobalPacksTableProps) {
  const [search, setSearch] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  const { data: packs, isLoading, refetch } = useGlobalPacksList(
    { 
      search: search || undefined,
      isActive: showActiveOnly ? true : undefined,
    },
    'vi'
  );

  const { mutate: updatePack } = useUpdateGlobalPack();

  const handleToggleActive = (packId: string, currentActive: boolean) => {
    updatePack(
      { packId, updates: { is_active: !currentActive } },
      {
        onSuccess: () => {
          toast.success(currentActive ? 'Đã vô hiệu hóa' : 'Đã kích hoạt');
          refetch();
        },
        onError: () => toast.error('Lỗi khi cập nhật'),
      }
    );
  };

  const handleTogglePopular = (packId: string, currentPopular: boolean, currentOrder: number | null) => {
    const updates: Record<string, unknown> = { is_popular: !currentPopular };
    // When enabling for the first time, push to bottom of popular list
    if (!currentPopular && currentOrder == null) {
      updates.popular_sort_order = 999;
    }
    updatePack(
      { packId, updates },
      {
        onSuccess: () => {
          toast.success(currentPopular ? 'Đã bỏ khỏi Phổ biến' : 'Đã thêm vào Phổ biến');
          refetch();
        },
        onError: () => toast.error('Lỗi khi cập nhật'),
      }
    );
  };

  const handleUpdatePopularOrder = (packId: string, value: string) => {
    const parsed = value === '' ? null : Number(value);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) return;
    updatePack(
      { packId, updates: { popular_sort_order: parsed } },
      {
        onSuccess: () => refetch(),
        onError: () => toast.error('Lỗi khi cập nhật thứ tự'),
      }
    );
  };

  const targetAudienceConfig = {
    B2B: { icon: Briefcase, color: 'text-blue-500 bg-blue-500/10' },
    B2C: { icon: Users, color: 'text-green-500 bg-green-500/10' },
    both: { icon: Globe, color: 'text-purple-500 bg-purple-500/10' },
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Global Packs
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={showActiveOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowActiveOnly(!showActiveOnly)}
              className="flex-1 sm:flex-initial"
            >
              {showActiveOnly ? 'Active Only' : 'All Packs'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo code hoặc tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-6">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !packs?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Không tìm thấy Global Pack nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>Industry Code</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Profiles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5" /> Phổ biến
                  </span>
                </TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packs.map((pack) => {
                const targetConfig = targetAudienceConfig[pack.targetAudience];
                const TargetIcon = targetConfig.icon;
                const isSelected = selectedPackId === pack.id;

                return (
                  <TableRow
                    key={pack.id}
                    className={`cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`}
                    onClick={() => onSelectPack?.(pack.id)}
                  >
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                        {pack.industryCode}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{pack.name}</p>
                        {pack.isPopular && (
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" aria-label="Phổ biến" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">v{pack.version}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={targetConfig.color}>
                        <TargetIcon className="h-3 w-3 mr-1" />
                        {pack.targetAudience}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{pack.profileCount}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {pack.isActive ? (
                        <Badge variant="default" className="bg-green-500/10 text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={pack.isPopular}
                          onCheckedChange={() => handleTogglePopular(pack.id, pack.isPopular, pack.popularSortOrder)}
                          aria-label="Đánh dấu phổ biến"
                        />
                        {pack.isPopular && (
                          <Input
                            type="number"
                            min={0}
                            value={pack.popularSortOrder ?? ''}
                            onChange={(e) => handleUpdatePopularOrder(pack.id, e.target.value)}
                            placeholder="#"
                            className="h-8 w-16 text-xs"
                            title="Thứ tự hiển thị (số nhỏ lên trước)"
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onSelectPack?.(pack.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Xem chi tiết
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(pack.id, pack.isActive)}>
                            {pack.isActive ? (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                Vô hiệu hóa
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Kích hoạt
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTogglePopular(pack.id, pack.isPopular, pack.popularSortOrder)}>
                            <Star className={`h-4 w-4 mr-2 ${pack.isPopular ? 'fill-amber-500 text-amber-500' : ''}`} />
                            {pack.isPopular ? 'Bỏ khỏi Phổ biến' : 'Đánh dấu Phổ biến'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
