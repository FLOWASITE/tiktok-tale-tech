

# Cai thien card noi dung da kenh - dat muc hoan hao

## Phan tich hien trang (tu screenshot)

Sau cac lan cai thien truoc, card da kha tot nhung con mot so van de:

1. **Content preview van hien truc tiep** tren card (dong italic), gay clutter - du da co tooltip
2. **Thumbnail nho** (40-48px) o goc tren phai, chua tao duoc visual impact
3. **Qua nhieu badge nho** xep sat nhau, kho doc - goal, deadline, critique, image count, file count
4. **Footer qua dong**: Creator, brand color, brand name, time, update time chen chuc
5. **Tags section** kho doc voi max-width 60px bi truncate
6. **Channel icons scale 110% khi hover** lam layout bi giat
7. **Progress bar qua mong** (h-1), kho nhin

## Cac thay doi

### File: `src/components/MultiChannelCard.tsx`

#### 1. Cai thien thumbnail - hien lon hon khi co anh
- Khi co thumbnail: hien anh lon hon (w-14 h-14, ~56px) voi rounded-lg va subtle shadow
- Them gradient overlay nhe de anh khong lam roi text

#### 2. Bo content preview khoi card body
- Hien tai dong 270-283 van hien text italic truc tiep tren card
- Xoa hien thi truc tiep, chi giu tooltip khi hover vao title
- Giam clutter dang ke

#### 3. Gom badge thanh 2 hang ro rang
- Hang 1 (tren): Status + Priority (da co)
- Hang 2 (duoi): Goal + Deadline + Critique score
- Tach image count va file count sang phan channel header

#### 4. Cai thien channel section
- Them header nho "Kenh" voi image/file count badge ngay ben canh
- Bo hieu ung scale-110 khi hover (gay layout shift), thay bang opacity/brightness change
- Tang padding channel icons mot chut cho de bam tren mobile

#### 5. Don dep footer
- Gom Creator + brand name + time thanh 1 hang gon
- Bo hien thi `primary_color` dot (it gia tri tren card)
- Bo `updateTimeAgo` (it gia tri, chi giu created time)

#### 6. Cai thien progress bar
- Tang tu h-1 len h-1.5 de de nhin hon
- Them label text nho ben canh (vd: "3/5 kenh")

#### 7. Micro-interactions tinh te hon
- Title: underline khi hover thay vi doi mau
- Action buttons: smooth reveal tu phai sang trai
- Card shadow: subtle hon, khong nhay dot ngot

### Chi tiet ky thuat

| Thay doi | Dong | Mo ta |
|----------|------|-------|
| Bo content preview inline | 269-283 | Xoa block hien text, chuyen tooltip len title |
| Thumbnail lon hon | 248-256 | Tang w-14 h-14, them shadow-sm |
| Gom badges | 286-343 | Sap xep lai 2 hang, tach counts |
| Channel hover | 365-370 | Bo scale-110, them brightness transition |
| Footer don gian | 426-451 | Gom 1 hang, bo primary_color dot, bo updateTime |
| Progress bar | 346-353 | Tang h-1.5, them label |
| Card hover | 189-194 | Giam translate-y tu -1 thanh -0.5, shadow nhe hon |

### Khong thay doi
- Logic data, database, backend
- Cac component khac
- Chuc nang actions (xem, xoa, len lich)
