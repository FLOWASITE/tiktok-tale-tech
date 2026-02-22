

# Them bo loc Provider trong Model Selector

## Hien trang
- Provider filter chi co 3 gia tri: `all`, `lovable`, `openrouter`
- Khi function type la `image`, KIE va PoYo hien thi rieng section nhung khong the loc rieng theo provider
- Khong co tab cho KIE.ai va PoYo.ai trong thanh provider tabs

## Giai phap
Mo rong `ProviderFilter` type va them tabs cho KIE.ai, PoYo.ai de user co the loc model theo tung provider.

## Chi tiet ky thuat

### File: `src/components/admin/ai/ModelSelector.tsx`

1. **Mo rong ProviderFilter type**:
   - Tu: `'all' | 'lovable' | 'openrouter'`
   - Thanh: `'all' | 'lovable' | 'kie' | 'poyo' | 'openrouter'`

2. **Them Provider Tabs dong**:
   - Luon hien thanh provider tabs (khong chi khi co OpenRouter)
   - Voi image functions: hien tabs All, Lovable AI, KIE.ai, PoYo.ai
   - Voi text functions co OpenRouter: hien tabs All, Lovable AI, OpenRouter
   - Voi text functions khong co OpenRouter: an thanh tabs (chi co Lovable)

3. **Cap nhat filter logic**:
   - `providerFilter === 'kie'`: chi hien KIE models, an Lovable va PoYo va OpenRouter
   - `providerFilter === 'poyo'`: chi hien PoYo models, an Lovable va KIE va OpenRouter
   - `providerFilter === 'lovable'`: chi hien Lovable models (khong KIE, khong PoYo)

4. **Cap nhat ProviderTab component**:
   - Mo rong prop `provider` them `'kie' | 'poyo'`
   - Them mau: KIE = violet, PoYo = teal (giong section header hien tai)

### Ket qua
- User co the nhanh chong loc chi xem models cua mot provider cu the
- Giao dien nhat quan voi mau sac da co cua tung provider section

