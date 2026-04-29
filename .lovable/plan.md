## Vấn đề

Sau khi user authorize Google/Blogger thành công, callback redirect về `rllyipiyuptkibqinotz.lovableproject.com/auth/blogger/callback` — domain này **không tồn tại** (project dùng `app.flowa.one` / `*.lovable.app`), nên Chrome hiện "Project not found".

## Nguyên nhân

1. **`connect-social` (line 903)** khi tạo state cho Blogger KHÔNG pack `frontendOrigin` (origin của user) vào state — khác với Twitter/LinkedIn/Threads (line 510, 787) đã làm đúng.
2. **`blogger-oauth-callback` (line 15, 149, 153)** fallback bằng `supabaseUrl.replace('.supabase.co', '.lovableproject.com')` → ra domain sai (`rllyipiyuptkibqinotz.lovableproject.com` không tồn tại; đúng phải là `id-preview--<id>.lovable.app` hoặc `app.flowa.one`).

## Giải pháp

### 1. `supabase/functions/connect-social/index.ts` (line ~903)
Pack `frontendOrigin: requestOrigin` vào state cho Blogger (giống Twitter/Threads):

```ts
const state = btoa(JSON.stringify({ 
  brandTemplateId, organizationId, userId: user.id, 
  frontendOrigin: requestOrigin || null 
}));
```

### 2. `supabase/functions/blogger-oauth-callback/index.ts`
- Decode `frontendOrigin` từ state
- Resolve `frontendUrl` theo thứ tự ưu tiên: `stateData.frontendOrigin` → `Deno.env.get('FRONTEND_URL')` → fallback `https://app.flowa.one` (KHÔNG dùng `.lovableproject.com` vì không tồn tại)

```ts
const stateData = JSON.parse(atob(state));
const { brandTemplateId, organizationId, userId, frontendOrigin } = stateData;
// ...
const frontendUrl = frontendOrigin 
  || Deno.env.get('FRONTEND_URL') 
  || 'https://app.flowa.one';
```

Áp dụng cho cả success và error redirect path.

## Files thay đổi

- `supabase/functions/connect-social/index.ts` — thêm `frontendOrigin` vào blogger state (1 dòng)
- `supabase/functions/blogger-oauth-callback/index.ts` — đọc `frontendOrigin` từ state + sửa fallback URL (3 chỗ)

## Test

Sau deploy: Admin → Brand Connection → Connect Blogger → authorize Google → phải redirect về `app.flowa.one/auth/blogger/callback?success=true` (hoặc preview domain hiện tại của user) thay vì `lovableproject.com`.
