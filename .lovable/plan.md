

# Cai tien Quick Model Dropdown - Sap xep theo Provider

## Van de hien tai
Dropdown chon nhanh model trong FunctionCard hien thi 5 preset (Mac dinh, Tiet kiem, Nhanh, Can bang, Chat luong) theo dang danh sach dai, gay roi mat. Ngoai ra, chua co truy cap nhanh den model cua KIE.ai va PoYo.ai tu dropdown nay - user phai vao "Cau hinh chi tiet" moi chon duoc.

## Giai phap
Tai cau truc dropdown thanh cac nhom theo Provider, gon gon hon, va uu tien hien thi provider models (KIE, PoYo) truoc presets Lovable AI.

### Thay doi trong `src/components/admin/ai/FunctionCard.tsx`:

1. **Gom presets Lovable AI thanh compact hon**:
   - Giam so luong preset hien thi truc tiep: chi giu 3 muc chinh: Mac dinh, Nhanh (Flash), Chat luong (Pro)
   - Them submenu "Xem them..." cho Tiet kiem va Can bang
   - Hoac gom thanh 1 section nho voi label "Lovable AI" va hien thi compact (1 dong moi preset thay vi 2-3 dong)

2. **Them section Provider models vao dropdown**:
   - Them nhom "KIE.ai" voi cac model pho bien: `flux-kontext-pro`, `gpt-image-1`
   - Them nhom "PoYo.ai" voi cac model: `poyo/gpt-4o-image`, `poyo/z-image`, `poyo/flux-2-pro`
   - Chi hien thi cho image functions (tuong tu nhu da filter trong ModelSelector)
   - Moi nhom co header rieng voi mau sac tuong ung (violet cho KIE, teal cho PoYo)

3. **Compact hoa giao dien**:
   - Moi preset/model chi chiem 1 dong: Icon + Ten + Model ID nho
   - Bo phan "useCase" va "speed/cost" chi hien khi hover (tooltip)
   - Tong chieu cao dropdown giam dang ke

4. **Thu tu hien thi trong dropdown**:
   - Mac dinh (luon o tren cung)
   - Separator
   - Lovable AI presets (compact, 3 muc chinh)
   - Separator
   - KIE.ai models (chi voi image functions)
   - PoYo.ai models (chi voi image functions)
   - Separator  
   - "Cau hinh chi tiet..." (link mo ModelSelector dialog)

### Ket qua
- Dropdown gon hon, de doc hon
- Truy cap nhanh den KIE/PoYo models ngay tu function card ma khong can mo dialog
- Provider models duoc uu tien hien thi ro rang

### Chi tiet ky thuat

- Import `isKieModel`, `isPoyoModel`, `getModelInfo`, `MODELS_BY_TYPE` tu `useAIConfig`
- Them IMAGE_PROVIDER_PRESETS cho KIE va PoYo models voi ten ngan gon
- Compact hoa `DropdownMenuItem` cho QUICK_PRESETS: bo `useCase` text, chi hien model name + speed icon tren 1 dong
- Them `DropdownMenuLabel` cho moi nhom provider
- Logic: khi chon model KIE/PoYo, goi `onQuickModelChange(modelId)` tuong tu preset
- Ap dung cho ca text va image functions (hien tai chi text functions co dropdown, can mo rong cho image)

