## Mục tiêu

Thêm **Scene Manager** vào tab Video để bạn có thể:
- Xem **toàn bộ** scene/PROMPT theo thứ tự, không chỉ render từng card riêng lẻ
- **Sắp xếp lại thứ tự** scene bằng kéo-thả (drag-and-drop)
- **Thêm scene mới** ở bất kỳ vị trí nào với template rỗng
- **Edit prompt inline** từng scene (không phải bật chế độ edit toàn bộ kịch bản)
- **Xóa** scene
- Tự động lưu lại vào `script.content` và sync UI

## Vấn đề hiện tại

`ScriptVideoTab` (vừa làm) có `ScriptSceneGrid` hiển thị card per scene nhưng:
- Read-only — không edit/move/add/delete được
- Order cố định theo `parsedPrompts` (parse từ markdown của `script.content`)
- Muốn thêm scene phải đóng dialog → bật "Sửa kịch bản" → edit raw markdown thủ công → lưu

## Thiết kế

### Lưu trữ
Không tạo bảng mới. Scene order = thứ tự xuất hiện trong `script.content` (markdown). Khi user thay đổi → **rewrite `script.content`** → save vào DB.

```text
script.content (markdown):
**PROMPT 1:**
<raw block 1>

**PROMPT 2:**
<raw block 2>
...
```

Sau khi reorder/add/delete:
- Renumber lại tuần tự (PROMPT 1, 2, 3…)
- Lưu lại bằng `supabase.from('scripts').update({ content })`

### Lưu ý mapping với clip đã render
- `video_generations.scene_number` đã link với số scene cũ
- Khi reorder, scene #2 cũ trở thành scene #1 mới → clip cũ vẫn ở `scene_number=2` trong DB
- **Giải pháp đơn giản**: cảnh báo user trước khi reorder — clip đã render sẽ giữ `scene_number` cũ; user re-render nếu cần (đa số dùng case là sắp xếp lại trước khi render)
- **Nâng cao** (out of scope phase này): batch update `scene_number` trong `video_generations` theo mapping cũ→mới

## Files mới

### 1. `src/utils/serializeScenes.ts`
- `EditableScene { sceneNumber, rawContent }`
- `serializeScenes(scenes, purpose)` → markdown string với header `**PROMPT N:**` / `**SCENE N:**` / `**BLOCK N:**` theo purpose
- `emptySceneTemplate(purpose)` → text mặc định cho scene mới

### 2. `src/components/script/SceneManagerPanel.tsx`
Panel chính với UI:

```text
┌─ Quản lý cảnh ─── [+ Thêm scene] [↻ Renumber] ──┐
│ ┌──────────────────────────────────────────────┐ │
│ │ ☰ #1  [✓ rendered]                  [⋯]    │ │
│ │ Visual: cô gái cười, ánh sáng vàng...      │ │
│ │ [Edit] [Delete] [+ Thêm dưới]              │ │
│ └──────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────┐ │
│ │ ☰ #2  [chưa quay]                   [⋯]    │ │
│ │ ...                                          │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

- Dùng `@dnd-kit/core` + `@dnd-kit/sortable` (đã cài) — handle `☰` để drag
- Mỗi item: badge số scene, status clip (linked qua `bySceneNumber`), preview prompt 2-3 dòng, action buttons
- Click "Edit" → expand inline `<Textarea>` để edit `rawContent`
- "Delete" → confirm dialog → remove + renumber
- "+ Thêm dưới" → insert empty scene ngay sau item này
- Thay đổi → set `dirty=true`, hiện sticky bar `[Hủy] [Lưu thay đổi]`
- "Lưu" → serialize → `supabase.from('scripts').update({ content })` → call `onScriptUpdate(updatedScript)` để propagate lên `ScriptViewer`

### 3. Cảnh báo khi reorder
- Nếu có ít nhất 1 scene đã có clip completed và user reorder → toast warning trước khi save:
  > "Một số scene đã có video render. Sau khi sắp xếp, video cũ sẽ giữ liên kết với số scene cũ. Bạn có thể cần re-render để khớp."

## Files sửa

### `src/components/script/ScriptVideoTab.tsx`
Thêm **toggle 2 view**:
- "Lưới scene" (mặc định) → `ScriptSceneGrid` hiện tại
- "Quản lý" → `SceneManagerPanel`

```tsx
<Tabs value={view} onValueChange={setView}>
  <TabsList>
    <TabsTrigger value="grid">Lưới scene</TabsTrigger>
    <TabsTrigger value="manage">Quản lý & sắp xếp</TabsTrigger>
  </TabsList>
  <TabsContent value="grid"><ScriptSceneGrid ... /></TabsContent>
  <TabsContent value="manage">
    <SceneManagerPanel
      script={script}
      bySceneNumber={bySceneNumber}
      onScriptUpdate={onScriptUpdate}
    />
  </TabsContent>
</Tabs>
```

Truyền `onScriptUpdate` từ `ScriptViewer` xuống (đã có sẵn ở props).

### `src/components/ScriptViewer.tsx`
Truyền thêm `onScriptUpdate` vào `<ScriptVideoTab>` (1 line change).

## Out of scope
- Không re-map `video_generations.scene_number` tự động (chỉ cảnh báo user)
- Không thêm field metadata mới (duration/aspect rời) — vẫn parse từ rawContent
- Không validate content (PROMPT phải có Visual/Motion…) — giữ nguyên raw

## Technical details

```text
SceneManagerPanel
  ├─ DndContext (closestCenter)
  ├─ SortableContext (verticalListSortingStrategy)
  │   └─ scenes.map(s => <SortableSceneItem key={s.id} ... />)
  └─ Sticky save bar (chỉ hiện khi dirty)

SortableSceneItem
  ├─ useSortable({ id })
  ├─ Drag handle (☰)
  ├─ Status badge (đọc bySceneNumber.get(originalNumber))
  ├─ Prompt preview / Inline textarea editor
  └─ Action menu (Edit / Delete / Insert below / Duplicate)
```

State local trong panel:
```ts
const [scenes, setScenes] = useState<EditableScene[]>(() => parseInitial());
const [dirty, setDirty] = useState(false);
const [editingId, setEditingId] = useState<string | null>(null);
```

Khi save thành công, panel reset `dirty=false` và parent re-fetch via `onScriptUpdate`.
