// ============================================
// Character Collage Builder
// Compose 2..N character reference photos vào 1 ảnh side-by-side với label tên,
// dùng cho i2v providers chỉ nhận 1 reference image.
// Cache theo hash(sortedIds) trong bucket public `character-references/_collage/<sha8>.png`.
// ============================================

import { Image, TextLayout } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const TILE = 512;          // mỗi nhân vật ô vuông 512×512
const PAD = 16;            // padding giữa các tile
const LABEL_H = 56;        // chiều cao band tên dưới mỗi tile
const BG = 0xffffffff;     // nền trắng RGBA

async function fetchImage(url: string): Promise<Image | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const buf = new Uint8Array(await r.arrayBuffer());
    const img = await Image.decode(buf);
    // Cover-fit vào ô vuông TILE
    const ratio = img.width / img.height;
    let w: number, h: number;
    if (ratio > 1) { h = TILE; w = Math.round(TILE * ratio); }
    else           { w = TILE; h = Math.round(TILE / ratio); }
    img.resize(w, h);
    img.crop(Math.floor((w - TILE) / 2), Math.floor((h - TILE) / 2), TILE, TILE);
    return img;
  } catch (e) {
    console.warn('[character-collage] fetchImage failed:', url, e);
    return null;
  }
}

async function loadFont(): Promise<Uint8Array | null> {
  try {
    // Inter Regular qua jsdelivr CDN (cache theo Deno)
    const url = 'https://cdn.jsdelivr.net/gh/rsms/inter@v4.0/docs/font-files/Inter-Bold.ttf';
    const r = await fetch(url);
    if (!r.ok) return null;
    return new Uint8Array(await r.arrayBuffer());
  } catch {
    return null;
  }
}

let _font: Uint8Array | null | undefined;
async function getFont(): Promise<Uint8Array | null> {
  if (_font !== undefined) return _font;
  _font = await loadFont();
  return _font;
}

async function drawLabel(canvas: Image, x: number, y: number, w: number, text: string) {
  const font = await getFont();
  if (!font) return;
  try {
    const layout = new TextLayout({ maxWidth: w - 8, maxHeight: LABEL_H - 8, wrapStyle: 'word', verticalAlign: 'middle', horizontalAlign: 'middle' });
    const txtImg = Image.renderText(font, 28, text, 0xff111111, layout);
    const tx = x + Math.floor((w - txtImg.width) / 2);
    const ty = y + Math.floor((LABEL_H - txtImg.height) / 2);
    canvas.composite(txtImg, tx, ty);
  } catch (e) {
    console.warn('[character-collage] drawLabel failed:', e);
  }
}

export interface CollageInput {
  url: string;
  name: string;
}

/**
 * Build side-by-side collage. Returns PNG bytes.
 * Layout: [tile][pad][tile][pad][tile] horizontally, label band below each.
 */
export async function buildCharacterCollage(items: CollageInput[]): Promise<Uint8Array | null> {
  if (items.length < 2) return null;

  const tiles: Image[] = [];
  for (const it of items) {
    const img = await fetchImage(it.url);
    if (img) tiles.push(img);
  }
  if (tiles.length < 2) {
    console.warn('[character-collage] not enough valid images:', tiles.length);
    return null;
  }

  const n = tiles.length;
  const W = n * TILE + (n - 1) * PAD;
  const H = TILE + LABEL_H;

  const canvas = new Image(W, H);
  canvas.fill(BG);

  for (let i = 0; i < n; i++) {
    const x = i * (TILE + PAD);
    canvas.composite(tiles[i], x, 0);
    await drawLabel(canvas, x, TILE, TILE, items[i].name.slice(0, 24));
  }

  return await canvas.encode(0); // PNG, level 0 = fast
}

/** Stable 8-char hex hash of sorted character IDs for cache key. */
export async function hashIds(ids: string[]): Promise<string> {
  const key = [...ids].sort().join('|');
  const data = new TextEncoder().encode(key);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf).slice(0, 4))
    .map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Stable seed (int32 positive) derived từ sorted character IDs.
 * Cùng cast → cùng seed → consistent face across clips.
 */
export async function deriveStableSeed(ids: string[]): Promise<number> {
  const hash = await hashIds(ids);
  // Convert 8 hex chars (4 bytes) → uint32, mask về 31-bit để tránh negative
  return parseInt(hash, 16) & 0x7fffffff;
}
