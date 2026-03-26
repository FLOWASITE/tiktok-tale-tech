

# Đổi màu Badge số lượng Pipeline — nổi bật hơn

## Vấn đề
Badge số lượng pipeline ở header mỗi cột Kanban hiện dùng `bg-background/80` (màu nền nhạt), khó nhìn — phải click vào mới thấy rõ con số.

## Giải pháp
Thay đổi Badge để sử dụng **màu tương ứng với từng stage** thay vì màu nền chung. Mỗi stage đã có `color` riêng (violet, blue, cyan, amber, emerald, pink) — ta sẽ map sang màu đậm hơn cho badge.

## Chi tiết kỹ thuật

### File: `src/components/agents/PipelineKanban.tsx`

**Thay đổi tại PipelineColumn (~line 124):**

Thêm map màu badge theo stage ID:
```typescript
const STAGE_BADGE_COLORS: Record<string, string> = {
  strategy: 'bg-violet-500 text-white',
  create: 'bg-blue-500 text-white',
  quality: 'bg-cyan-500 text-white',
  approval: 'bg-amber-500 text-white',
  publish: 'bg-emerald-500 text-white',
  analyze: 'bg-pink-500 text-white',
};
```

Đổi Badge từ:
```tsx
<Badge variant="secondary" className="text-[10px] font-bold min-w-[24px] h-5 justify-center bg-background/80">
```
Thành:
```tsx
<Badge className={cn("text-[10px] font-bold min-w-[24px] h-5 justify-center shadow-sm", STAGE_BADGE_COLORS[stage.id] || 'bg-primary text-white')}>
```

### Phạm vi: 1 file
- `src/components/agents/PipelineKanban.tsx` — thêm map màu + đổi className Badge

