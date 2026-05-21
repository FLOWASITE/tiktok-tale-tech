# Plan — Cải tiến UI Provider Manager (DeepSeek/DashScope/9Router/OpenRouter)

## Vấn đề
`AIProviderManager` chỉ check `ai_provider_configs` (per-org override) khi quyết định hiện badge "Active" hay nút "Cấu hình". Với những provider đã có **env-level secret** (vd `DEEPSEEK_API_KEY`, `DASHSCOPE_API_KEY`, `NINE_ROUTER_API_KEY`, `OPENROUTER_API_KEY`), edge function chạy tốt nhưng UI vẫn hiển thị "Not configured" + nút "Cấu hình" gây hiểu lầm rằng phải nhập key mới dùng được.

## Thay đổi

### 1. Khai báo env-secret cho provider
File: `src/hooks/useAIConfig.ts` (mảng `AI_PROVIDERS`)
- Mỗi entry đã có `secretName` (vd `DEEPSEEK_API_KEY`). Giữ nguyên, đảm bảo các provider có path direct đều khai báo: `deepseek`, `dashscope`, `ninerouter`, `openrouter`, `kie`, `poyo`, `geminigen`.

### 2. Tạo edge function `check-provider-secrets`
File mới: `supabase/functions/check-provider-secrets/index.ts`
- Trả về `{ [secretName: string]: boolean }` cho danh sách secret names client gửi lên (chỉ trả `Deno.env.get(name) ? true : false`, không trả giá trị).
- `verify_jwt = true`, chỉ cho admin gọi (check role qua `has_role(uid,'admin')`).
- Đăng ký trong `supabase/config.toml` nếu cần (default verify_jwt=true là OK, không cần block).

### 3. Hook `useProviderEnvSecrets`
File mới: `src/hooks/useProviderEnvSecrets.ts`
- TanStack Query gọi `check-provider-secrets` với list secret names từ `AI_PROVIDERS`.
- Cache 5 phút, returns `{ [providerType]: boolean }`.

### 4. UI #1 — Badge "Đã cấu hình qua secret"
File: `src/components/admin/ai/AIProviderManager.tsx`
- Import hook mới, gọi `const { data: envSecrets } = useProviderEnvSecrets()`.
- Trong vòng lặp `AI_PROVIDERS.map`, thêm biến:
  ```ts
  const hasEnvSecret = !!envSecrets?.[provider.type];
  ```
- Cập nhật phần render badge (lines 316-330):
  - Nếu `!configured && hasEnvSecret` → hiện badge mới `<Badge variant="default" className="bg-emerald-600">✓ Env secret</Badge>` (icon `KeyRound`).
- Cập nhật phần render CTA (lines 399-413):
  - Khi `!configured && hasEnvSecret`: thay vì nút "Cấu hình" full-width, hiện:
    ```
    <p className="text-xs text-muted-foreground">
      Đã có {secretName} ở env. Edge function dùng key này tự động.
    </p>
    <Button variant="ghost" size="sm">Override cho org này…</Button>
    ```
  - Click "Override…" mở dialog như cũ.

### 5. UI #2 — Helper text trong dialog
File: `src/components/admin/ai/AIProviderManager.tsx` (block dialog ~line 447)
- Bên trên input API key, khi `hasEnvSecret === true` và chưa có `configured`, render alert nhẹ:
  ```
  <div className="rounded-md bg-muted/40 border border-border/50 px-3 py-2 text-xs text-muted-foreground">
    <Info className="inline w-3 h-3 mr-1" />
    Hệ thống đã có <code>{secretName}</code> ở env. Chỉ nhập key ở đây nếu muốn
    override riêng cho organization này (vd: tách billing).
  </div>
  ```

## Không thay đổi
- Logic `ai-provider.ts` (`apiKeyOverride || Deno.env.get(...)`) đã đúng — giữ nguyên.
- Schema DB, RLS, các tab Functions/Channels/Agents.
- Không động đến DashScope 400 runtime error (issue riêng).

## Acceptance
1. `/admin/ai` → tab Providers: card DeepSeek/DashScope/9Router hiện badge xanh "✓ Env secret" (không còn "Not configured").
2. Click "Override…" → dialog có dòng helper text giải thích.
3. Nếu xóa env secret (hoặc env không có), card quay về trạng thái "Not configured" + nút "Cấu hình" như cũ.
4. Edge function `check-provider-secrets` chỉ trả boolean, không expose key.
