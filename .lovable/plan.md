
# 🎬 KẾ HOẠCH CẢI TIẾN PHÂN HỆ TẠO KỊCH BẢN VIDEO

## Phân tích Hiện trạng

Tôi đã rà soát toàn diện hệ thống bao gồm:
- **Frontend**: 29 components trong `src/components/script/`
- **Backend**: Edge function `generate-script` (~1835 dòng) với 15 thể loại video, 11 kiểu nhân vật
- **Features**: Script Analyzer, Storyboard Generator, Teleprompter Mode, Hook Generator
- **Hooks**: ~140+ hooks hỗ trợ, bao gồm AI, Brand, Persona integration

### Điểm Mạnh Hiện Tại
| Tính năng | Đánh giá |
|-----------|----------|
| Multi-purpose output (VEO3, Minimax, Teleprompter, Voiceover, Production) | ⭐⭐⭐⭐⭐ Xuất sắc |
| 15 thể loại video với cấu trúc chi tiết | ⭐⭐⭐⭐⭐ Rất phong phú |
| 11 kiểu nhân vật (Creator Archetypes) | ⭐⭐⭐⭐⭐ Chuyên nghiệp |
| Brand Voice + Industry Memory integration | ⭐⭐⭐⭐⭐ Enterprise-level |
| Self-Critique Loop | ⭐⭐⭐⭐ Tốt |
| Voice Region (Bắc/Trung/Nam) | ⭐⭐⭐⭐ Unique feature |

### Điểm Cần Cải Thiện
| Vấn đề | Mức độ | Ảnh hưởng |
|--------|--------|-----------|
| Không có Real-time Script Scoring khi nhập | High | UX |
| Thiếu Inline AI Suggestions (gợi ý viết lại từng đoạn) | High | Chất lượng output |
| Storyboard Generator chưa có AI Scene Image | Medium | Visual Preview |
| Teleprompter chưa có TTS Preview | Medium | Productivity |
| Thiếu B-Roll Keywords extraction | Medium | Video Production |
| Chưa có Emotional Arc Visualization | Low | Analytics |
| Thiếu tích hợp Music Suggestion | Low | Creative |

---

## Lộ Trình Cải Tiến (5 Phases)

### PHASE 1: Quick Wins (Ưu tiên cao - 1-2 tuần)

#### 1.1 Real-time Script Scoring
**Mục tiêu**: Hiển thị điểm số ngay khi script được tạo (không cần click phân tích)

```text
┌─────────────────────────────────────────┐
│ 🎬 Kịch bản của bạn         Score: 78/100│
├─────────────────────────────────────────┤
│ Hook: ████████░░ 82    Clarity: ███████░░ 75│
│ Viral: ██████░░░░ 65   Pacing: ████████░░ 80│
└─────────────────────────────────────────┘
```

**Thay đổi kỹ thuật**:
- Gọi `analyze-script` edge function ngay sau khi script được tạo
- Lưu `analysis_cache` vào database cùng với script
- Hiển thị mini-scores trên ScriptCard và ScriptViewer header

#### 1.2 Inline AI Suggestions (Viết lại từng đoạn)
**Mục tiêu**: Cho phép user hover vào từng PROMPT và nhận gợi ý cải thiện

```text
PROMPT 3 [00:16-00:24]                    💡
─────────────────────────────────────────
"Điều quan trọng nhất bạn cần hiểu là..."
                                    
┌─ AI Suggestions ─────────────────────┐
│ 🔥 Thêm số liệu: "Theo khảo sát,     │
│    73% người mắc sai lầm này..."     │
│ ⚡ Tăng urgency: "Nếu không sửa      │
│    ngay, bạn sẽ..."                  │
│ 💬 [Viết lại đoạn này]               │
└──────────────────────────────────────┘
```

**Thay đổi kỹ thuật**:
- Tạo mới edge function `suggest-prompt-rewrite`
- Thêm component `PromptSuggestionPopover` trong PurposeAwarePromptCard
- Cho phép 1-click replace hoặc edit suggestion

#### 1.3 Thêm Current Date Context
**Mục tiêu**: Đảm bảo AI luôn dùng năm hiện tại (2026)

**Thay đổi kỹ thuật**:
- Thêm `buildDateContextSection()` vào `generate-script/index.ts` (tương tự đã làm cho multichannel)
- Inject vào System Prompt ngay đầu

---

### PHASE 2: Visual Enhancement (2-3 tuần)

#### 2.1 AI Scene Image Generation
**Mục tiêu**: Tạo thumbnail preview cho từng scene trong Storyboard

```text
┌──────────────┐ SCENE 3: Medium shot
│  🖼️ AI       │ Camera: Pan left slowly
│  Generated   │ Lighting: Soft natural
│  Preview     │ Emotion: Confident
└──────────────┘ 
[Regenerate] [Edit Prompt]
```

**Thay đổi kỹ thuật**:
- Tích hợp với Lovable AI `google/gemini-3-pro-image-preview`
- Tạo edge function `generate-scene-thumbnail`
- Thêm lazy-load image generation vào StoryboardSceneCard

#### 2.2 B-Roll Keywords Extraction
**Mục tiêu**: Tự động suggest B-Roll cho từng prompt

```text
PROMPT 5: "...tiết kiệm được 30% chi phí..."
├─ B-Roll Suggestions:
│  📊 Chart showing 30% savings
│  💰 Money counting animation
│  ✅ Before/After comparison
└─ [Search Stock] [Generate AI]
```

**Thay đổi kỹ thuật**:
- Mở rộng output format trong `getOutputFormat()` để bao gồm `b_roll_keywords[]`
- Thêm UI section trong PurposeAwarePromptCard

#### 2.3 Emotional Arc Visualization
**Mục tiêu**: Biểu đồ cảm xúc xuyên suốt video

```text
Intensity
  100 ┤      ╭──╮         ╭──
   75 ┤   ╭─╯  ╰─╮     ╭─╯
   50 ┤╭─╯       ╰───╮╯
   25 ┤│              
    0 └┴──┴──┴──┴──┴──┴──┴─→ Time
      P1 P2 P3 P4 P5 P6 P7
      Tò  Hứng Tập Tin  Kêu
      mò  thú  trung cậy gọi
```

**Thay đổi kỹ thuật**:
- Đã có `emotionalArc` trong ScriptAnalysis
- Thêm Recharts visualization vào ScriptAnalyzer

---

### PHASE 3: Audio Enhancement (3-4 tuần)

#### 3.1 Text-to-Speech Preview
**Mục tiêu**: Nghe thử giọng đọc trước khi quay

```text
🎤 TTS Preview
├─ Voice: [VN Female] ▼
├─ Speed: ███████░░░ 85%
├─ Pitch: █████░░░░░ 55%
└─ [▶️ Play All] [⏸️] [↻]

PROMPT 1 ▶️ ●──────────── 0:08
PROMPT 2 ⏸️ ────────────── 0:08
```

**Thay đổi kỹ thuật**:
- Tích hợp Web Speech API (browser-native, miễn phí)
- Fallback: Edge TTS hoặc Google TTS API
- Thêm TTS controls vào TeleprompterMode

#### 3.2 Music Mood Suggestion
**Mục tiêu**: Gợi ý nhạc nền phù hợp với emotional arc

```text
🎵 Suggested Music Moods:
├─ Opening (P1-P2): Upbeat Corporate
├─ Building (P3-P5): Inspiring Ambient
├─ Climax (P6): Triumphant Orchestral
├─ Outro (P7): Soft Fade Out
└─ [Browse Free Music Library]
```

**Thay đổi kỹ thuật**:
- Map emotionalArc intensity thành music moods
- Link đến free music sources (Pixabay, YouTube Audio Library)

---

### PHASE 4: Collaboration (4-5 tuần)

#### 4.1 Script Approval Workflow
**Mục tiêu**: Team review và approve scripts

```text
Draft → Review → Revision → Approved → Published
  │       ↓         ↓         ↓
  │    @reviewer  feedback   ✅
  │    comments   applied
  └── [Submit for Review]
```

**Thay đổi kỹ thuật**:
- Đã có `status` field (draft/review/approved/published)
- Thêm `useApprovalAssignments` integration cho scripts
- Comment thread per-prompt

#### 4.2 Version History
**Mục tiêu**: Lưu lịch sử chỉnh sửa và so sánh

```text
Version History
├─ v3 (current) - 10:30 AM - After AI refinement
├─ v2 - 10:15 AM - Manual edits by @user
├─ v1 - 10:00 AM - Original generation
└─ [Compare] [Restore]
```

**Thay đổi kỹ thuật**:
- Tạo bảng `script_versions` với content snapshots
- Diff view cho so sánh versions

---

### PHASE 5: Text-to-Video Integration (Long-term)

#### 5.1 Direct VEO3/Minimax Export
**Mục tiêu**: Export script thành format sẵn sàng cho video AI

```text
Export Options
├─ 📋 VEO 3 Prompts (.txt) - Copy each prompt
├─ 🎬 Minimax Clips (.json) - API-ready format
├─ 📹 Runway ML Format
├─ 🎥 Kling AI Format
└─ ⬇️ [Download All]
```

#### 5.2 API Integration (Future)
- Webhook trigger khi script approved
- Direct API call to video generation services

---

## Ưu Tiên Triển Khai

| Phase | Feature | Impact | Effort | Priority |
|-------|---------|--------|--------|----------|
| 1.1 | Real-time Scoring | ⭐⭐⭐⭐⭐ | ⭐⭐ | P0 |
| 1.2 | Inline Suggestions | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | P0 |
| 1.3 | Date Context | ⭐⭐⭐ | ⭐ | P0 |
| 2.1 | Scene Images | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | P1 |
| 2.2 | B-Roll Keywords | ⭐⭐⭐⭐ | ⭐⭐ | P1 |
| 2.3 | Emotional Arc | ⭐⭐⭐ | ⭐⭐ | P2 |
| 3.1 | TTS Preview | ⭐⭐⭐⭐ | ⭐⭐⭐ | P1 |
| 3.2 | Music Suggestion | ⭐⭐⭐ | ⭐⭐ | P2 |
| 4.1 | Approval Workflow | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | P2 |
| 5.1 | Video Export | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | P3 |

---

## Đề Xuất Triển Khai Ngay (Phase 1)

Tôi đề xuất bắt đầu với **3 Quick Wins** để cải thiện UX ngay lập tức:

### 1. Thêm Date Context vào generate-script
```typescript
// generate-script/index.ts
function buildDateContextSection(): string {
  const now = new Date();
  const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const currentYear = vnTime.getUTCFullYear();
  return `## THỜI GIAN HIỆN TẠI
- Ngày: ${vnTime.toISOString().split('T')[0]}
- Năm: ${currentYear}
⚠️ QUAN TRỌNG: Sử dụng năm ${currentYear}, KHÔNG dùng năm cũ.`;
}
```

### 2. Auto-analyze sau khi tạo script
```typescript
// Trong generate-script response hoặc frontend
// Tự động gọi analyze-script ngay sau khi lưu
const analysisResult = await supabase.functions.invoke('analyze-script', {
  body: { scriptContent: content, ... }
});
// Lưu analysis vào script record
```

### 3. Thêm Inline Suggestion Button vào mỗi Prompt Card
```tsx
// PurposeAwarePromptCard.tsx
<Button size="sm" variant="ghost" onClick={() => getSuggestions(prompt)}>
  <Lightbulb className="h-3 w-3 mr-1" />
  Gợi ý cải thiện
</Button>
```

---

## Technical Specifications (Chi tiết kỹ thuật)

### Bảng database mới cần tạo
```sql
-- Lưu analysis cache để không cần re-analyze
ALTER TABLE scripts ADD COLUMN analysis_cache JSONB;
ALTER TABLE scripts ADD COLUMN analyzed_at TIMESTAMPTZ;

-- Script versions cho version history
CREATE TABLE script_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID REFERENCES scripts(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  content TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  change_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Edge functions mới
- `suggest-prompt-rewrite` - Gợi ý viết lại từng prompt
- `generate-scene-thumbnail` - Tạo ảnh preview cho scene
- `extract-broll-keywords` - Trích xuất B-Roll keywords

---

## Kết Luận

Hệ thống Tạo kịch bản Video hiện tại đã **rất mạnh** với:
- 5 output formats cho các mục đích khác nhau
- 15 thể loại video với cấu trúc chi tiết
- 11 kiểu nhân vật chuyên nghiệp
- Tích hợp sâu với Brand Voice và Industry Memory

Các cải tiến đề xuất sẽ nâng hệ thống lên **enterprise-grade** với:
- Real-time feedback và scoring
- AI-assisted editing per-prompt
- Visual preview với scene images
- Audio preview với TTS
- Team collaboration workflow

Bạn muốn tôi triển khai Phase 1 (Quick Wins) trước không?
