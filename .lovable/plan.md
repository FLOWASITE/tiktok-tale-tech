

# Fix: Thêm chip "Brainstorm AI" vào TopicIdeaHub trong CarouselForm

## Nguyên nhân

`TopicIdeaHub` trong `CarouselForm.tsx` (dòng 299-311) không truyền prop `onBrainstorm`. Prop này là điều kiện để render chip "Brainstorm AI" gradient bên trong hub (xem `TopicIdeaHub.tsx` dòng 123-135: `{onBrainstorm && (...)}`).

## Giải pháp

### File: `src/components/CarouselForm.tsx`

Thêm prop `onBrainstorm` vào `TopicIdeaHub`, trỏ đến hàm mở Brainstorm Sheet đã có sẵn:

```tsx
<TopicIdeaHub
  ...
  onBrainstorm={() => setShowBrainstormSheet(true)}
  ...
/>
```

Chỉ cần thêm 1 dòng duy nhất. Logic `showBrainstormSheet` và `TopicBrainstormSheet` đã có sẵn trong component.

