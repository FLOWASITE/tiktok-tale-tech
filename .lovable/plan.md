

# Kế hoạch: Refactor UI Form Tạo Ảnh

## Vấn đề hiện tại

Form `UnifiedImageGenerator` hiện tại có các vấn đề về layout:

1. **Dialog quá nhỏ** - Sử dụng `sm:max-w-2xl` (672px), không đủ không gian cho nhiều settings
2. **Các section dồn theo chiều dọc** - Tất cả options nằm trong một cột dài, phải cuộn nhiều
3. **Social Graphics settings phức tạp** - Phần "Ảnh có text" với TextPositionMockup, text inputs, và typography controls chiếm quá nhiều không gian dọc
4. **Không tận dụng không gian ngang** - Có thể chia 2 cột cho các controls

## Giải pháp đề xuất

### Layout mới: Split-Panel Design

```text
+----------------------------------------------------------+
|  [Header] Tạo ảnh AI                                      |
+----------------------------------------------------------+
|                           |                               |
|  LEFT PANEL (400px)       |  RIGHT PANEL (flex-1)        |
|  ═══════════════════      |  ═══════════════════         |
|                           |                               |
|  • Mode Toggle (Batch/    |  • Visual Preview Area       |
|    Single)                |    - TextPositionMockup      |
|                           |    - Style Suggestions       |
|  • Brand Preview          |    - Current Config Summary  |
|                           |                               |
|  • Channel Selection      |  • Aspect Ratio (visual)     |
|                           |                               |
|  • Image Type (Ảnh nền/   |  • Logo Position Preview     |
|    Social Graphic)        |                               |
|                           |                               |
|  • Text Input (if         |                               |
|    Social Graphic)        |                               |
|                           |                               |
+---------------------------+-------------------------------+
|  [Footer] Đóng  |  Tạo X ảnh                              |
+----------------------------------------------------------+
```

### Chi tiết thay đổi

#### 1. Mở rộng Dialog Size
- Thay `sm:max-w-2xl` thành `sm:max-w-5xl` hoặc `max-w-[900px]`
- Cho phép hiển thị 2 cột bên trong

#### 2. Left Panel - Form Controls
- **Brand Preview** (compact)
- **Mode Tabs** (Batch/Single)
- **Channel Selection** (grid 2 cols thay vì 3)
- **Image Type Toggle** (Ảnh nền / Social Graphic)
- **Text Input Area** (khi chọn Social Graphic)
  - Shared/Per-channel toggle
  - Text textarea với character count
  - AI Optimize button inline

#### 3. Right Panel - Visual Settings
- **TextPositionMockup** (scale lớn hơn, 200px width)
- **Position & Typography Controls** (grid layout compact)
- **Style Grid** (2x4 hoặc compact chips)
- **Aspect Ratio** (horizontal chips)
- **Logo Options** (inline)
- **Canvas Fallback Toggle**

#### 4. Style Suggestions
- Hiển thị như floating badges trên Right Panel
- Không chiếm không gian riêng

#### 5. Advanced Options
- Thu gọn vào Collapsible ở cuối Right Panel
- Negative prompt + Context preview

### Cải tiến UX bổ sung

1. **Responsive breakpoint**: Trên mobile/tablet, fallback về single column
2. **Sticky footer**: Buttons luôn visible
3. **Smooth transitions**: Khi toggle Social Graphics mode
4. **Better visual hierarchy**: Sử dụng sections với subtle borders

## Các file cần thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/multichannel/UnifiedImageGenerator.tsx` | Refactor layout thành 2 panels, tổ chức lại sections |
| `src/components/multichannel/TextPositionMockup.tsx` | Tăng kích thước mặc định, thêm props cho size variants |

## Phần kỹ thuật

### Component Structure mới

```typescript
// Main layout
<DialogContent className="sm:max-w-5xl max-h-[90vh]">
  <DialogHeader>...</DialogHeader>
  
  <div className="flex-1 overflow-hidden flex">
    {/* Left Panel - Form Controls */}
    <div className="w-[380px] flex-shrink-0 overflow-y-auto border-r pr-4">
      <Tabs>...</Tabs>
      <ImageTypeToggle />
      <TextInputSection />
    </div>
    
    {/* Right Panel - Visual Settings */}
    <div className="flex-1 overflow-y-auto pl-4">
      <TextPositionMockup size="lg" />
      <PositionTypographyGrid />
      <StyleGrid compact />
      <AspectRatioChips />
      <LogoOptions />
      <AdvancedCollapsible />
    </div>
  </div>
  
  <DialogFooter>...</DialogFooter>
</DialogContent>
```

### TextPositionMockup với size prop

```typescript
interface TextPositionMockupProps {
  // ... existing
  size?: 'sm' | 'md' | 'lg';  // NEW: sm=160px, md=200px, lg=240px
}

const SIZE_CLASSES = {
  sm: 'max-w-[160px]',
  md: 'max-w-[200px]', 
  lg: 'max-w-[240px]',
};
```

### Grid layout cho Position buttons

```typescript
// 3x2 grid thay vì 3+2 rows hiện tại
<div className="grid grid-cols-3 gap-2">
  {['top-left', 'top', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom', 'bottom-right']
    // Hiển thị visual grid
  }
</div>
```

## Lợi ích

1. **Không gian rộng hơn** - Tận dụng màn hình desktop
2. **Ít cuộn hơn** - Các controls song song thay vì dọc
3. **Preview trực quan** - Mockup lớn hơn, dễ nhìn
4. **Tổ chức logic** - Form controls trái, Visual settings phải
5. **Responsive** - Fallback tốt trên mobile

