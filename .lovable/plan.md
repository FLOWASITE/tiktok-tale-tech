

# Sprint 8: Security Hardening & Production Optimization

Sau khi hoan thanh Sprint 6-7, he thong da co nen tang tot. Sprint 8 tap trung vao 3 muc tieu: fix security findings con ton dong, toi uu context fetching, va cache safety.

---

## Tinh trang Hien tai

**Da hoan thanh (Sprint 6-7):**
- Dead code cleanup, Governor degradation, Observability SQL views
- Error taxonomy, index.ts decomposition, Resume API, Blackboard bootstrap
- Token budget reserve 25%

**Con ton dong (tu Security Scan + Expert Review):**
1. Security: `sales_chat_messages_log` cho phep anonymous insert (ERROR)
2. Security: `social_platform_settings` luu OAuth secrets trong DB (ERROR)
3. Security: `ad_copy_performance` thieu direct org isolation (WARN)
4. Context fetcher thieu per-source timeout (expert review)
5. Cache invalidation race condition khi brand update giua request

---

## Sprint 8A: Security Fixes (P0)

### Task 32: Fix `sales_chat_messages_log` public write

**Van de:** Policy "Allow anonymous insert" voi `USING (true)` cho phep bat ky ai cung insert — spam/abuse risk.

**Giai phap:** Database migration:
- Drop policy "Allow anonymous insert on sales_chat_messages_log"
- Tao policy moi yeu cau `session_id IS NOT NULL AND length(message) < 5000`
- Giu anonymous access (sales chatbot can thiet) nhung them validation

### Task 33: Fix `social_platform_settings` credentials

**Van de:** OAuth `consumer_key` va `consumer_secret` luu trong user-accessible table.

**Giai phap:** 
- Khong the migrate ngay vi nhieu edge functions dang doc tu bang nay
- Tam thoi: them RLS policy restrict SELECT tren `consumer_key`, `consumer_secret` chi cho service role
- Tao database view `v_social_platform_settings_safe` khong bao gom sensitive columns cho frontend
- Long-term: migrate secrets to Vault (defer)

### Task 34: Strengthen `ad_copy_performance` isolation

**Van de:** RLS dua vao complex join chain qua `ad_copies` -> `organization_members`.

**Giai phap:** Database migration:
- Them column `organization_id` truc tiep vao `ad_copy_performance` (nullable, backfill tu ad_copies)
- Tao trigger auto-populate `organization_id` khi insert
- Them RLS policy direct: `organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())`

---

## Sprint 8B: Context Fetcher Timeout (P1)

### Task 35: Per-source timeout cho parallel context fetch

**Van de:** `context-fetcher.ts` fetch 6+ sources nhung web search co the mat 10-12s, chiem het time budget.

**Giai phap:** Sua `context-fetcher.ts`:
- Wrap moi source trong `withTimeout()` voi timeout rieng:
  - DB fetches (brand, persona, product): 3s
  - RAG search: 4s  
  - Web search: 5s (giam tu 12s hien tai)
  - Conversation RAG: 3s
- Dung `Promise.allSettled()` cho tat ca parallel fetches
- Log source nao bi timeout de track qua observability

**File:** `supabase/functions/_shared/pipeline/context-fetcher.ts`

---

## Sprint 8C: Cache Safety (P1)

### Task 36: Them `brand_version` vao cache key

**Van de:** Neu brand template update giua khi request dang chay (12-25s), request co the dung cache cu cho mot phan va brand moi cho phan khac.

**Giai phap:**
- Them column `version` (integer, default 1) vao `brand_templates` table
- Tao trigger: khi brand_templates update -> `version = version + 1`
- Sua `generateCacheKey()` trong `redis-cache.ts`: them `brandVersion` vao hash input
- Cache tu dong miss khi brand update -> khong can invalidation trigger

**Files:**
- Database migration: them column + trigger
- `supabase/functions/_shared/cache/redis-cache.ts`: sua `generateCacheKey()`
- `supabase/functions/_shared/graph/nodes/content-node.ts`: truyen `brandVersion` khi goi `generateCacheKey()`

---

## Sprint 8D: Cap nhat Tai lieu (P0)

### Task 37: Cap nhat `.lovable/plan.md` len v2.5
- Ghi Sprint 8 completions
- Cap nhat Known Limitations (xoa security items da fix)
- Them section "Security Posture" tom tat trang thai bao mat

---

## Thu tu Thuc hien

| Buoc | Sprint | Priority | Effort | Impact |
|------|--------|----------|--------|--------|
| 1 | 8A (Security fixes) | P0 | Trung binh | Fix 2 ERROR + 1 WARN findings |
| 2 | 8B (Context timeout) | P1 | Thap | Giam latency P95, tang reliability |
| 3 | 8C (Cache safety) | P1 | Thap | Fix race condition |
| 4 | 8D (Tai lieu) | P0 | Thap | Accuracy |

### Khong lam trong Sprint 8
- **Rate limiter Redis** (P2) — in-memory van du
- **HITL UI** (P2) — degradation path da cover
- **Multi-model routing** (P2) — can observability data truoc
- **OAuth Vault migration** (P3) — effort cao, RLS restriction du tam thoi

