
Move the ChevronDown icon to the far right of the brand switcher button by pushing it with `ml-auto`, so it sits flush against the right padding regardless of brand name length.

### Change
**`src/components/HeaderBrandSwitcher.tsx`** (trigger Button)
- Add `ml-auto` to the `ChevronDown` icon className so it gets pushed to the right edge.
- Keep all other styling (width, colors, spacing) unchanged.

```tsx
<ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-auto" />
```

### Result
Icon dropdown nằm sát mép phải của switcher, brand name + avatar căn trái, khoảng trống ở giữa tự co giãn.
