-- Add seasonal_events column to industry_templates for industry-specific calendar events
ALTER TABLE public.industry_templates
ADD COLUMN IF NOT EXISTS seasonal_events JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN public.industry_templates.seasonal_events IS 'Array of industry-specific seasonal events. Structure: [{ "event": "Event Name", "date": "DD/MM", "suggestedAngles": ["angle1", "angle2"] }]';

-- Update some industry templates with sample seasonal events (Vietnam Accounting)
UPDATE public.industry_templates
SET seasonal_events = '[
  {"event": "Ngày Kế toán Việt Nam", "date": "10/11", "suggestedAngles": ["Behind-the-scenes ngày làm việc kế toán", "Tribute to kế toán viên", "Career story kế toán"]},
  {"event": "Deadline quyết toán thuế TNCN", "date": "31/03", "suggestedAngles": ["Checklist quyết toán", "Sai lầm thường gặp", "Countdown reminder"]},
  {"event": "Deadline báo cáo tài chính", "date": "31/03", "suggestedAngles": ["Chuẩn bị hồ sơ", "Review checklist", "Common mistakes"]},
  {"event": "Deadline nộp thuế GTGT Q1", "date": "30/04", "suggestedAngles": ["Reminder timeline", "Checklist documents", "FAQ common issues"]},
  {"event": "Deadline nộp thuế GTGT Q2", "date": "31/07", "suggestedAngles": ["Reminder timeline", "Prepare checklist"]},
  {"event": "Deadline nộp thuế GTGT Q3", "date": "31/10", "suggestedAngles": ["Reminder timeline", "Prepare checklist"]},
  {"event": "Deadline nộp thuế GTGT Q4", "date": "31/01", "suggestedAngles": ["Reminder timeline", "Prepare checklist", "Year-end review"]},
  {"event": "Tết Nguyên Đán", "date": "01/01", "suggestedAngles": ["Chuẩn bị sổ sách cuối năm", "Review tài chính trước Tết", "Kế hoạch thuế năm mới"]}
]'::jsonb
WHERE code = 'accounting';