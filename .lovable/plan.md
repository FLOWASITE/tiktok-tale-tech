

# Nâng cấp Agent Mode ngang Manual Mode

## Tóm tắt vấn đề

Agent Mode (qua `agent-creator-v2`) hiện hardcode `qualityMode: "fast"` (line 449), khiến toàn bộ pipeline chất lượng bị bỏ qua. Ngoài ra, agent mode dùng **sequential generation** thay vì parallel, và thiếu Smart Context trong prompt.

## Phân tích Gap hiện tại

| Feature | Normal Mode | Agent Mode | Nguyên nhân bị skip |
|---------|-------------|------------|---------------------|
| Smart Context | ✅ (line 3442) | ❌ | `qualityMode === 'fast'` → skip |
| Self-Critique | ✅ (line 4603) | ❌ | `qualityConfig.skipCritique` = true |
| Length Validation | ✅ (line 4652) | ❌ | `qualityMode === 'fast'` → skip |
| Semantic Dedup | ✅ (line 4426) | ⚠️ runs but fails | Embedding API not supported → fail-open |
| Cross-Channel Dedup | ✅ (line 4471) | ⚠️ runs but fails | Same embedding issue |
| Parallel Generation | ✅ `generateChannelsInParallel` | ❌ Sequential loop | Agent mode has own loop |

## Thay đổi chi tiết

### 1. Sửa `supabase/functions/agent-creator-v2/index.ts`

**Đổi `qualityMode` từ `"fast"` sang `"balanced"`:**
- Line 449: `qualityMode: "balanced"` 
- Chỉ thay đổi 1 dòng — toàn bộ pipeline chất lượng downstream tự động được kích hoạt:
  - Smart Context sẽ được build (line 3442: `qualityMode !== 'fast'`)
  - Self-Critique sẽ chạy với `maxRefinements: 1` (balanced config)
  - Length Validation sẽ chạy (line 4652: `qualityMode !== 'fast'`)

### 2. Sửa `supabase/functions/generate-multichannel/index.ts` — Agent Mode block (line 4243-4329)

**A. Chuyển từ Sequential → Parallel generation:**
- Thay vòng lặp `for (const channel of formData.channels)` bằng `Promise.all()` 
- Mỗi channel vẫn dùng plain-text callAI (giữ tương thích mọi model)
- Giữ nguyên retry logic per-channel
- Ước tính giảm ~60% thời gian cho 3 kênh (3x → 1x)

**B. Inject Smart Context vào agent mode prompt:**
- Hiện tại agent mode dùng `fullSystemPrompt` (đã có Smart Context nếu `qualityMode !== 'fast'`)
- Sau khi đổi qualityMode sang `"balanced"`, Smart Context sẽ tự động được include trong `systemPrompt` → `fullSystemPrompt`
- Không cần thay đổi thêm cho phần này

**C. Semantic Dedup & Cross-Channel Dedup:**
- Cả 2 đều chạy ở post-processing (line 4422-4496), **ngoài** block `if (formData.agentMode)`
- Vấn đề: embedding API không supported → fail-open (luôn return `isDuplicate: false`)
- **Fix**: Thay vì dùng embedding, sử dụng **text-based similarity** (Jaccard/cosine trên TF-IDF) cho cross-channel dedup
- Semantic dedup (so với content cũ trong DB) vẫn cần embedding → giữ fail-open, log warning

### 3. Sửa `supabase/functions/_shared/cross-channel-dedup.ts`

**Thay embedding-based bằng text-based similarity:**
- Hiện tại `checkCrossChannelDuplicate` dùng embedding → fails
- Chuyển sang **Jaccard similarity trên n-grams** (không cần API call)
- Thuật toán: tokenize → extract 3-grams → tính Jaccard index giữa các cặp kênh
- Threshold giữ nguyên: 0.80 (duplicate), 0.70 (warning)

## Tác động kỹ thuật

```text
Agent Mode Flow (sau nâng cấp):

[Request] → [Smart Context ✅] → [System Prompt enriched]
         → [Parallel Generation ✅] (3 channels đồng thời)
         → [Semantic Dedup] (fail-open, cần embedding)
         → [Cross-Channel Dedup ✅] (text-based Jaccard)
         → [Self-Critique ✅] (balanced, 1 refinement)
         → [Length Validation ✅] (auto-expand nếu short)
         → [Save to DB]
```

**Trade-off**: Thời gian xử lý tăng ~15-20s do Self-Critique (1 LLM call thêm), nhưng chất lượng tăng đáng kể. Parallel generation bù lại ~5-8s.

## File thay đổi
- **Sửa**: `supabase/functions/agent-creator-v2/index.ts` (1 dòng: qualityMode)
- **Sửa**: `supabase/functions/generate-multichannel/index.ts` (agent mode block: parallel + cleanup)
- **Sửa**: `supabase/functions/_shared/cross-channel-dedup.ts` (text-based similarity)

