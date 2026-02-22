

# Cai thien dang List cho Quan ly noi dung da kenh

## Phan tich hien trang

File `src/components/MultiChannelListView.tsx` (666 dong) hien tai la mot table co cac cot:
- Checkbox, Noi dung (title + topic + brand + tags), Uu tien, Kenh phan phoi, Tien do, Nguoi tao, Thoi gian, Thao tac

**Van de hien tai:**

1. **Cot "Noi dung" qua chat**: Goal icon + title + topic + brand badge + tags deu nen trong 1 cell, kho doc
2. **Channel badges qua nho** (text-[10px]) va kho phan biet trang thai
3. **Thieu thumbnail anh**: Khong hien anh nhu card view da co
4. **Thieu critique score va deadline badge noi bat**: Deadline nam o cot "Thoi gian" de bi bo qua
5. **Empty state don gian**: Chi co icon + text, chua co CTA ro rang
6. **Row hover chua noi bat**: Chi doi mau nen nhe, chua co visual feedback tot
7. **Thieu ky hieu anh/khong anh** theo tung channel nhu da lam cho card view

## Cac thay doi

### File: `src/components/MultiChannelListView.tsx`

#### 1. Them thumbnail anh vao cot "Noi dung"
- Neu content co `channel_images`, hien anh thu nho 32x32px thay cho Goal icon (hien dang 36x36 w-9 h-9)
- Neu khong co anh, giu Goal icon nhu cu
- Tao visual giong card view

#### 2. Them ky hieu anh/khong anh cho tung channel badge
- Tuong tu card view: them dot nho mau violet ben canh channel badge neu kenh do co anh trong `channel_images`
- Cap nhat tooltip hien thi trang thai anh

#### 3. Cai thien cot "Noi dung" - visual hierarchy
- Title tang len `text-sm font-semibold` (hien la `font-medium text-sm`)
- Them underline khi hover giong card view
- Topic hien thi gon hon voi max-width
- Brand badge va tags: tang kich thuoc text tu `text-[10px]` len `text-xs`

#### 4. Them cot critique score (hoac gom vao cot tien do)
- Neu co `critique_score`: hien badge diem nho ben canh progress bar
- Mau sac theo muc: xanh (>=80), vang (>=60), do (<60)

#### 5. Cai thien deadline - to mau noi bat hon
- Deadline qua han: them badge do nho "Tre han" ben canh
- Deadline gan (trong 2 ngay): them badge vang "Sap den han"

#### 6. Cai thien row hover va selection
- Row hover: them left border indicator mau (giong card view co indicator line)
- Selected row: them left border primary va background primary/10

#### 7. Cai thien empty state
- Them animation fade-in
- Them nut CTA "Tao noi dung moi" trong empty state
- Icon lon hon va dep hon

#### 8. Them stripe pattern cho rows
- Alternate row colors (even/odd) de de doc hon khi nhieu dong

### Chi tiet ky thuat

| Thay doi | Dong | Mo ta |
|----------|------|-------|
| Thumbnail anh | 389-434 | Them img 32x32 thay goal icon khi co anh |
| Channel image dots | 451-473 | Them dot violet cho kenh co anh |
| Title styling | 410-415 | Tang font-semibold, them hover:underline |
| Critique score | 476-507 | Them badge diem ben canh progress |
| Deadline badges | 573-592 | Them badge "Tre han" / "Sap den han" |
| Row hover indicator | 376-379 | Them border-l-2 khi hover/selected |
| Empty state | 647-658 | Them animation, CTA button, icon lon hon |
| Stripe rows | 376-379 | Them even:bg-muted/20 |

### Khong thay doi
- Logic sort, filter, data
- Database, backend
- Cac component khac
- Card view (MultiChannelCard.tsx)

