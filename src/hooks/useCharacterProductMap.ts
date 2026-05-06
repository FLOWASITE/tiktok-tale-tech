import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Session-only map: characterId → productId[]
 * Dùng riêng trong Video Studio để gán sản phẩm "thường cầm/dùng" cho từng nhân vật.
 * Không lưu DB — reset khi đóng tab.
 */
const STORAGE_KEY = 'flowa_video_character_product_map_v1';

export type CharacterProductMap = Record<string, string[]>;

function load(): CharacterProductMap {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CharacterProductMap) : {};
  } catch {
    return {};
  }
}

function save(map: CharacterProductMap) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function useCharacterProductMap() {
  const [map, setMap] = useState<CharacterProductMap>(() => load());

  useEffect(() => {
    save(map);
  }, [map]);

  const setForCharacter = useCallback((characterId: string, productIds: string[]) => {
    setMap((prev) => ({ ...prev, [characterId]: productIds }));
  }, []);

  const clearCharacter = useCallback((characterId: string) => {
    setMap((prev) => {
      const next = { ...prev };
      delete next[characterId];
      return next;
    });
  }, []);

  /** Union tất cả productIds của characters đang được chọn. */
  const unionProductIds = useCallback(
    (characterIds: string[]): string[] => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const cid of characterIds) {
        for (const pid of map[cid] ?? []) {
          if (!seen.has(pid)) {
            seen.add(pid);
            out.push(pid);
          }
        }
      }
      return out;
    },
    [map],
  );

  return useMemo(
    () => ({ map, setForCharacter, clearCharacter, unionProductIds }),
    [map, setForCharacter, clearCharacter, unionProductIds],
  );
}
