-- Bật extensions cho self-host Postgres (chạy 1 lần khi init container DB)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";
CREATE EXTENSION IF NOT EXISTS "vector";       -- pgvector cho embeddings 384-dim
CREATE EXTENSION IF NOT EXISTS "pg_cron";      -- scheduled jobs (token refresh, publish, …)
CREATE EXTENSION IF NOT EXISTS "pg_net";       -- HTTP calls từ Postgres (cron → edge functions)
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgaudit";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pgsodium";     -- vault secrets
CREATE EXTENSION IF NOT EXISTS "pg_graphql";

-- Grant pg_cron usage cho postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
