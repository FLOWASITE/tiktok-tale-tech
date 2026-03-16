

## Plan: Ẩn Negative Prompt khi "Để AI lo"

### Thay đổi — 1 file: `src/components/multichannel/ImageAdvancedOptions.tsx`

Wrap block Negative Prompt (dòng 452-462) với điều kiện `promptMode !== 'full'`:

```typescript
{/* Negative Prompt — ẩn khi full mode vì đã auto-fill */}
{promptMode !== 'full' && (
  <div className="space-y-2">
    <Label className="text-xs text-muted-foreground">Không bao gồm (Negative prompt)</Label>
    <p className="text-[10px] text-muted-foreground/60 -mt-1">Liệt kê những gì KHÔNG muốn xuất hiện trong ảnh.</p>
    <Textarea
      value={negativePrompt}
      onChange={e => onNegativePromptChange(e.target.value)}
      placeholder="VD: text, watermark, logo, blurry..."
      className="h-16 text-xs resize-none"
    />
  </div>
)}
```

Negative prompt vẫn được tự động gửi theo `NEGATIVE_PROMPT_DEFAULTS[promptMode]` — chỉ ẩn UI.

