import { supabase } from "@/integrations/supabase/client";

// ============================================
// Carousel Style Presets — Design Token System
// Query from DB with 5-minute in-memory cache
// ============================================

export interface CarouselStylePreset {
  id: string;
  preset_key: string;
  display_name: string;
  tokens: {
    colors: {
      background: Record<string, string>;
      text: Record<string, string>;
      accent: string;
      [key: string]: unknown;
    };
    typography: {
      fontFamily: Record<string, string>;
      fontWeight: Record<string, number>;
      fontSize: Record<string, string>;
    };
    layout: {
      padding: string;
      borderRadius: string;
      negativeSpaceRatio: number;
      alignment: string;
      gridType?: string;
      splitRatio?: string;
    };
    effects: Record<string, string>;
    safeZone: {
      top: string;
      bottom: string;
      left: string;
      right: string;
    };
  };
  overlay_config: Record<string, OverlayRoleConfig>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OverlayRoleConfig {
  position?: string;
  fontWeight?: number;
  fontSize?: string;
  textAlign?: string;
  maxWidth?: string;
  textTransform?: string;
  background?: string;
  textColor?: string;
  fontFamily?: string;
  skipOverlay?: boolean;
}

// ---- In-memory cache ----

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const presetCache = new Map<string, CacheEntry<CarouselStylePreset>>();
let allPresetsCache: CacheEntry<CarouselStylePreset[]> | null = null;

function isCacheFresh<T>(entry: CacheEntry<T> | null | undefined): entry is CacheEntry<T> {
  return !!entry && Date.now() - entry.timestamp < CACHE_TTL;
}

// ---- Public API ----

export async function getStylePreset(presetKey: string): Promise<CarouselStylePreset | null> {
  const cached = presetCache.get(presetKey);
  if (isCacheFresh(cached)) {
    return cached.data;
  }

  const { data, error } = await supabase
    .from("carousel_style_presets" as any)
    .select("*")
    .eq("preset_key", presetKey)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    console.warn(`[CarouselPresets] Failed to fetch preset "${presetKey}":`, error?.message);
    return null;
  }

  const preset = data as unknown as CarouselStylePreset;
  presetCache.set(presetKey, { data: preset, timestamp: Date.now() });
  return preset;
}

export async function getAllStylePresets(): Promise<CarouselStylePreset[]> {
  if (isCacheFresh(allPresetsCache)) {
    return allPresetsCache.data;
  }

  const { data, error } = await supabase
    .from("carousel_style_presets" as any)
    .select("*")
    .eq("is_active", true)
    .order("preset_key");

  if (error || !data) {
    console.warn("[CarouselPresets] Failed to fetch all presets:", error?.message);
    return [];
  }

  const presets = data as unknown as CarouselStylePreset[];

  // Populate individual cache too
  for (const preset of presets) {
    presetCache.set(preset.preset_key, { data: preset, timestamp: Date.now() });
  }

  allPresetsCache = { data: presets, timestamp: Date.now() };
  return presets;
}

export function clearPresetCache(): void {
  presetCache.clear();
  allPresetsCache = null;
}
