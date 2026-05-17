DELETE FROM content_schedules WHERE notes LIKE 'Auto-created from campaign plan: %E2E TEST%';
DELETE FROM agent_pipelines WHERE goal_id='e2e00000-0000-0000-0000-000000000001';
DELETE FROM campaign_content_plans WHERE id='29aec8d5-bcee-4ec7-aa7d-33005e993962';
DELETE FROM agent_goals WHERE id='e2e00000-0000-0000-0000-000000000001';
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';