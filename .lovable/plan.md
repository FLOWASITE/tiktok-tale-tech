

# Fix: Transform Core Content sang Multi-channel khong hoat dong

## Nguyen nhan goc

Co **2 loi** khien tinh nang "Transform -> Multi-channel" tu Core Content Library khong hoat dong:

### Loi 1: `coreContentId` bi mat khi chuyen trang
- `CoreContentLibrary.handleTransform()` dieu huong den `/multichannel/new?coreContentId=xxx` (truyen qua **URL query param**)
- Nhung `MultiChannelCreate` chi doc du lieu tu `location.state` (React Router state), **khong doc URL search params**
- Ket qua: `coreContentId` bi mat hoan toan, wizard khoi dong nhu tao moi

### Loi 2: Khong co logic tai Core Content da ton tai
- Ngay ca khi `coreContentId` duoc truyen dung vao wizard, **khong co useEffect nao** de fetch Core Content tu database va nap vao `coreContentData`
- Vi `coreContentData` luon la `null`, wizard hien form "Tao Core Content" thay vi nhay thang den buoc chon Role (buoc 3)

## Giai phap

### Fix 1: Doc `coreContentId` tu URL search params trong `MultiChannelCreate`

File: `src/pages/MultiChannelCreate.tsx`

- Them `useSearchParams` tu react-router-dom
- Doc `coreContentId` tu URL: `searchParams.get('coreContentId')`
- Truyen vao `formData.coreContentId` de wizard nhan duoc

### Fix 2: Them logic fetch Core Content khi co `coreContentId` san

File: `src/components/multichannel/MultiChannelFormWizard.tsx`

- Them `useEffect` theo doi `formData.coreContentId`
- Khi co `coreContentId` va chua co `coreContentData`: fetch Core Content tu database bang supabase client
- Nap du lieu vao `coreContentData` (title, content, wordCount, qualityScore, keyMessages, contentGoal)
- Tu dong nhay den buoc 3 (chon Content Role) vi Core Content da san sang
- Tu dong set `contentRole` dua tren `contentGoal` cua Core Content (dung `GOAL_TO_ROLE_MAP`)

### Fix 3: Tu dong dien topic tu Core Content

- Khi fetch Core Content thanh cong, tu dong dien `formData.topic` = core content title/topic
- Dam bao `formData.contentGoal` duoc dong bo tu Core Content

## Ket qua mong doi

Khi nguoi dung nhan "Transform -> Multi-channel" tu Core Content Library:
1. Chuyen den trang tao moi voi `coreContentId` duoc giu nguyen
2. Core Content duoc tai tu dong va hien thi
3. Wizard nhay thang den buoc 3 (chon Role) - bo qua buoc nhap topic va tao Core Content
4. Nguoi dung chi can chon Role, chon kenh, va bam tao

## Chi tiet ky thuat

### `src/pages/MultiChannelCreate.tsx`
- Them import `useSearchParams`
- Trong component: `const [searchParams] = useSearchParams()`
- Doc `coreContentId`: `const coreContentIdFromUrl = searchParams.get('coreContentId')`
- Cap nhat `formData` initial state: them `coreContentId: coreContentIdFromUrl || undefined`

### `src/components/multichannel/MultiChannelFormWizard.tsx`
- Them `useEffect` moi (khoang dong 370-410):

```text
useEffect: khi initialData.coreContentId thay doi
  -> Neu co coreContentId va chua co coreContentData
  -> Fetch tu supabase: core_contents table, select *, eq id
  -> Set coreContentData voi du lieu fetch duoc
  -> Set formData.topic = data.topic
  -> Set formData.contentGoal = data.content_goal
  -> Set formData.contentRole = GOAL_TO_ROLE_MAP[data.content_goal]
  -> Set currentStep = 3 (nhay den chon Role)
  -> Mark steps 1, 2 da hoan thanh
```

- Them state `isLoadingExistingCoreContent` de hien thi loading UI khi dang fetch

