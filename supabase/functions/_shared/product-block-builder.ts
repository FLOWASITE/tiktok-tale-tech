// ============================================
// Product Consistency — shared block builder
// Used by generate-video, generate-video-prompt, generate-script,
// generate-multichannel, generate-carousel*.
// ============================================

export type ProductLabel = 'front' | 'back' | 'side' | 'in-use' | 'packaging';

export interface ProductRefImage {
  url: string;
  label: ProductLabel | string;
}

export interface ProductAppearance {
  color?: string;
  material?: string;
  size?: string;
  distinctive_features?: string;
}

export interface ProductRow {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  image_url?: string | null;
  appearance?: ProductAppearance | null;
  reference_images?: ProductRefImage[] | null;
  unique_selling_points?: string[] | null;
}

/**
 * Build English product block(s) for video / image prompts.
 * Returns "" when no products.
 */
export function buildProductBlockEN(products: ProductRow[]): string {
  if (!products || products.length === 0) return '';
  const blocks: string[] = [];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const role = i === 0 ? 'MAIN PRODUCT' : `SUPPORTING PRODUCT ${i}`;
    const app = (p.appearance || {}) as ProductAppearance;
    const traits: string[] = [];
    if (app.color) traits.push(`color ${app.color}`);
    if (app.material) traits.push(`material ${app.material}`);
    if (app.size) traits.push(`size ${app.size}`);
    if (p.category) traits.push(`category: ${p.category}`);

    let block = `[${role} — "${p.name}"]`;
    if (traits.length) block += `\nAppearance: ${traits.join(', ')}.`;
    if (app.distinctive_features) block += `\nDistinctive: ${app.distinctive_features}.`;
    if (p.description) block += `\nDescription: ${p.description.slice(0, 200)}`;
    const usp = (p.unique_selling_points || []).filter(Boolean).slice(0, 3);
    if (usp.length) block += `\nKey USP: ${usp.join(' | ')}.`;
    block += `\nIMPORTANT: Render "${p.name}" with the EXACT packaging, label, color, and shape shown in the reference photo. Do NOT alter the brand mark, logo, or label text.`;
    blocks.push(block);
  }
  if (products.length > 1) {
    blocks.push(`[PRODUCT DISTINCTION] There are ${products.length} distinct products. Never merge or swap their packaging, colors, or labels.`);
  }
  return blocks.join('\n\n');
}

/**
 * Vietnamese variant for generate-script (script writer reads native).
 */
export function buildProductBlockVI(products: ProductRow[]): string {
  if (!products || products.length === 0) return '';
  const blocks: string[] = [];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const role = i === 0 ? 'SẢN PHẨM CHÍNH' : `SẢN PHẨM PHỤ ${i}`;
    const app = (p.appearance || {}) as ProductAppearance;
    const traits: string[] = [];
    if (app.color) traits.push(`màu ${app.color}`);
    if (app.material) traits.push(`chất liệu ${app.material}`);
    if (app.size) traits.push(`kích thước ${app.size}`);
    if (p.category) traits.push(`loại: ${p.category}`);

    let block = `[${role} — "${p.name}"]`;
    if (traits.length) block += `\nNgoại hình: ${traits.join(', ')}.`;
    if (app.distinctive_features) block += `\nĐặc điểm: ${app.distinctive_features}.`;
    if (p.description) block += `\nMô tả: ${p.description.slice(0, 200)}`;
    const usp = (p.unique_selling_points || []).filter(Boolean).slice(0, 3);
    if (usp.length) block += `\nUSP: ${usp.join(' | ')}.`;
    block += `\nQUAN TRỌNG: Mọi cảnh xuất hiện sản phẩm phải nhắc đúng tên "${p.name}" và mô tả đúng bao bì/màu sắc/nhãn.`;
    blocks.push(block);
  }
  if (products.length > 1) {
    blocks.push(`[PHÂN BIỆT SẢN PHẨM] Có ${products.length} sản phẩm khác nhau — không trộn lẫn bao bì, màu sắc hay nhãn giữa các sản phẩm.`);
  }
  return blocks.join('\n\n');
}

/**
 * Smart-pick a reference image for a given scene/slide context.
 * Returns the URL of the best matching ref image, or null.
 */
export function pickProductRefImage(p: ProductRow, sceneText?: string): string | null {
  const refs = Array.isArray(p.reference_images) ? p.reference_images : [];
  if (refs.length === 0) return p.image_url || null;
  const ctx = (sceneText || '').toLowerCase();

  const matchLabel = (): ProductLabel => {
    if (/(in[- ]?use|using|demo|apply|hand|holding|lifestyle|đang dùng|sử dụng|cầm|thoa|bôi|massage)/i.test(ctx)) return 'in-use';
    if (/(packag|box|unbox|hộp|bao bì|đóng gói)/i.test(ctx)) return 'packaging';
    if (/(back|behind|nhãn sau|mặt sau)/i.test(ctx)) return 'back';
    if (/(side|profile|nghiêng|từ bên)/i.test(ctx)) return 'side';
    return 'front';
  };

  const preferred = matchLabel();
  const picked = refs.find(r => r.label === preferred) || refs[0];
  return picked?.url || p.image_url || null;
}

/**
 * Fetch products by IDs using a Supabase service client. Caller passes the client.
 */
export async function fetchProductRows(
  supabase: any,
  productIds: string[],
): Promise<ProductRow[]> {
  if (!productIds || productIds.length === 0) return [];
  const { data, error } = await supabase
    .from('brand_products')
    .select('id, name, description, category, image_url, appearance, reference_images, unique_selling_points')
    .in('id', productIds);
  if (error) {
    console.warn('[product-block-builder] fetch error', error);
    return [];
  }
  // Preserve input order (primary first)
  const sorted = productIds
    .map(id => (data || []).find((p: any) => p.id === id))
    .filter(Boolean) as ProductRow[];
  return sorted;
}
