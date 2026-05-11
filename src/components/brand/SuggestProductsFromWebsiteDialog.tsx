import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Sparkles, Globe, Package, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import type { LocalProduct } from '@/components/brand/ProductCatalogEditor';

export interface ProductSuggestion {
  name: string;
  category?: string;
  description?: string;
  price_display?: string;
  image_url?: string;
  unique_selling_points?: string[];
  keywords?: string[];
  source_url?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultUrl?: string;
  existingProductNames?: string[];
  onAddProducts: (products: LocalProduct[]) => void;
}

export function SuggestProductsFromWebsiteDialog({
  open, onOpenChange, defaultUrl, existingProductNames = [], onAddProducts,
}: Props) {
  const { currentOrganization } = useOrganizationContext();
  const [url, setUrl] = useState(defaultUrl || '');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const dupSet = new Set(existingProductNames.map((n) => n.trim().toLowerCase()));

  const handleFetch = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error('Vui lòng nhập URL website');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuggestions([]);
    setSelected(new Set());
    try {
      const { data, error } = await supabase.functions.invoke('suggest-products-from-website', {
        body: { url: trimmed, max_products: 10, locale: 'vi' },
      });
      if (error) throw error;
      const list = (data?.products || []) as ProductSuggestion[];
      setSuggestions(list);
      setHasFetched(true);
      // Auto-select all non-duplicates
      const auto = new Set<number>();
      list.forEach((p, i) => {
        if (!dupSet.has(p.name.trim().toLowerCase())) auto.add(i);
      });
      setSelected(auto);
      if (data?.fallback) {
        const code = data?.errorCode;
        if (code === 'CREDITS_EXHAUSTED') {
          setErrorMsg('Hết credit AI Gateway. Vui lòng nạp thêm hoặc nhập sản phẩm thủ công.');
        } else if (code === 'RATE_LIMIT') {
          setErrorMsg('AI đang quá tải, vui lòng thử lại sau ít phút.');
        } else if (code === 'NO_CONTENT' || list.length === 0) {
          setErrorMsg('Không tìm thấy sản phẩm trên website này. Bạn có thể nhập thủ công.');
        } else {
          setErrorMsg(data?.error || 'Không gợi ý được sản phẩm.');
        }
      } else if (list.length === 0) {
        setErrorMsg('Không phát hiện sản phẩm/dịch vụ nào trên website.');
      }
    } catch (e: any) {
      console.error('[suggest-products] error:', e);
      setErrorMsg(e?.message || 'Lỗi khi gọi AI gợi ý sản phẩm.');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === suggestions.length) setSelected(new Set());
    else setSelected(new Set(suggestions.map((_, i) => i)));
  };

  const handleAdd = () => {
    const picked = [...selected].sort().map((i) => suggestions[i]).filter(Boolean);
    if (picked.length === 0) {
      toast.error('Chưa chọn sản phẩm nào');
      return;
    }
    const localProducts: LocalProduct[] = picked.map((p, idx) => ({
      id: `temp-suggest-${Date.now()}-${idx}`,
      name: p.name,
      sku: '',
      category: p.category || '',
      description: p.description || '',
      price_display: p.price_display || '',
      image_url: p.image_url || '',
      unique_selling_points: p.unique_selling_points || [],
      target_audience: '',
      pain_points_solved: [],
      benefits: [],
      keywords: p.keywords || [],
      suggested_content_angles: [],
      best_channels: [],
      is_featured: false,
      is_active: true,
    }));
    onAddProducts(localProducts);
    toast.success(`Đã thêm ${localProducts.length} sản phẩm gợi ý`);
    onOpenChange(false);
    // reset for next open
    setSuggestions([]);
    setSelected(new Set());
    setHasFetched(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Gợi ý sản phẩm từ Website
          </DialogTitle>
          <DialogDescription>
            AI sẽ đọc website của bạn và tự động trích xuất danh sách sản phẩm/dịch vụ.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-website.com"
                className="pl-9"
                disabled={loading}
              />
            </div>
            <Button onClick={handleFetch} disabled={loading || !url.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span className="ml-2">{loading ? 'Đang đọc...' : 'Gợi ý'}</span>
            </Button>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {suggestions.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Phát hiện <strong>{suggestions.length}</strong> sản phẩm. Đã chọn <strong>{selected.size}</strong>.
                </span>
                <Button variant="ghost" size="sm" onClick={toggleAll}>
                  {selected.size === suggestions.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </Button>
              </div>
              <ScrollArea className="h-[360px] pr-3 border rounded-lg">
                <div className="space-y-2 p-2">
                  {suggestions.map((p, i) => {
                    const isDup = dupSet.has(p.name.trim().toLowerCase());
                    const checked = selected.has(i);
                    return (
                      <label
                        key={i}
                        className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          checked ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggle(i)} className="mt-1" />
                        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                          {p.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <Package className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{p.name}</span>
                            {p.category && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{p.category}</Badge>
                            )}
                            {p.price_display && (
                              <span className="text-xs font-medium text-foreground">{p.price_display}</span>
                            )}
                            {isDup && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-amber-600 border-amber-400">
                                Đã có
                              </Badge>
                            )}
                          </div>
                          {p.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                          )}
                          {p.unique_selling_points && p.unique_selling_points.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {p.unique_selling_points.slice(0, 3).map((u, k) => (
                                <Badge key={k} variant="outline" className="text-[9px] h-4 px-1.5 font-normal">
                                  {u}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}

          {!loading && hasFetched && suggestions.length === 0 && !errorMsg && (
            <div className="text-center text-sm text-muted-foreground py-6">
              Không tìm thấy sản phẩm nào trên website này.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Đóng
          </Button>
          <Button onClick={handleAdd} disabled={selected.size === 0 || loading}>
            Thêm {selected.size > 0 ? `${selected.size} sản phẩm` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
