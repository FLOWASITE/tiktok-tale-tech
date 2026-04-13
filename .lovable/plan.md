

## Fix: "Kết nối ngay" phải vào thẳng tab Kết nối

### Vấn đề
`BrandView.tsx` dùng `<Tabs defaultValue="overview">` cứng — không đọc query param `?tab=connections` từ URL → click "Kết nối ngay" trên BrandCard luôn mở tab Overview.

### Giải pháp
Sửa `src/pages/BrandView.tsx`:

1. Đọc `?tab` từ URL bằng `useSearchParams`
2. Dùng `value` + `onValueChange` thay vì `defaultValue` để controlled tab
3. Khi URL có `?tab=connections` → mở thẳng tab Kết nối

```text
// Trước
<Tabs defaultValue="overview">

// Sau  
const [searchParams] = useSearchParams();
const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
<Tabs value={activeTab} onValueChange={setActiveTab}>
```

### File cần sửa
- `src/pages/BrandView.tsx` — import `useSearchParams`, thêm state `activeTab`, đổi `Tabs` sang controlled mode

