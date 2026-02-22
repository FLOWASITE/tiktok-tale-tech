

# Cai thien card noi dung da kenh

## Hien trang

Card hien tai da co nhieu thong tin nhung can cai thien ve:
- **Visual hierarchy**: Cac badge va thong tin qua nho, kho doc
- **Thumbnail anh**: Chi hien dot nho cho kenh co anh, khong hien anh thu nho
- **Thieu thong tin quan trong**: Khong hien deadline, priority, diem danh gia (critique_score)
- **Channel icons bi cat**: Chi hien 4 kenh, phan con lai bi an "+N"
- **Action buttons**: Luon hien, gay roi mat

## Cac thay doi

### File: `src/components/MultiChannelCard.tsx`

#### 1. Them thumbnail anh dai dien
- Neu noi dung co `channel_images`, hien anh thu nho (48x48px) cua kenh dau tien co anh o goc tren ben phai card
- Tao visual appeal tot hon thay vi chi dung dot mau

#### 2. Hien thi deadline va priority
- Neu co `content.deadline`: hien badge nho voi icon CalendarClock va ngay deadline
- Neu deadline da qua: to mau do canh bao
- Neu co `content.priority`: hien badge priority (cao/trung binh/thap) ben canh status

#### 3. Hien thi diem danh gia (critique score)
- Neu co `content.critique_score`: hien thanh tien trinh nho hoac badge diem (vd: "85/100")
- Mau sac theo muc: xanh (>=80), vang (>=60), do (<60)

#### 4. Mo rong hien thi channel icons
- Tang gioi han tu 4 len 6 kenh hien thi truoc khi cat
- Hien thi channel icons lon hon mot chut de de nhin

#### 5. Cai thien visual hierarchy
- Status badge chuyen sang goc tren trai voi indicator line mau doc theo canh trai card (giong Kanban)
- Title tang kich thuoc font len mot bac
- Bo phan content preview italic vao tooltip thay vi hien truc tiep (giam clutter)

#### 6. Hover actions gon gang hon
- Chi hien nut "Xem" va icon actions khi hover
- Mac dinh chi hien nut "Xem" nho gon

### Chi tiet ky thuat

| Thay doi | Vi tri trong file | Mo ta |
|----------|-------------------|-------|
| Thumbnail anh | Dong 138-155 | Them `<img>` tu `channel_images` kenh dau tien |
| Deadline badge | Dong 207-222 | Them badge deadline voi logic qua han |
| Priority badge | Dong 173-188 | Them badge priority ben canh status |
| Critique score | Dong 207-222 | Them mini progress bar hoac badge diem |
| Channel limit | Dong 237 | Doi `slice(0, 4)` thanh `slice(0, 6)` |
| Status indicator line | Dong 149-155 | Them div mau doc canh trai card |

### Khong thay doi
- Logic data, database, backend
- Cac component khac
- Layout tong the trang multichannel

