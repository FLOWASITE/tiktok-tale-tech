

## Thiết lập Cron Job tự động đăng bài theo lịch

### Nguyên nhân gốc

Action `check_scheduled_publish` trong `agent-pipeline` đã có logic đầy đủ:
- Tìm pipelines ở stage `publish` với `scheduled_publish_at <= now()`
- Gọi `fireNextStage` để trigger đăng bài

Tuy nhiên **không có cron job nào** gọi action này. Extensions `pg_cron` + `pg_net` đã bật nhưng bảng `cron.job` trống.

### Thay đổi

**1. Tạo cron job gọi `check_scheduled_publish` mỗi 2 phút**

Dùng Supabase insert tool (không dùng migration vì chứa URL + anon key cụ thể):

```sql
select cron.schedule(
  'check-scheduled-publish',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := 'https://rllyipiyuptkibqinotz.supabase.co/functions/v1/agent-pipeline',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb,
    body := '{"action": "check_scheduled_publish"}'::jsonb
  ) as request_id;
  $$
);
```

**2. Tạo cron job gọi `recover_stuck` mỗi 5 phút** (bonus — phục hồi pipeline bị kẹt)

```sql
select cron.schedule(
  'recover-stuck-pipelines',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://rllyipiyuptkibqinotz.supabase.co/functions/v1/agent-pipeline',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb,
    body := '{"action": "recover_stuck"}'::jsonb
  ) as request_id;
  $$
);
```

### Kết quả
- Mỗi 2 phút, hệ thống tự kiểm tra và đăng bài đã đến giờ
- Pipeline bị kẹt được tự phục hồi mỗi 5 phút
- Bài viết lên lịch sẽ được đăng tự động đúng giờ (sai số tối đa ~2 phút)

