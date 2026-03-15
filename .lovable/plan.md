

## Rà soát: Gaps giữa đề xuất chuyên gia và triển khai hiện tại

### Đã làm đúng (5/5 thay đổi chính)

1. **Mode `full`**: "FULL CREATIVE FREEDOM" → "GUIDED CREATIVE" với phân tách rõ constraints vs creative latitude — **OK**
2. **Mode `brand_only`**: Bỏ "LITERALLY", thêm channel optimization (aspect ratio + composition) — **OK**
3. **Mode `raw`**: Thêm `"Ensure output has clean composition suitable for {channel} usage"` — **OK**
4. **Channel-specific text layouts**: `CHANNEL_TEXT_LAYOUTS` cho tiktok, instagram, youtube, linkedin, email — **OK**
5. **PromptPreview component**: Tạo mới + tích hợp cả SimpleImageGenerator và MultiChannelFormWizard — **OK**

### Gaps phát hiện

#### Gap 1: MultiChannelFormWizard thiếu props cho PromptPreview (BUG)

`SimpleImageGenerator` truyền đầy đủ props:
```
brandPrimaryColor, hookType, countryCode, personaName
```

`MultiChannelFormWizard` (line 1998-2005) thiếu hoàn toàn 4 props này:
```tsx
<PromptPreview
  channels={formData.channels}
  promptMode={promptMode}
  imageStyle="auto"
  contentRole={formData.contentRole}
  contentAngle={formData.contentAngle}
  imageContentType="with_text"
  // ← THIẾU: brandPrimaryColor, hookType, countryCode, personaName
/>
```

Kết quả: PromptPreview trong wizard sẽ không hiển thị Brand color, Hook, Thị trường, Đối tượng — mất gần nửa thông tin hữu ích.

**Fix:** Truyền thêm 4 props từ data có sẵn trong wizard (brand template, formData, persona).

#### Gap 2: PromptPreview chưa hiển thị text layout type

Chuyên gia gợi ý preview nên cho biết **loại layout** sẽ áp dụng (channel-specific vs generic 3-phần). Hiện tại chỉ hiển thị "Text overlay: Có/Không" — user không biết TikTok sẽ có layout vertical storytelling khác Facebook.

**Fix:** Khi `imageContentType === 'with_text'`, hiển thị thêm layout type per channel. Ví dụ: "Có (TikTok: Vertical storytelling, Facebook: Poster 3 phần)".

#### Gap 3: PromptPreview không phân biệt thông tin active/inactive theo mode

Hiện tại chỉ ẩn rows khi `promptMode !== 'full'`. Nhưng chuyên gia gợi ý user cần thấy rõ **AI đang kiểm soát gì vs bỏ qua gì** — đặc biệt quan trọng cho mode `brand_only` (user nên biết strategic context bị bỏ).

**Fix:** Thêm visual indicator cho rows bị skip. Ví dụ: rows vẫn hiển thị nhưng với style mờ + text "Không áp dụng ở chế độ này" cho `brand_only` và `raw`.

---

### Kế hoạch fix

| # | Thay đổi | File | Effort |
|---|----------|------|--------|
| 1 | Truyền đủ props cho PromptPreview trong wizard | `MultiChannelFormWizard.tsx` | ~10 dòng |
| 2 | Hiển thị text layout type per channel | `PromptPreview.tsx` | ~20 dòng |
| 3 | Hiển thị inactive rows với visual indicator | `PromptPreview.tsx` | ~25 dòng |

Tổng: ~55 dòng thay đổi, 2 files. Không breaking change.

