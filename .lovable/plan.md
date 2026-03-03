

## Fix: Loại bỏ trùng lặp 2 thanh progress Core Content

### Nguyên nhân

Khi tạo Core Content ở Step 2, hai component cùng hiển thị tiến trình:
1. **CoreContentStreamingCard** (inline, Step 2) - hiển thị chi tiết streaming text + progress
2. **ActiveTasksIndicator** (floating, bottom-right) - hiển thị task dạng nhỏ gọn

Ca 2 đều hiển thị khi `isGeneratingCoreContent = true`, gây trùng lặp.

### Giải pháp

Lọc bỏ task `core_content` khỏi `ActiveTasksIndicator` khi đang ở Step 2 và `isGeneratingCoreContent = true` (vì inline card đã hiển thị đầy đủ).

### Chi tiết kỹ thuật

**File: `src/components/multichannel/MultiChannelFormWizard.tsx`**

Tại nơi truyền `tasks` cho `ActiveTasksIndicator` (line ~1768), lọc bỏ task core_content khi inline card đang hiển thị:

```tsx
<ActiveTasksIndicator
  tasks={
    // Hide core_content task from floating indicator when inline streaming card is visible
    isGeneratingCoreContent && currentStep === 2
      ? activeTasks.filter(t => t.task_type !== 'core_content')
      : activeTasks
  }
  pendingQueue={pendingQueueItems}
  onDismiss={dismissTask}
  onTaskClick={handleTaskClick}
  onCancelPending={handleCancelPending}
/>
```

Ngoai ra, floating progress indicator ở line 1661 (`currentStep > 2 && isGeneratingCoreContent`) cũng cần lọc tương tự -- khi floating indicator hiển thị (step 3/4), ẩn core_content task trong ActiveTasksIndicator:

```tsx
tasks={
  isGeneratingCoreContent
    ? activeTasks.filter(t => t.task_type !== 'core_content')
    : activeTasks
}
```

Tóm lại: Khi `isGeneratingCoreContent = true`, luôn lọc bỏ task core_content khỏi ActiveTasksIndicator vì đã có UI chuyên dụng (inline card ở step 2, floating card ở step 3/4).

