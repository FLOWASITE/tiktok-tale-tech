## Mục tiêu
Tự động hoá end-to-end test luồng **Agent → Post Social** bằng script Deno + Supabase service role, thay vì user click tay qua 5 bước.

## Phạm vi test (1 happy-path + 3 guard)
1. **Happy path**: tạo Goal → chờ pipeline chạy hết `strategy → create → quality → approval` → auto-approve → verify `publish` stage success + có `published_url`.
2. **Guard 1**: Goal không có social connection → expect `is_flagged=true` ở stage `publish`.
3. **Guard 2**: Pipeline bị `quality` reject (low score) → expect retry hoặc flag.
4. **Cleanup**: xoá goal + pipelines test sau khi xong.

## Cách chạy
- File test: `supabase/functions/__tests__/agent-e2e.test.ts` (vitest pickup tự động theo `vitest.config.ts`).
- Dùng `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` từ `.env` (qua dotenv load) để bypass RLS, seed data trực tiếp.
- Polling `agent_pipelines` mỗi 3s, timeout 180s/stage.
- Gọi edge function `agent-pipeline` với `action: 'advance_stage'` và `action: 'approve'` để drive flow.

## Test plan chi tiết

| # | Bước | Assertion |
|---|---|---|
| 1 | Seed `agent_goals` với org test + brand có FB connected | `goal.id` returned, `is_active=true` |
| 2 | Invoke `agent-pipeline` action=`create_from_goal` | `pipeline_count >= 1`, status `running` |
| 3 | Poll pipeline tới `current_stage='approval'` | < 180s, `is_flagged=false`, có `content_title` |
| 4 | Invoke `agent-pipeline` action=`approve`, pipeline_id | `current_stage='publish'` trong 30s |
| 5 | Poll tới `completed_at != null` | `published_url` không null, không có error log |
| 6 | Query `agent_pipeline_logs` | có log stage `publish` với `status='success'` |
| 7 | Cleanup: delete pipelines + goal | rows=0 sau delete |

## Cấu trúc file
```text
supabase/functions/__tests__/
  agent-e2e.test.ts          # test runner chính
  _helpers/
    seed.ts                  # tạo org/brand/goal mock
    poll.ts                  # waitFor(pipeline, condition, timeoutMs)
    cleanup.ts               # cascade delete
```

## Pre-requisite cần user confirm
1. **Test organization + brand template ID** nào để seed? (tránh đụng data production của user)
2. **Có FB/social connection sẵn cho brand đó không?** Nếu chưa, test sẽ skip step publish và chỉ assert tới `approval`.
3. Cho phép test **publish thật lên FB** (đăng 1 post test) hay chỉ mock publish edge function?

## Limitations
- Edge function `publish-facebook` gọi Graph API thật → cần FB connection còn token valid. Nếu user không muốn post thật, ta stub bằng cách mock `publish_mode='dry_run'` (cần thêm flag vào edge function — out of scope test này) hoặc dừng ở stage `approval`.
- Test mất ~3-5 phút do AI generation (`create` + `quality` stage).
