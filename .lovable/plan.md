
# Dat OpenRouter lam Provider Mac dinh cho Text/Content Functions

## Muc tieu
Tuong tu nhu da lam voi PoYo.ai cho image functions, thay doi UI de OpenRouter luon duoc hien thi noi bat nhat cho cac text/content functions, thay vi Lovable AI.

## Cac thay doi cu the

### 1. `src/components/admin/ai/FunctionCard.tsx`

**a) Them OPENROUTER_MODELS array** cho text functions (tuong tu POYO_MODELS cho image):
- `deepseek/deepseek-v3.2` - DeepSeek V3.2 (gia re, chat luong cao)
- `minimax/minimax-m2.5` - MiniMax M2.5 (#1 weekly)
- `moonshotai/kimi-k2.5` - Kimi K2.5
- `anthropic/claude-sonnet-4.6` - Claude Sonnet 4.6
- `openai/gpt-5.2` - GPT-5.2
- `x-ai/grok-4.1-fast` - Grok 4.1 Fast

**b) Cap nhat text function dropdown** - them section OpenRouter voi mau orange TRUOC section Lovable AI:
- Thu tu hien thi: OpenRouter models (mau orange) -> Lovable AI presets (mac dinh, nhanh, chat luong) -> Extra presets -> Cau hinh chi tiet

**c) Thay doi QUICK_PRESETS** - doi label "Mac dinh" useCase tu "Phu hop cho hau het tac vu" thanh "OpenRouter / Lovable AI"

### 2. `src/components/admin/ai/ModelSelector.tsx`

**a) Hien thi OpenRouter tab cho text functions** - Hien tai OpenRouter tab chi hien khi `hasOpenRouter && functionType === 'text'`, nhung no dung SAU Lovable AI. Can doi thu tu:
- Tabs: Tat ca | OpenRouter | Lovable AI (thay vi Tat ca | Lovable AI | OpenRouter)

**b) Di chuyen OpenRouter models section len TRUOC Lovable AI section** trong danh sach model:
- Thu tu render: Default -> OpenRouter models (grouped by provider) -> Lovable AI models
- (Hien tai: Default -> Lovable AI -> OpenRouter)

### 3. `src/components/admin/ai/AIFunctionConfig.tsx`

**a) Them OPENROUTER_QUICK_PRESETS** cho text functions:
- `or_deepseek`: DeepSeek V3.2 - "Gia re, hieu suat cao"
- `or_minimax`: MiniMax M2.5 - "#1 weekly ranking"

**b) Cap nhat QuickSelectButton render order** cho text functions:
1. Mac dinh (giu nguyen)
2. DeepSeek V3.2 (OpenRouter) - moi
3. MiniMax M2.5 (OpenRouter) - moi
4. Nhanh nhat (Lovable AI - Gemini Flash Lite)
5. Chat luong cao (Lovable AI - Gemini 3 Pro)

**c) Cap nhat getCurrentQuickPreset()** de nhan dien cac preset OpenRouter moi

**d) Cap nhat "Chon model khac..." description** tu "Lovable AI + OpenRouter models" thanh "OpenRouter + Lovable AI models"

### 4. `src/types/aiProvider.ts`

- `DEFAULT_AI_CONFIG.selectedProvider` da la `'poyo'` (khong can doi)
- Kiem tra xem co can thay doi gi khong (co the khong can)

### Ket qua
- Text function dropdown hien thi OpenRouter models truoc Lovable AI
- ModelSelector dialog hien thi tab va section OpenRouter truoc Lovable AI
- Quick select trong edit dialog co them DeepSeek V3.2 va MiniMax M2.5
- Toan bo UI nhat quan: OpenRouter la provider chinh cho text, PoYo la provider chinh cho image
