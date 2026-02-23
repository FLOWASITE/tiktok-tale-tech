# Hien thi thong tin Model AI da su dung va canh bao Fallback

## Van de hien tai

1. Backend **da track** model nao duoc su dung (`modelUsed`) va tra ve trong response, nhung **frontend khong hien thi** thong tin nay cho nguoi dung
2. Khi PoYo.ai/KIE.ai that bai, he thong **tu dong fallback** sang Lovable AI ma **khong thong bao** cho admin biet
3. Khong co cach nao de admin biet model da cau hinh co dang duoc su dung dung hay khong

## Giai phap

&nbsp;

### 1. Toast canh bao khi Fallback xay ra

Khi model da cau hinh bi loi va he thong phai dung model khac (fallback), hien thi toast warning cho nguoi dung biet:

- Trong `useSocialImageGeneration.ts` va `useAutoImageGeneration.ts`: Kiem tra response `modelUsed` co chua "(fallback from ...)" khong
- Neu co fallback: hien thi toast warning voi noi dung cu the, vi du: "Model poyo/nano-banana-2 bi loi, da dung google/gemini-2.5-flash-image thay the"

### 2. Tao component ModelUsedBadge

Component nho hien thi thong tin model da su dung:

- Mau xanh la (green) khi model dung nhu cau hinh
- Mau vang (yellow) khi da dung fallback
- Hien thi icon provider (PoYo, KIE, Lovable)

## Chi tiet ky thuat

### Files thay doi


| File                                                       | Mo ta                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| `src/components/ui/ModelUsedBadge.tsx`                     | **Moi** - Component badge hien thi model/provider                  |
| `src/hooks/useSocialImageGeneration.ts`                    | Them logic doc `modelUsed` tu response, toast warning khi fallback |
| `src/hooks/useAutoImageGeneration.ts`                      | Tuong tu - doc `modelUsed`, toast warning                          |
| `src/components/image-generation/SimpleImageGenerator.tsx` | Hien thi `ModelUsedBadge` sau khi tao anh xong                     |


### Logic phat hien Fallback

```text
Response tu backend:
- modelUsed = "poyo/nano-banana-2"          -> OK, dung model cau hinh
- modelUsed = "google/gemini-2.5-flash-image (fallback from poyo/nano-banana-2)" -> FALLBACK!

Frontend kiem tra:
  if (modelUsed.includes('(fallback from')) {
    -> Hien thi toast.warning(...)
    -> Badge mau vang
  } else {
    -> Badge mau xanh la
  }
```

### ModelUsedBadge component

- Props: `modelUsed: string`, `className?: string`
- Parse ten model va trang thai fallback
- Hien thi icon provider tuong ung (PoYo = Teal, KIE = Violet, Lovable = Blue)
- Size nho, hien thi ngay duoi anh da tao

### Thay doi toi thieu, khong anh huong backend

- Khong can sua backend - backend da tra ve `modelUsed` trong response
- Chi can frontend doc va hien thi thong tin nay
- Toast warning giup admin phat hien ngay khi model khong hoat dong dung