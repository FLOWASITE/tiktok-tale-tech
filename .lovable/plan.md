

## Vấn đề: Tabs hiển thị thiếu data do sai tên field

Data trong DB rất phong phú, nhưng các tab components đọc sai tên field nên hiển thị "Không có dữ liệu" hoặc bỏ qua nhiều trường.

### Mismatches phát hiện được (industry `medical_aesthetic_clinic` v3.0)

| Tab | Field code expects | Field DB actually has | Hậu quả |
|---|---|---|---|
| **Rules > Compliance** | `rule_text`, `rule_id` | `rule` | 15 rules hiện ra **trống nội dung** |
| **Rules > Claims** | `forbidden_claim` | `claim` | 13 claims hiện ra **trống** |
| **Terminology > Preferred Terms** | `Record<string, string>` | `Record<string, string[]>` (vi: 23 terms, en: 17 terms) | Không render được, hoặc render `[object]` |
| **Terminology > Risk Weights** | `weights`, `thresholds` | `scoring_weights`, `risk_thresholds` | Card Risk Weights/Thresholds **không hiện** |
| **BrandVoice** | chỉ đọc `tone_of_voice`, `formality_level`, `language_style`, `emoji_policy`, `cta_policy` | Còn thêm: `voice_dos` (8), `voice_donts` (8), `tone_must_avoid` (9), `industry_definition` (mô tả dài), `industry_subsectors` (9), `auto_block_conditions` (8 — nằm trong risk_guidelines) | **5+ section lớn bị ẩn hoàn toàn** |

### Thay đổi

**1. `src/components/admin/pack-detail/RulesTab.tsx`**
- Đọc `rule.rule || rule.rule_text` (fallback cả 2 schema).
- Đọc `claim.claim || claim.forbidden_claim`.
- Search filter cũng update 2 key.

**2. `src/components/admin/pack-detail/TerminologyTab.tsx`**
- `preferred_terms`: render đúng `Record<string, string[]>` — group theo language code (vi/en/zh), mỗi badge là 1 term trong array. Fallback nếu là string.
- `riskGuidelines.weights || riskGuidelines.scoring_weights` và `thresholds || risk_thresholds`.
- Thêm card **Auto Block Conditions** (đọc `risk_guidelines.auto_block_conditions`).

**3. `src/components/admin/pack-detail/BrandVoiceTab.tsx`** — bổ sung 5 section mới:
- **Industry Definition** (text block dài, prose).
- **Industry Subsectors** (badge list).
- **Voice DOs** (✅ list xanh) và **Voice DON'Ts** (❌ list đỏ) — 2 cột.
- **Tone Must Avoid** (badge đỏ).
- Giữ nguyên các section hiện có.

**4. `src/components/admin/pack-detail/OverviewTab.tsx`**
- `preferredTerms` count: tính `Object.values(preferred_terms).flat().length` thay vì `Object.keys` (hiện chỉ đếm 2 = vi+en thay vì ~40).

### Không đổi
- Schema DB, hooks, types.
- Layout, routes, các tabs khác (Profiles, Glossary, Personas) — đã hoạt động đúng.

### Kết quả mong đợi
Tab Brand Voice sẽ hiện đầy đủ industry definition + 9 subsectors + 8 dos + 8 donts + 9 must-avoid. Tab Rules sẽ hiện text của 15 compliance + 13 claims. Tab Terminology sẽ hiện 40 preferred terms (vi+en) + risk weights + auto-block conditions.

