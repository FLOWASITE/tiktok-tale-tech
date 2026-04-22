import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Loader2, Crown, Check, Palette } from 'lucide-react';
import { getTelegramMiniApp, Loading } from './shared';

type BrandRow = {
  id: string;
  brand_name: string;
  is_default: boolean | null;
  primary_color: string | null;
  industry: string[] | null;
  logo_url: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  activeBrandId: string | null;
  onActiveBrandChange: (brandId: string) => void;
};

export function BrandSwitcherSheet({ open, onOpenChange, orgId, activeBrandId, onActiveBrandChange }: Props) {
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabase as any;
        const { data } = await sb
          .from('brand_templates')
          .select('id, brand_name, is_default, primary_color, industry, logo_url')
          .eq('organization_id', orgId)
          .is('deleted_at', null)
          .order('is_default', { ascending: false })
          .order('brand_name', { ascending: true });
        setBrands(data ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, orgId]);

  async function switchTo(brandId: string) {
    setSwitching(brandId);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const tg = getTelegramMiniApp();
      const chatIdRaw = tg?.initDataUnsafe?.user?.id;
      if (chatIdRaw) {
        await sb.from('telegram_chat_bindings')
          .update({ active_brand_template_id: brandId })
          .eq('organization_id', orgId)
          .eq('telegram_chat_id', chatIdRaw);
      }
      onActiveBrandChange(brandId);
      tg?.HapticFeedback?.notificationOccurred?.('success');
      onOpenChange(false);
    } catch (e) {
      console.error('[brand-switcher] failed', e);
    } finally {
      setSwitching(null);
    }
  }

  const filtered = filter
    ? brands.filter((b) => b.brand_name.toLowerCase().includes(filter.toLowerCase()))
    : brands;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2 text-base">
            <Palette className="w-4 h-4" /> Chọn brand
          </DrawerTitle>
          <DrawerDescription>Brand đang chọn áp dụng cho cả bot Telegram và Mini App.</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4 overflow-y-auto space-y-3">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="🔍 Tìm brand…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          {loading ? <Loading /> : (
            <div className="space-y-2">
              {filtered.map((b) => {
                const isActive = b.id === activeBrandId;
                return (
                  <button
                    key={b.id}
                    disabled={switching !== null}
                    onClick={() => switchTo(b.id)}
                    className={`w-full text-left rounded-lg border p-3 flex items-center gap-3 transition-colors ${
                      isActive ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-accent/50'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-md flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0"
                      style={{ backgroundColor: b.primary_color || 'hsl(var(--muted))' }}
                    >
                      {b.logo_url ? (
                        <img src={b.logo_url} alt={b.brand_name} className="w-full h-full rounded-md object-cover" />
                      ) : (
                        b.brand_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm truncate">{b.brand_name}</span>
                        {b.is_default && <Crown className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </div>
                      {b.industry && b.industry.length > 0 && (
                        <div className="text-xs text-muted-foreground truncate">{b.industry.join(', ')}</div>
                      )}
                    </div>
                    {switching === b.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                    ) : isActive ? (
                      <Check className="w-5 h-5 text-primary shrink-0" />
                    ) : null}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Không khớp brand nào.</p>
              )}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
