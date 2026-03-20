

# Gộp Voice-Over vào Teleprompter — 4 định dạng → 3

## Phân tích

**Voice-Over** và **Teleprompter** trùng lặp ~80%:

| Thành phần | Teleprompter | Voice-Over |
|-----------|:---:|:---:|
| Dialogue | ✓ | ✓ |
| Nhấn mạnh (Emphasis) | ✓ | ✓ |
| Pause markers | ✓ | ✓ |
| CUE (hành động on-camera) | ✓ | ✗ |
| Tone/Tempo/Cảm xúc | ✗ | ✓ |

**Thêm nữa:** TTS Preview (`TTSPreview.tsx`) hoạt động độc lập — dùng Web Speech API trên `script.content`, **không phụ thuộc** vào purpose Voice-Over. Bất kỳ script nào cũng có thể nghe thử TTS.

**Kết luận:** Voice-Over chỉ là Teleprompter + thêm hướng dẫn giọng. Hoàn toàn có thể gộp thành 1 format "Người thật" có cả CUE lẫn Voice guidance.

## Giải pháp: Gộp thành "Người thật / Voice"

```text
TRƯỚC (4 options):
[Video AI] [Teleprompter] [Voice-Over] [Production]

SAU (3 options):
[Video AI] [Người thật] [Production]
```

Format mới "Người thật" kết hợp cả hai:
```
--- ĐOẠN X ---
[CUE: Hành động/biểu cảm]
"Lời thoại..." 
[NHẤN MẠNH: từ khóa]
[PAUSE: vị trí nghỉ]
GIỌNG: Tone · Tempo · Cảm xúc
---
```

### Thay đổi chi tiết

#### 1. `src/types/script.ts`
- Xóa `'voiceover'` khỏi `ScriptPurpose` → còn `'ai_video' | 'teleprompter' | 'production'`
- Thêm `'voiceover'` vào `ScriptPurposeLegacy` 
- Cập nhật `normalizePurpose`: `'voiceover'` → `'teleprompter'`
- Đổi label teleprompter: `"Người thật / Voice"` với description bao gồm cả teleprompter + voice-over

#### 2. `supabase/functions/generate-script/index.ts`
- Gộp output format `teleprompter`: thêm mục GIỌNG (Tone, Tempo, Cảm xúc) từ voice-over
- Xóa case `'voiceover'` riêng

#### 3. `src/utils/parsePrompts.ts`
- Xóa case `'voiceover'` riêng → normalize về `'teleprompter'`
- Gộp `parseVoiceoverBlock` vào `parseTeleprompterBlock` (thêm parse Tone/Tempo)

#### 4. `src/components/script/PurposeAwarePromptCard.tsx`
- Gộp `VoiceoverCard` vào `TeleprompterCard` — thêm hiển thị Tone/Tempo nếu có
- Xóa case `'voiceover'`

#### 5. `src/components/script/ScriptPurposeSelector.tsx`
- Xóa entry `voiceover` khỏi `ICON_MAP` → còn 3 options

#### 6. `src/components/script/ScriptExportMenu.tsx`
- Gộp export options voice-over vào teleprompter
- Xóa section Voice-Over riêng

#### 7. `src/components/ScriptCard.tsx`
- Xóa `voiceover` khỏi `PURPOSE_ICONS`, giữ backward compat qua normalize

#### 8. Backward compatibility
- Scripts cũ `script_purpose = 'voiceover'` → `normalizePurpose` trả về `'teleprompter'`
- Parse logic fallback: nếu block có Tone/Tempo → hiển thị thêm voice guidance

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/types/script.ts` | Xóa voiceover, cập nhật normalizePurpose |
| `supabase/functions/generate-script/index.ts` | Gộp output format |
| `src/utils/parsePrompts.ts` | Gộp parse logic |
| `src/components/script/PurposeAwarePromptCard.tsx` | Gộp card render |
| `src/components/script/ScriptPurposeSelector.tsx` | 3 options |
| `src/components/script/ScriptExportMenu.tsx` | Gộp export |
| `src/components/ScriptCard.tsx` | Cleanup icon map |

