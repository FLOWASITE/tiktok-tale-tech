import { useNavigate } from 'react-router-dom';
import { Building2, Check, ChevronDown, Crown, Link2, Settings2 } from 'lucide-react';
import { useCurrentBrand } from '@/contexts/BrandContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function HeaderBrandSwitcher() {
  const navigate = useNavigate();
  const { brands, currentBrand, loading, switchBrand } = useCurrentBrand();

  if (loading) {
    return <Skeleton className="h-9 w-[140px] rounded-md" />;
  }

  if (brands.length === 0) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 h-9 text-muted-foreground"
        onClick={() => navigate('/brands/new')}
      >
        <Building2 className="w-4 h-4" />
        <span className="text-sm hidden sm:inline">Tạo Brand</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="gap-2 h-9 px-2.5 pr-3 min-w-[280px] sm:min-w-[340px] justify-start border border-primary/10 bg-primary/[0.03] hover:bg-primary/[0.06] hover:border-primary/20 shadow-sm"
        >
          {currentBrand ? (
            <>
              <div className="relative">
                <Avatar className="w-7 h-7 sm:w-6 sm:h-6 rounded-md border-2" style={{ borderColor: currentBrand.primary_color || 'hsl(var(--border))' }}>
                  {currentBrand.logo_url ? (
                    <AvatarImage src={currentBrand.logo_url} alt={currentBrand.brand_name} />
                  ) : null}
                  <AvatarFallback className="rounded-md text-[10px] font-bold bg-primary/10 text-primary">
                    {currentBrand.brand_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {currentBrand.is_default && (
                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-500 flex items-center justify-center">
                    <Crown className="w-2 h-2 text-white" />
                  </div>
                )}
              </div>
              <span className="text-sm font-semibold flex-1 min-w-0 truncate text-left">
                {currentBrand.brand_name}
              </span>
            </>
          ) : (
            <>
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground hidden sm:inline">Chọn Brand</span>
            </>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-auto" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[280px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Brand hiện tại</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {brands.map((brand) => (
          <DropdownMenuItem
            key={brand.id}
            onClick={() => switchBrand(brand.id)}
            className="flex items-center gap-2.5 py-2 cursor-pointer"
          >
            <Avatar className="w-7 h-7 rounded-md border border-border shrink-0">
              {brand.logo_url ? (
                <AvatarImage src={brand.logo_url} alt={brand.brand_name} />
              ) : null}
              <AvatarFallback className="rounded-md text-[10px] font-bold bg-primary/10 text-primary">
                {brand.brand_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium truncate">{brand.brand_name}</span>
              {brand.primary_color && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: brand.primary_color }}
                  />
                  {brand.industry?.join(', ') || 'Brand'}
                </span>
              )}
            </div>
            {brand.id === currentBrand?.id && (
              <Check className="w-4 h-4 text-primary shrink-0" />
            )}
            {brand.is_default && brand.id !== currentBrand?.id && (
              <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate('/brands')}
          className="flex items-center gap-2 text-muted-foreground"
        >
          <Settings2 className="w-4 h-4" />
          <span>Quản lý Brand</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/connections')}
          className="flex items-center gap-2 text-muted-foreground"
        >
          <Link2 className="w-4 h-4" />
          <span>Kết nối kênh</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
