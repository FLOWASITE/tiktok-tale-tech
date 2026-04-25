# 🐛 Vấn đề: Ảnh trên Nội dung đa kênh tạo 2 lần

## 🔍 Nguyên nhân (đã xác định qua edge function logs)

**Bằng chứng từ Supabase analytics** — function `generate-brand-image` (ID `153f8798-...`):
```
POST 200  execution=88298ms  timestamp=1777098589399  ← gọi lần 2
POST 200  execution=87521ms  timestamp=1777098588622  ← gọi lần 1 (cách 778ms)
OPTIONS 200 ×2 (preflight cũng đôi)
```
→ Browser fire **2 request gần như đồng thời** cho cùng 1 channel, cách nhau <1 giây. Cả 2 đều chạy ~88s và đều thành công, gây tốn 2× credit.

**Root cause** nằm ở `MultiChannelFormWizard.tsx:929-971`:

```tsx
const autoImageTriggeredRef = useRef(false);
useEffect(() => {
  if (
    currentStep === 5 &&
    imageMode === 'auto' &&
    imagePhase === 'idle' &&
    generationComplete &&
    !autoImageTriggeredRef.current && ...
  ) {
    autoImageTriggeredRef.current = true;
    onStartImagePipeline(...);
  }
}, [currentStep, imageMode, imagePhase, generationComplete]);
```

Có guard `autoImageTriggeredRef` nhưng **vẫn double-fire** vì:
1. **React StrictMode bật** (`src/main.tsx:8`) → trong dev, mọi `useEffect` chạy 2 lần (mount → unmount → mount). Lần unmount middle KHÔNG reset ref nhưng cũng không gọi cleanup → lần mount thứ 2 ref đã `=true`, OK.
2. **NHƯNG**: deps `[currentStep, imageMode, imagePhase, generationComplete]` — khi `startPipeline` được gọi, nó set `imagePhase: 'idle' → 'preparing'`. Effect chạy lại, fail check `imagePhase === 'idle'`. Tốt.
3. **Vấn đề thật**: giữa lúc `onStartImagePipeline` được gọi (sync) và lúc state `imagePhase` thực sự update sang `'preparing'` (async, batched), **effect có thể bị schedule chạy lần nữa** từ một thay đổi prop khác (vd `generationComplete` flicker, hoặc `currentStep` re-render do parent). Ref đã `=true` nên đáng lẽ block, NHƯNG nếu component bị **remount hoàn toàn** (ví dụ `key={location.key}` ở `MultiChannelCreate.tsx:326` hoặc StrictMode strict re-mount) thì `useRef` reset về `false` → fire lần 2.
4. Bằng chứng `key={location.key}` ở dòng 326 — nếu router push lại location (ví dụ sau khi `setGeneratedContentId`), wizard remount → ref reset → fire 2 lần.

## ✅ Giải pháp (3 layer phòng vệ)

### Layer 1 — Persist guard ngoài component lifecycle
Trong `MultiChannelFormWizard.tsx`, thay `useRef` (bị reset khi remount) bằng guard dựa trên **`generatedContentId` đã trigger**:

```tsx
// Top of component
const triggeredContentIdsRef = useRef(new Set<string>());

useEffect(() => {
  if (currentStep === 5 && imageMode === 'auto' && imagePhase === 'idle' &&
      generationComplete && getChannelText && onStartImagePipeline &&
      generatedContentIdProp &&
      !triggeredContentIdsRef.current.has(generatedContentIdProp)) {
    triggeredContentIdsRef.current.add(generatedContentIdProp);
    // ... gọi onStartImagePipeline
  }
}, [currentStep, imageMode, imagePhase, generationComplete, generatedContentIdProp]);
```
Vì `generatedContentIdProp` ổn định (UUID), set sẽ tồn tại qua mỗi lần mount mới của cùng phiên. Để chống cả case remount toàn bộ, lift Set lên **module-level** (`const TRIGGERED = new Set<string>()`) — guard trường tồn cả page navigation.

### Layer 2 — Idempotency ở `useAutoImagePipeline.startPipeline`
Trong `src/hooks/useAutoImagePipeline.ts:108`, thêm `inFlightRef` chống concurrent calls cùng `contentId`:

```tsx
const inFlightContentIdRef = useRef<string | null>(null);

const startPipeline = useCallback(async (contentId, channels, ...) => {
  if (inFlightContentIdRef.current === contentId) {
    console.warn('[AutoImagePipeline] Already in-flight for', contentId, '— skipping duplicate');
    return;
  }
  inFlightContentIdRef.current = contentId;
  try {
    // ... existing logic
  } finally {
    inFlightContentIdRef.current = null;
  }
}, [...]);
```

### Layer 3 — Server-side dedupe trong `generate-brand-image`
Trong `supabase/functions/generate-brand-image/index.ts`, ngay đầu handler, check **active task** cho cùng `(contentId, channel)` trong 60s gần đây:

```ts
const { data: recentTask } = await supabase
  .from('generation_tasks')
  .select('id, status, created_at')
  .eq('task_type', 'image_generation')
  .contains('input_params', { contentId, channel })
  .in('status', ['pending', 'generating'])
  .gte('created_at', new Date(Date.now() - 60_000).toISOString())
  .neq('id', taskId) // exclude bản thân
  .limit(1)
  .maybeSingle();

if (recentTask) {
  return new Response(JSON.stringify({
    success: false,
    error: 'duplicate_request',
    message: `Đã có request đang chạy cho ${channel} (task ${recentTask.id})`,
  }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
```

Frontend đã có `isRecoverableBrandImageError` + `waitForRecoveredBrandImage` (xem `useAutoImageGeneration.ts:355-360`) → khi nhận 409, sẽ tự poll và lấy ảnh từ task đầu tiên, không tạo trùng.

## 📁 Files cần sửa
1. **`src/components/multichannel/MultiChannelFormWizard.tsx`** — đổi guard sang Set theo `contentId`, lift module-level
2. **`src/hooks/useAutoImagePipeline.ts`** — thêm `inFlightContentIdRef` ở `startPipeline`
3. **`supabase/functions/generate-brand-image/index.ts`** — thêm server-side dedupe check sau khi parse `contentId/channel`

## 🧪 Cách verify sau khi fix
1. Tạo content đa kênh mới → check edge function logs: chỉ 1 POST `generate-brand-image` per channel.
2. Console log `[AutoImagePipeline] 🎬 PIPELINE INIT` chỉ xuất hiện **1 lần** per `contentId`.
3. Nếu user bấm Retry — chấp nhận; chỉ chặn duplicate trong 60s đầu.
4. Trong dev với StrictMode, vẫn không double-fire.

## ⚠️ Lưu ý
- KHÔNG tắt StrictMode (cần để bắt bug).
- Server-side dedupe chỉ chặn trong 60s — không ảnh hưởng manual regenerate vài phút sau.
- `generation_tasks` đã có column `input_params` JSONB chứa `{contentId, channel, ...}` (xem `src/lib/imageGenerationTasks.ts:30-35`).
