import { Building2, ChevronDown, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BrandTemplate } from '@/hooks/useBrandTemplates';

interface BrandSelectorDropdownProps {
  brand?: BrandTemplate;
  onOpen: () => void;
  className?: string;
}

export function BrandSelectorDropdown({
  brand,
  onOpen,
  className,
}: BrandSelectorDropdownProps) {
  if (!brand) {
    return (
      <Button
        variant="outline"
        onClick={onOpen}
        className={cn('gap-2 h-9 px-3', className)}
      >
        <Building2 className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Chọn Brand</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={onOpen}
      className={cn(
        'gap-2 h-9 px-2 pr-3 hover:bg-accent/50',
        className
      )}
    >
      <div className="relative">
        <Avatar className="w-6 h-6 rounded-md border border-border">
          {brand.logo_url ? (
            <AvatarImage src={brand.logo_url} alt={brand.brand_name} />
          ) : null}
          <AvatarFallback className="rounded-md bg-gradient-to-br from-primary/20 to-violet-500/20 text-primary text-xs font-bold">
            {brand.brand_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {brand.is_default && (
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-500 flex items-center justify-center">
            <Crown className="w-2 h-2 text-white" />
          </div>
        )}
      </div>
      <span className="text-sm font-medium max-w-[120px] truncate">
        {brand.brand_name}
      </span>
      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    </Button>
  );
}
