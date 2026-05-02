## Vấn đề
GSC chỉ cho submit sitemap URL trên `https://flowa.one/...`. Hiện tại sitemap động (có blog posts từ DB) nằm ở edge function URL `rllyipiyuptkibqinotz.supabase.co` → không submit được.

## Giải pháp đề xuất: Gộp sitemap động trực tiếp vào `/sitemap.xml`

**Lưu ý kỹ thuật quan trọng:** Lovable hosting là static SPA, **không hỗ trợ server-side rewrite/proxy** (`_redirects`, `vercel.json`, `netlify.toml` đều không hoạt động). Vì vậy không thể tạo route `/sitemap-dynamic.xml` "trỏ về" Supabase từ phía hosting.

3 cách khả thi (sắp xếp theo độ tốt nhất):

### Cách A — Khuyến nghị: Dùng sitemap index + chấp nhận 1 file static
- Giữ `public/sitemap.xml` làm **sitemap index**, list 2 sub-sitemap:
  - `https://flowa.one/sitemap-static.xml` (file static cho landing pages)
  - `https://rllyipiyuptkibqinotz.supabase.co/functions/v1/generate-sitemap` (dynamic blog từ DB)
- **Vấn đề:** sub-sitemap thứ 2 vẫn cross-domain → Google **vẫn từ chối** trong sitemap index nếu khác domain với property. ❌ Loại.

### Cách B — Khuyến nghị thực sự: HTML redirect file
- Tạo `public/sitemap-dynamic.xml` thực chất là file HTML với `<meta http-equiv="refresh">` redirect sang Supabase URL.
- **Vấn đề:** Googlebot khi fetch sitemap kỳ vọng `Content-Type: application/xml`, không follow meta-refresh → coi là invalid sitemap. ❌ Loại.

### Cách C — Giải pháp đúng: Build-time generate full sitemap.xml
Đây là cách duy nhất hoạt động với static hosting + GSC same-domain requirement.

**Plan:**
1. **Tạo Vite plugin** `vite-plugin-sitemap.ts` chạy lúc `npm run build`:
   - Fetch danh sách blog posts published từ Supabase REST API (dùng anon key, đọc public posts)
   - Merge với static URLs (Landing/Pricing/About/Blog/...) và legacy slugs
   - Generate `dist/sitemap.xml` đầy đủ với hreflang + image sitemap entries
2. **Xoá file static `public/sitemap.xml`** (sẽ bị plugin overwrite mỗi build) — hoặc giữ làm fallback nếu build fail
3. **Cập nhật `public/robots.txt`**: chỉ giữ `Sitemap: https://flowa.one/sitemap.xml`, bỏ dòng Supabase URL
4. **Edge function `generate-sitemap` vẫn giữ** làm backup endpoint cho bot/dev tools, nhưng không còn là sitemap chính
5. **Auto-rebuild khi có blog mới:** vì sitemap chỉ regenerate lúc build, blog post mới publish sẽ xuất hiện trong sitemap khi user push code lần kế. Để giải quyết:
   - Option C1 (đơn giản): chấp nhận delay, ping IndexNow/Google khi publish blog (đã có sẵn?)
   - Option C2 (advanced): tạo GitHub Action chạy daily để rebuild + redeploy → phức tạp, bỏ qua giai đoạn này

**Khuyến nghị:** Đi với **C + C1**. Mỗi lần Lovable build (Lovable auto-build khi có commit), sitemap được regenerate. Đủ tốt cho stage hiện tại (blog volume thấp).

## Việc cần làm

1. Tạo `scripts/generate-sitemap.ts` (Node script, chạy lúc build):
   - Fetch `blog_posts` từ Supabase REST: `GET /rest/v1/blog_posts?select=slug,title,cover_image,updated_at,published_at&is_public=eq.true&status=eq.published`
   - Render full XML giống logic edge function hiện tại (static + legacy + DB posts + image sitemap + hreflang x-default)
   - Ghi ra `public/sitemap.xml` (overwrite file hiện có)
2. Sửa `package.json` script:
   - `"build": "tsx scripts/generate-sitemap.ts && vite build"`
   - `"prebuild": "tsx scripts/generate-sitemap.ts"` (alternative để chạy tự động)
3. Update `public/robots.txt`: bỏ dòng Supabase sitemap URL, chỉ giữ `Sitemap: https://flowa.one/sitemap.xml`
4. Verify: build local, check `dist/sitemap.xml` có blog posts từ DB chưa
5. Sau khi user approve & deploy, GSC submit `https://flowa.one/sitemap.xml` (đã có sẵn ở Sitemaps tab) → "Resubmit" để Google fetch lại

## Kết quả
- GSC chỉ thấy 1 sitemap duy nhất: `https://flowa.one/sitemap.xml`
- Sitemap đó **luôn cập nhật mỗi lần build** với blog posts mới nhất từ DB
- Không còn cross-domain issue
- Edge function `generate-sitemap` vẫn live làm endpoint backup (developer reference)
