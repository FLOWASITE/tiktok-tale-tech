# Cai thien toan dien he thong tao anh AI

## Phan tich hien trang

&nbsp;

### 2. Van de ve do lien quan noi dung anh voi bai viet

- `contentSummary` gui len backend chi la `Topic: {topic}. {300 ky tu dau}` - qua ngan va khong capture duoc y chinh
- Backend `buildImagePrompt` nhan `contentSummary` nhu mot chuoi raw, khong co xu ly thong minh de rut trich keyword/concept chinh
- Khong co buoc "content analysis" truoc khi tao prompt - AI phai tu hieu noi dung tu text tho

### 3. Van de ve kieu anh (style)

- V3 Suggestion Engine chi dung scoring cung (config-based), khong phan tich noi dung thuc te
- Style duoc chon dua tren industry + role + goal, nhung KHONG xem xet noi dung cu the cua bai viet
- Vi du: Bai ve "top 5 cong nghe AI" va "cau chuyen khach hang" cung industry se cho cung style goi y

### 4. Van de UI/UX

- Form tao anh khong hien thi preview noi dung se duoc dung lam co so tao anh
- Khong co "content relevance hint" cho nguoi dung biet AI se tao anh lien quan gi
- Streaming grid khong hien thi prompt da dung, nguoi dung khong biet AI da hieu noi dung nhu the nao
- Khong co tinh nang "refine prompt" sau khi xem anh

## Giai phap

### Thay doi 1: Nang cap Content Summary - trich xuat thong minh hon (Frontend)

**File: `src/components/multichannel/SimpleImageGenerator.tsx**`

Thay doi ham `getContentSummary` de trich xuat thong tin tot hon:

- Lay topic, content_goal, content_role, content_angle
- Trich keyword chinh tu noi dung (dung regex don gian lay cac cum tu quan trong)
- Lay hook message lam "core message"
- Ket hop thanh summary co cau truc ro rang hon, dai hon (len 500 ky tu)

### Thay doi 2: Cai thien Prompt Builder - them Content Analysis section (Backend)

**File: `supabase/functions/_shared/image-prompt-builder.ts**`

Them section moi trong `buildImagePrompt`:

- `## CORE MESSAGE & KEYWORDS`: Trich xuat tu contentSummary cac keyword/concept chinh
- Di chuyen `contentSummary` vao section `## ARTICLE CONTENT CONTEXT` voi huong dan AI phai tao anh TRUC TIEP lien quan den noi dung, khong chi dung style chung chung
- Them chi dan cu the: "The image MUST visually represent the specific topic/concept mentioned in the content, not just a generic industry image"
- Tang trong so cua content relevance trong prompt (dat len truoc channel specs)

### Thay doi 3: Style Suggestion co xem xet noi dung (Frontend)

**File: `src/lib/imageSuggestionEngine.ts**`

Bo sung logic phan tich text trong `suggestImageStylesV3`:

- Them tham so `contentSummary` vao `SuggestionInputV3`
- Them keyword-based boost: Neu noi dung chua keywords ve "data/so lieu/top/chart" → boost flat_design/geometric
- Neu noi dung chua "cau chuyen/story/hanh trinh" → boost cinematic/photorealistic
- Neu noi dung chua "san pham/product/review" → boost product_only/photorealistic
- Neu noi dung chua "huong dan/how to/cach" → boost illustration/flat_design
- Them keyword detection cho ~10 nhom noi dung pho bien

### Thay doi 4: Hien thi Content Context Preview trong UI (Frontend)

**File: `src/components/multichannel/SimpleImageGenerator.tsx**`

Them component nho hien thi truoc khi tao anh:

- "AI se tao anh ve: {extracted_topic_keywords}"
- Hien thi 2-3 keyword chinh duoc rut ra tu noi dung
- Giup nguoi dung biet AI da "hieu" noi dung cua ho nhu the nao
- Dat ngay tren nut "Tao anh"

### Thay doi 5: Hien thi Prompt va Refine trong Streaming Card (Frontend)

**File: `src/components/multichannel/streaming/ImageStreamingCard.tsx**`

Khi anh da tao xong (status = 'done'):

- Them nut nho "Xem prompt" hien thi prompt da dung (collapsible)
- Giup nguoi dung hieu tai sao anh duoc tao nhu vay
- Ho co the copy prompt de chinh sua va tao lai
  &nbsp;

## Chi tiet ky thuat


| Thay doi                     | File                                           | Mo ta                                                 |
| ---------------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| Content Summary thong minh   | SimpleImageGenerator.tsx (dong 66-77)          | Nang cap getContentSummary voi keyword extraction     |
| Prompt Builder               | image-prompt-builder.ts (dong 648-767)         | Them Content Analysis section, tang content relevance |
| V3 Engine + content keywords | imageSuggestionEngine.ts (dong 30-37, 116-153) | Them contentSummary param, keyword-based style boost  |
| Content Context Preview      | SimpleImageGenerator.tsx (dong 429-440)        | Them UI hien thi "AI se tao anh ve..."                |
| Prompt viewer                | ImageStreamingCard.tsx (dong 239-277)          | Them nut "Xem prompt" khi done                        |
| Model fallback               | generate-brand-image, generate-social-image    | Confirm model tot nhat lam default                    |


## Khong thay doi

- Database schema
- Auth / RLS
- Cac component khac ngoai he thong tao anh
- Logic batch generation, retry, PoYo/KIE routing