

# Nâng cấp Y-Fork Connector — Thẩm mỹ hơn

## Vấn đề
SVG Y-fork hiện tại là 2 đường thẳng gãy góc (L60→L30, L60→L90), trông cứng nhắc và thô. Kích thước nhỏ (120x48), dashed line mỏng.

## Giải pháp — Curved bezier + gradient + glow

### Visual mới
```text
         │
         │  (gradient dọc, fade từ primary → secondary)
         │
         ╲              ╱
          ╲            ╱
           ╲          ╱
            •        •   ← 2 chấm tròn nhỏ ở đầu nhánh
```

### Thay đổi cụ thể
1. **Bezier curves** thay vì đường gãy góc — dùng `C` (cubic bezier) để tạo đường cong mượt
2. **Gradient stroke** — `linearGradient` từ primary sang primary/40 theo chiều dọc
3. **Stroke rộng hơn** (3px) + solid thay vì dashed → thanh lịch hơn
4. **Dot endpoints** — 2 circle nhỏ (r=4) ở cuối mỗi nhánh, màu primary, có glow nhẹ
5. **Kích thước lớn hơn** — 160x56 để nhánh cong thoáng hơn, không bị gấp gáp
6. **Opacity animation** — fade in nhẹ thay vì chỉ pathLength

### SVG mới (concept)
```svg
<svg width="160" height="56" viewBox="0 0 160 56">
  <defs>
    <linearGradient id="forkGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="primary" />
      <stop offset="100%" stop-color="primary/40" />
    </linearGradient>
  </defs>
  <!-- Nhánh trái: curve mượt -->
  <path d="M80 0 C80 24, 40 32, 40 52" stroke="url(#forkGrad)" />
  <!-- Nhánh phải: curve mượt -->
  <path d="M80 0 C80 24, 120 32, 120 52" stroke="url(#forkGrad)" />
  <!-- Dot endpoints -->
  <circle cx="40" cy="52" r="4" fill="primary" />
  <circle cx="120" cy="52" r="4" fill="primary" />
</svg>
```

## File thay đổi
- **Edit**: `src/landing/components/WorkflowSection.tsx` — chỉ thay block Y-Fork SVG (lines 336-362)

