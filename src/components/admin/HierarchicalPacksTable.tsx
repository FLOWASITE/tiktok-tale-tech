/**
 * HierarchicalPacksTable - Display industry packs in a tree structure
 * Shows core industries with expandable sub-industries
 */

import { useState, useMemo } from 'react';
import { useIndustryTree, useIndustryStats } from '@/hooks/useIndustryHierarchy';
import { useUpdateGlobalPack } from '@/hooks/useGlobalPack';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  Globe,
  MapPin,
  Users,
  Briefcase,
  RefreshCw,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  Layers,
  FolderTree,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { IndustryPackWithChildren, IndustryGlobalPack } from '@/types/industryParkV2';

interface HierarchicalPacksTableProps {
  onSelectPack?: (packId: string) => void;
  selectedPackId?: string | null;
}

export function HierarchicalPacksTable({ onSelectPack, selectedPackId }: HierarchicalPacksTableProps) {
  const [search, setSearch] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set());

  const { data: treeData, isLoading, refetch, flatData } = useIndustryTree({ 
    activeOnly: showActiveOnly,
    languageCode: 'vi' 
  });
  const { data: stats } = useIndustryStats();
  const { mutate: updatePack } = useUpdateGlobalPack();

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!treeData) return [];
    
    if (!search) return treeData;
    
    const searchLower = search.toLowerCase();
    
    return treeData.filter(pack => {
      const matchesPack = 
        pack.industry_code.toLowerCase().includes(searchLower);
      
      // Also check children
      const matchesChildren = pack.children?.some(child => 
        child.industry_code.toLowerCase().includes(searchLower)
      );
      
      return matchesPack || matchesChildren;
    });
  }, [treeData, search]);

  const handleToggleActive = (packId: string, currentActive: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const toggleExpand = (packId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPacks(prev => {
      const next = new Set(prev);
      if (next.has(packId)) {
        next.delete(packId);
      } else {
        next.add(packId);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (!treeData) return;
    const allIds = treeData.filter(p => p.children && p.children.length > 0).map(p => p.id);
    setExpandedPacks(new Set(allIds));
  };

  const collapseAll = () => {
    setExpandedPacks(new Set());
  };

  const targetAudienceConfig: Record<string, { icon: typeof Briefcase; color: string }> = {
    B2B: { icon: Briefcase, color: 'text-blue-500 bg-blue-500/10' },
    B2C: { icon: Users, color: 'text-green-500 bg-green-500/10' },
    both: { icon: Globe, color: 'text-purple-500 bg-purple-500/10' },
  };

  const levelConfig: Record<string, { label: string; color: string }> = {
    core: { label: 'Core', color: 'bg-primary/10 text-primary' },
    sub: { label: 'Sub', color: 'bg-orange-500/10 text-orange-600' },
    niche: { label: 'Niche', color: 'bg-cyan-500/10 text-cyan-600' },
  };

  const renderPackRow = (pack: IndustryPackWithChildren | IndustryGlobalPack, isChild = false) => {
    const targetConfig = targetAudienceConfig[pack.target_audience] || targetAudienceConfig.both;
    const TargetIcon = targetConfig.icon;
    const isSelected = selectedPackId === pack.id;
    const packWithChildren = pack as IndustryPackWithChildren;
    const hasChildren = packWithChildren.children && packWithChildren.children.length > 0;
    const isExpanded = expandedPacks.has(pack.id);
    const level = levelConfig[pack.industry_level || 'core'];

    return (
      <div
        key={pack.id}
        className={`
          border-b last:border-b-0 transition-colors
          ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'}
          ${isChild ? 'ml-8 border-l-2 border-l-muted' : ''}
        `}
      >
        <div
          className="flex items-center gap-3 p-3 cursor-pointer"
          onClick={() => onSelectPack?.(pack.id)}
        >
          {/* Expand/Collapse Button */}
          <div className="w-6 flex-shrink-0">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => toggleExpand(pack.id, e)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <div className="w-6" />
            )}
          </div>

          {/* Industry Icon */}
          <div className={`p-1.5 rounded ${isChild ? 'bg-muted' : 'bg-primary/10'}`}>
            {isChild ? (
              <Building2 className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Layers className="h-4 w-4 text-primary" />
            )}
          </div>

          {/* Code & Name */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                {pack.industry_code}
              </code>
              <Badge variant="outline" className={level.color}>
                {level.label}
              </Badge>
              {hasChildren && (
                <Badge variant="secondary" className="text-xs">
                  {packWithChildren.children!.length} sub
                </Badge>
              )}
            </div>
            <p className="font-medium mt-0.5 truncate">{pack.industry_code}</p>
          </div>

          {/* Target Audience */}
          <Badge className={`flex-shrink-0 ${targetConfig.color}`}>
            <TargetIcon className="h-3 w-3 mr-1" />
            {pack.target_audience}
          </Badge>

          {/* Version */}
          <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
            <span className="text-sm">v{pack.version}</span>
          </div>

          {/* Status */}
          {pack.is_active ? (
            <Badge variant="default" className="bg-green-500/10 text-green-600 flex-shrink-0">
              <CheckCircle className="h-3 w-3 mr-1" />
              Active
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex-shrink-0">
              <XCircle className="h-3 w-3 mr-1" />
              Inactive
            </Badge>
          )}

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSelectPack?.(pack.id)}>
                <Eye className="h-4 w-4 mr-2" />
                Xem chi tiết
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleToggleActive(pack.id, pack.is_active, e as unknown as React.MouseEvent)}>
                {pack.is_active ? (
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="bg-muted/30">
            {packWithChildren.children!.map(child => renderPackRow({ ...child, children: [] } as IndustryPackWithChildren, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Industry Hierarchy
          </CardTitle>
          
          {/* Stats badges */}
          {stats && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">
                <Layers className="h-3 w-3 mr-1" />
                {stats.coreCount} Core
              </Badge>
              <Badge variant="outline">
                <Building2 className="h-3 w-3 mr-1" />
                {stats.subCount} Sub
              </Badge>
              <Badge variant="outline">
                Total: {stats.total}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showActiveOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowActiveOnly(!showActiveOnly)}
          >
            {showActiveOnly ? 'Active Only' : 'All'}
          </Button>
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !filteredData.length ? (
          <div className="text-center py-12 text-muted-foreground">
            <FolderTree className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Không tìm thấy Industry Pack nào</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredData.map(pack => renderPackRow(pack))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
