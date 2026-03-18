

# Kế hoạch tách source Landing Page

## Hiện trạng

Hiện tại, toàn bộ code Landing (trang giới thiệu sản phẩm) và App (ứng dụng chính) nằm chung trong **một codebase duy nhất**. Việc phân biệt được xử lý runtime qua `useDomainRouting` — kiểm tra hostname để quyết định render Landing routes hay App routes.

**Vấn đề:**
- File `App.tsx` (590+ dòng) chứa cả ~10 landing routes và ~40 app routes
- Bundle size: user truy cập `flowa.one` vẫn tải toàn bộ code của app (Admin, Dashboard, Campaigns...)
- 18 components trong `src/components/landing/` trộn lẫn với ~100+ components của app
- 8 landing pages (`Landing`, `About`, `Blog`, `Contact`, `Careers`, `Pricing`, `Terms`, `Privacy`) nằm cùng thư mục với 40+ app pages

## Phương án đề xuất: Tách logic trong cùng codebase

> Vì Lovable chỉ hỗ trợ 1 project = 1 repo, ta sẽ **tách cấu trúc thư mục** và **lazy-load** để giảm bundle, không tách thành 2 repo riêng.

### 1. Tổ chức lại thư mục

```text
src/
├── landing/                    ← MỚI: Gom toàn bộ landing
│   ├── pages/
│   │   ├── Landing.tsx
│   │   ├── About.tsx
│   │   ├── Blog.tsx
│   │   ├── BlogPost.tsx
│   │   ├── Careers.tsx
│   │   ├── Contact.tsx
│   │   ├── Pricing.tsx
│   │   ├── TermsOfService.tsx
│   │   └── PrivacyPolicy.tsx
│   ├── components/             ← Di chuyển từ src/components/landing/
│   │   ├── effects/
│   │   ├── HeroSection.tsx
│   │   ├── LandingNav.tsx
│   │   ├── FooterSection.tsx
│   │   └── ... (18 files)
│   └── routes.tsx              ← Landing route definitions
├── app/                        ← MỚI: Gom app routes
│   └── routes.tsx              ← App route definitions
├── pages/                      ← Giữ lại cho app pages
├── components/                 ← Giữ lại cho app components
└── App.tsx                     ← Đơn giản hóa, import 2 route modules
```

### 2. Lazy loading theo domain

```tsx
// src/landing/routes.tsx
const Landing = lazy(() => import('./pages/Landing'));
const About = lazy(() => import('./pages/About'));
// ...

export function LandingRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<About />} />
      ...
    </Routes>
  );
}
```

```tsx
// App.tsx — đơn giản hóa
if (isLandingDomain) return <LandingRoutes />;
return <AppRoutes />;
```

### 3. Tách shared resources

- `src/shared/` cho các thành phần dùng chung: `SEOHead`, `ThemeProvider`, `LanguageSwitcher`, i18n config
- Landing components chỉ import từ `@/shared` và `@/landing`, không import từ `@/components` hay `@/pages`

## File thay đổi

| Hành động | Files |
|---|---|
| **Tạo mới** | `src/landing/routes.tsx`, `src/app/routes.tsx` |
| **Di chuyển** | 18 files `src/components/landing/*` → `src/landing/components/*` |
| **Di chuyển** | 8 landing pages → `src/landing/pages/*` |
| **Cập nhật** | `src/App.tsx` — import 2 route modules, giảm từ 590 → ~50 dòng |
| **Cập nhật** | Tất cả import paths trong landing components (đổi `@/components/landing` → `@/landing/components`) |
| **Tạo mới** | `src/shared/` cho SEOHead, i18n, theme nếu cần |

## Lợi ích

- **Bundle nhỏ hơn**: User landing page không tải code app (lazy load)
- **Dễ maintain**: Landing team và App team làm việc độc lập
- **App.tsx gọn**: Từ 590 dòng → ~50 dòng
- **Chuẩn bị tách repo**: Nếu sau này muốn tách thành 2 project riêng, cấu trúc đã sẵn sàng

