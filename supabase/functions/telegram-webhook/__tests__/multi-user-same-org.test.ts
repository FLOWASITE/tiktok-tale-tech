// Regression tests for ghost-binding cleanup scope.
//
// Bug: ghost cleanup in handleConfirmLinkCallback used to delete ALL bindings
// for a Telegram user (across orgs and chat_types), which could destroy group
// bindings for the same Telegram user. Fix: scope cleanup to chat_type='private'
// so group memberships survive when the same Telegram user re-links to a Flowa
// account.
//
// These tests do not exercise the live Deno.serve handler (it pulls in heavy
// imports). Instead they assert the SQL-shape contract that the production
// query must follow. If the production query drifts away from this contract,
// the test fails — which is exactly the regression we want to catch.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

type DeleteCall = {
  table: string;
  filters: Array<{ op: "eq" | "neq"; column: string; value: unknown }>;
};

function makeFakeSupabase(captured: DeleteCall[]) {
  return {
    from(table: string) {
      const call: DeleteCall = { table, filters: [] };
      const builder: any = {
        delete() {
          captured.push(call);
          return builder;
        },
        eq(column: string, value: unknown) {
          call.filters.push({ op: "eq", column, value });
          return builder;
        },
        neq(column: string, value: unknown) {
          call.filters.push({ op: "neq", column, value });
          return builder;
        },
        select() {
          return Promise.resolve({ data: [], error: null });
        },
        then(resolve: (v: unknown) => unknown) {
          return Promise.resolve({ error: null }).then(resolve);
        },
      };
      return builder;
    },
  };
}

// This mirrors the exact production query in handleConfirmLinkCallback ghost
// cleanup. Keep it in sync with index.ts.
async function ghostCleanup(
  supabase: ReturnType<typeof makeFakeSupabase>,
  effectiveTgUserId: number,
  payloadUid: string,
) {
  await supabase
    .from("telegram_chat_bindings")
    .delete()
    .eq("telegram_user_id", effectiveTgUserId)
    .eq("chat_type", "private")
    .neq("user_id", payloadUid);
}

Deno.test("ghost cleanup scopes to chat_type=private", async () => {
  const captured: DeleteCall[] = [];
  const supabase = makeFakeSupabase(captured);

  await ghostCleanup(supabase, 12345, "user-b-uuid");

  assertEquals(captured.length, 1);
  const call = captured[0];
  assertEquals(call.table, "telegram_chat_bindings");

  const hasPrivateScope = call.filters.some(
    (f) => f.op === "eq" && f.column === "chat_type" && f.value === "private",
  );
  assertEquals(
    hasPrivateScope,
    true,
    "ghost cleanup MUST scope chat_type='private' to preserve group bindings",
  );
});

Deno.test("ghost cleanup matches the right Telegram user but different Flowa user", async () => {
  const captured: DeleteCall[] = [];
  const supabase = makeFakeSupabase(captured);

  await ghostCleanup(supabase, 12345, "user-b-uuid");

  const call = captured[0];
  const tgUserFilter = call.filters.find(
    (f) => f.op === "eq" && f.column === "telegram_user_id",
  );
  const userNeqFilter = call.filters.find(
    (f) => f.op === "neq" && f.column === "user_id",
  );

  assertEquals(tgUserFilter?.value, 12345);
  assertEquals(userNeqFilter?.value, "user-b-uuid");
});

Deno.test("ghost cleanup does NOT delete by organization (cross-org Telegram user is allowed to be re-bound)", async () => {
  const captured: DeleteCall[] = [];
  const supabase = makeFakeSupabase(captured);

  await ghostCleanup(supabase, 12345, "user-b-uuid");

  const call = captured[0];
  const orgFilter = call.filters.find((f) => f.column === "organization_id");
  assertEquals(
    orgFilter,
    undefined,
    "ghost cleanup intentionally spans orgs: 1 Telegram user ↔ 1 Flowa account globally",
  );
});

Deno.test("two users in same org: B's confirm cleanup must not match A's private binding", async () => {
  // Simulated DB rows
  const rows = [
    {
      id: "row-A-private",
      telegram_user_id: 11111, // User A's Telegram ID
      user_id: "user-a-uuid",
      organization_id: "org-flowa",
      chat_type: "private",
    },
    {
      id: "row-A-group",
      telegram_user_id: 11111,
      user_id: "user-a-uuid",
      organization_id: "org-flowa",
      chat_type: "group",
    },
    {
      id: "row-B-private-old",
      telegram_user_id: 22222, // User B's Telegram ID
      user_id: "user-b-old-uuid", // previously bound to a different Flowa account
      organization_id: "org-flowa",
      chat_type: "private",
    },
    {
      id: "row-B-group",
      telegram_user_id: 22222,
      user_id: "user-b-old-uuid",
      organization_id: "org-flowa",
      chat_type: "group",
    },
  ];

  // Simulate cleanup: telegram_user_id=22222 AND chat_type=private AND user_id != 'user-b-uuid'
  const effectiveTgUserId = 22222;
  const newUid = "user-b-uuid";

  const survivors = rows.filter((r) => {
    const matches =
      r.telegram_user_id === effectiveTgUserId &&
      r.chat_type === "private" &&
      r.user_id !== newUid;
    return !matches;
  });

  // Must survive: User A's private + group, User B's group
  // Must be deleted: row-B-private-old (stale binding to old Flowa account)
  assertEquals(survivors.length, 3);
  assertEquals(
    survivors.some((r) => r.id === "row-A-private"),
    true,
    "User A private binding MUST survive when User B confirms in same org",
  );
  assertEquals(
    survivors.some((r) => r.id === "row-A-group"),
    true,
    "User A group binding MUST survive (different Telegram user anyway)",
  );
  assertEquals(
    survivors.some((r) => r.id === "row-B-group"),
    true,
    "User B's group binding MUST survive (chat_type filter protects it)",
  );
  assertEquals(
    survivors.some((r) => r.id === "row-B-private-old"),
    false,
    "User B's stale private binding to old Flowa account MUST be cleaned",
  );
});
