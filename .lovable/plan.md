
# Streaming Optimization (Pragmatic) — ✅ DONE

## Thay doi da thuc hien
1. **Backend Token Batching 80ms** (`streaming-handler.ts`): Accumulate tokens 80ms, flush khi het stream. Giam SSE events ~80%.
2. **Frontend Per-Channel State Isolation** (`useStreamingGeneration.ts`): useRef + channelUpdateSignal. Expose `getChannelText()`.
3. **StreamingChannelCard React.memo** (`StreamingChannelCard.tsx`): Wrap voi `memo()`.

---

# Nhan xet: Streaming 2.0 – Delta Streaming

## Danh gia hien trang (QUAN TRONG)

Sau khi doc ky toan bo code streaming hien tai, phat hien **van de co ban** trong de xuat:

### He thong hien tai DA la delta streaming

Backend (`streaming-handler.ts`) **da gui tung token** qua event `streaming_text`:
```text
emit({
  type: 'streaming_text',
  streamingChunk: { channel: 'facebook', text: 'token_moi', isComplete: false }
})
```

Frontend (`useStreamingGeneration.ts`) **da accumulate per-channel**:
```text
setStreamingTexts(prev => ({
  ...prev,
  [channel]: (prev[channel] || '') + text,  // chi append delta
}))
```

**Khong co luc nao gui toan bo multichannel object lap lai.** Moi event chi chua 1 token (5-20 bytes). SSE payload hien tai da la ~20-50 bytes/event, khong phai 2-8KB nhu de xuat gia dinh.

### Cac event hien co
- `streaming_text`: per-token delta (DA toi uu)
- `channel_complete`: gui full content 1 lan duy nhat khi channel xong (khong lap lai)
- `result`: gui 1 lan cuoi cung de sync

### Ket luan
De xuat JSON Patch (RFC 6902) giai quyet mot van de **khong ton tai** trong codebase hien tai. Them `fast-json-patch` + `immer` se tang complexity ma khong co loi ich do luong duoc.

---

## Nhung gi THUC SU can cai thien

Sau khi phan tich, co 3 van de thuc te:

### 1. Re-render khong can thiet (Frontend)
`setStreamingTexts()` thay doi object reference moi token → toan bo `StreamingTextGrid` re-render. Fix don gian: `React.memo` + stable channel references.

### 2. Thieu debounce (Backend)
Moi token tao 1 SSE event rieng. Voi 11 kenh, co the co 500+ events/giay. Batch 50-100ms se giam event count 80%.

### 3. StreamingChannelCard re-render tat ca kenh
Khi 1 channel co token moi, tat ca channel cards deu re-render vi `streamingTexts` object thay doi reference.

---

## Ke hoach thuc thi (Pragmatic Streaming Optimization)

### Thay doi 1: Backend Token Batching

**File**: `supabase/functions/_shared/streaming-handler.ts`

Trong `generateChannelStreaming()`, thay vi emit moi token:
- Accumulate tokens trong buffer 80ms
- Emit 1 event chua toan bo batch (van la delta, chi gom nhieu token lai)
- Giam event count tu ~500/s xuong ~12/s per channel

```text
// Truoc: emit moi token
emit({ type: 'streaming_text', streamingChunk: { channel, text: delta.content } })

// Sau: batch 80ms
tokenBuffer += delta.content;
if (Date.now() - lastEmitTime > 80) {
  emit({ type: 'streaming_text', streamingChunk: { channel, text: tokenBuffer } })
  tokenBuffer = '';
  lastEmitTime = Date.now();
}
// + flush khi stream ket thuc
```

### Thay doi 2: Frontend Per-Channel State Isolation

**File**: `src/hooks/useStreamingGeneration.ts`

Thay `Record<string, string>` bang `useRef` + per-channel update:
- Dung `useRef` cho accumulated text (khong trigger re-render)
- Dung `useState` chi cho channel dang active (chi re-render channel do)
- Expose `getChannelText(channel)` thay vi full object

```text
// Truoc:
const [streamingTexts, setStreamingTexts] = useState<Record<string, string>>({});
// Moi token → new object → all consumers re-render

// Sau:
const textsRef = useRef<Record<string, string>>({});
const [lastUpdate, setLastUpdate] = useState<{ channel: string; version: number }>({ channel: '', version: 0 });

// Trong event handler:
textsRef.current[channel] = (textsRef.current[channel] || '') + text;
setLastUpdate({ channel, version: Date.now() }); // chi channel nay re-render

// Expose:
const getChannelText = useCallback((ch: string) => textsRef.current[ch] || '', []);
```

### Thay doi 3: StreamingChannelCard React.memo

**File**: `src/components/multichannel/streaming/StreamingChannelCard.tsx`

Wrap component voi `React.memo` va chi nhan `text` cua channel do, khong nhan toan bo `streamingTexts` object.

### Thay doi 4: StreamingTextGrid Per-Channel Isolation

**File**: `src/components/multichannel/streaming/StreamingTextGrid.tsx`

Moi `StreamingChannelCard` chi subscribe vao channel cua minh thong qua `getChannelText(channel)` hoac context selector.

---

## Files thay doi

| File | Loai | Mo ta |
|------|------|-------|
| `streaming-handler.ts` | Cap nhat | Token batching 80ms |
| `useStreamingGeneration.ts` | Cap nhat | useRef + per-channel isolation |
| `StreamingChannelCard.tsx` | Cap nhat | React.memo optimization |
| `StreamingTextGrid.tsx` | Cap nhat | Per-channel text subscription |
| `.lovable/plan.md` | Cap nhat | Streaming optimization status |

## Khong lam
- **Khong them `fast-json-patch`** — khong can thiet, he thong da la delta
- **Khong them `immer`** — simple string append khong can immutable library
- **Khong tao event type moi** (`multichannel_delta`) — `streaming_text` da du
- **Khong can feature flag** — thay doi nho, backward compatible

## Ket qua du kien
- SSE events: giam 80% (token batching)
- React re-renders: giam 70% (per-channel isolation)
- Bandwidth: giam 15-20% (batch headers)
- Complexity: GIAM (khong them dependency)

