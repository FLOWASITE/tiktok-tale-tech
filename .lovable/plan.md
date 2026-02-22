
# Dat PoYo.ai lam Provider Mac dinh cho Image Functions

## Muc tieu
Thay doi UI de PoYo.ai luon duoc hien thi noi bat nhat, duoc xem nhu provider mac dinh thay vi Lovable AI cho cac image functions.

## Cac thay doi cu the

### 1. `src/components/admin/ai/FunctionCard.tsx`

**a) IMAGE_PRESETS** - Thay doi preset mac dinh tu Gemini sang PoYo:
- Preset "Mac dinh" (model: null) -> doi useCase tu "Gemini Flash Image" thanh "PoYo Nano Banana Pro"
- Them preset PoYo Nano Banana Pro lam preset dau tien (truoc Gemini 3 Image)
- Di chuyen section PoYo.ai len TRUOC KIE.ai trong dropdown (ca compact va expanded view)

**b) Thu tu hien thi trong dropdown (image functions)**:
1. Mac dinh
2. PoYo.ai models (di chuyen len truoc, mau teal)
3. KIE.ai models (xuong sau)
4. Lovable AI presets (cuoi)
5. Cau hinh chi tiet...

**c) Expanded view** - Di chuyen PoYo models len truoc KIE trong More dropdown

### 2. `src/components/admin/ai/ModelSelector.tsx`

**a) Thu tu hien thi sections** - Doi thu tu render:
1. Default option (giu nguyen)
2. PoYo.ai Models (di chuyen len truoc Lovable AI)
3. KIE.ai Models
4. Lovable AI Models (di chuyen xuong sau)
5. OpenRouter (giu nguyen)

**b) Provider Tabs** - Doi thu tu tabs:
- Tat ca | PoYo.ai | KIE.ai | Lovable AI | OpenRouter

### 3. `src/components/admin/ai/AIFunctionConfig.tsx`

**a) IMAGE_QUICK_PRESETS** - Them preset PoYo Nano Banana lam lua chon dau tien:
- Them entry `poyo_nano`: label "Nano Banana Pro", model "poyo/nano-banana-2"
- Di chuyen len vi tri dau tien (truoc gemini_flash)
- Cap nhat `getCurrentQuickPreset()` de nhan dien preset moi

**b) Thu tu hien thi QuickSelectButton**:
1. Nano Banana Pro (PoYo) - moi
2. Gemini Flash Image (Lovable)
3. Flux Kontext Pro (KIE)
4. Gemini 3 Image (Lovable)

### 4. `src/types/aiProvider.ts`

- Doi `DEFAULT_AI_CONFIG.selectedProvider` tu `'gemini'` thanh `'poyo'`

### Ket qua
- PoYo.ai luon hien thi dau tien trong moi dropdown va dialog chon model
- Preset mac dinh cho image functions huong den PoYo
- ModelSelector hien thi section PoYo.ai truoc Lovable AI
- Quick select buttons uu tien PoYo Nano Banana Pro

### Chi tiet ky thuat

**FunctionCard.tsx:**
- Doi thu tu render: POYO_MODELS block len truoc KIE_MODELS block (ca compact dropdown va expanded More dropdown)
- IMAGE_PRESETS them entry moi cho poyo/nano-banana-2 voi icon Cat, color teal

**ModelSelector.tsx:**
- Di chuyen block JSX `{filteredModels.poyo.length > 0 && ...}` len truoc `{filteredModels.lovable.length > 0 && ...}`
- Doi thu tu ProviderTab: poyo truoc lovable

**AIFunctionConfig.tsx:**
- Them key `poyo_nano` vao IMAGE_QUICK_PRESETS
- Them case `'image_poyo_nano'` vao getCurrentQuickPreset
- Render QuickSelectButton cho poyo_nano dau tien
