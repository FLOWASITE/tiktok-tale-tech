import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CheckResult {
  name: string;
  description: string;
  expectedStatus: number | "any";
  expectedCode?: string;
  status: "pending" | "running" | "pass" | "fail";
  actualStatus?: number;
  actualBody?: unknown;
  durationMs?: number;
  notes?: string;
}

const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/telegram-webapp-auth`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function callAuth(body: unknown): Promise<{ status: number; body: unknown; ms: number }> {
  const start = performance.now();
  let status = 0;
  let parsed: unknown = null;
  try {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify(body),
    });
    status = res.status;
    const text = await res.text();
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  } catch (err) {
    parsed = { network_error: err instanceof Error ? err.message : String(err) };
  }
  return { status, body: parsed, ms: Math.round(performance.now() - start) };
}

function buildFakeInitData(opts: { withUser?: boolean; authDate?: number; hash?: string }): string {
  const params = new URLSearchParams();
  if (opts.withUser !== false) {
    params.set("user", JSON.stringify({ id: 999999999, first_name: "Test", username: "checklist" }));
  }
  params.set("auth_date", String(opts.authDate ?? Math.floor(Date.now() / 1000)));
  params.set("query_id", "AAH_test_query_id");
  params.set("hash", opts.hash ?? "0".repeat(64));
  return params.toString();
}

const INITIAL_CHECKS: Omit<CheckResult, "status">[] = [
  {
    name: "1. Reject empty init_data",
    description: "POST không có init_data → phải trả 400.",
    expectedStatus: 400,
  },
  {
    name: "2. Reject missing hash",
    description: "init_data không có hash → phải trả 401 'missing hash'.",
    expectedStatus: 401,
  },
  {
    name: "3. Reject missing user",
    description: "init_data có hash giả nhưng không có field user → phải trả 401 'no user in initData'.",
    expectedStatus: 401,
  },
  {
    name: "4. Reject unlinked Telegram user (org inference path)",
    description:
      "init_data hợp lệ format (giả) với user.id chưa từng /start bot nào → phải trả 404 code='not_linked'. Nếu nhận 401 nghĩa là HMAC check chạy TRƯỚC org inference (sai thứ tự).",
    expectedStatus: 404,
    expectedCode: "not_linked",
  },
  {
    name: "5. Real init_data — full HMAC + magic link (optional)",
    description:
      "Dán init_data thật từ window.Telegram.WebApp.initData để verify HMAC + magic link end-to-end. Bỏ trống = skip.",
    expectedStatus: "any",
  },
  {
    name: "6. Frontend flow simulation: existing session + missing org (optional)",
    description:
      "Mô phỏng đúng bug thực tế: gọi function CÓ init_data thật nhưng KHÔNG truyền organization_id. Pass khi response trả organization_id (nghĩa là backend tự infer được, frontend hết block 'Không xác thực được'). Cần real init_data ở ô bên trên.",
    expectedStatus: 200,
  },
  {
    name: "7. Current Supabase session probe",
    description:
      "Kiểm tra có session Supabase active không (dùng để phân biệt nhánh 'session có sẵn nhưng thiếu org' với 'chưa đăng nhập').",
    expectedStatus: "any",
  },
  {
    name: "8. verifyOtp với token_hash từ test 5 (optional)",
    description:
      "Bước fail thật gây 'Không xác thực được': sau khi function trả token_hash, frontend phải gọi supabase.auth.verifyOtp({ type:'magiclink', token_hash }). Truyền thêm `email` sẽ bị Supabase trả 400 'Only the token_hash and type should be provided'. Skip nếu đã có session sẵn.",
    expectedStatus: "any",
  },
];

export default function AdminTelegramAuthCheck() {
  const [checks, setChecks] = useState<CheckResult[]>(
    INITIAL_CHECKS.map((c) => ({ ...c, status: "pending" })),
  );
  const [realInitData, setRealInitData] = useState("");
  const [running, setRunning] = useState(false);

  async function runAll() {
    setRunning(true);
    const next: CheckResult[] = INITIAL_CHECKS.map((c) => ({ ...c, status: "pending" }));
    setChecks([...next]);

    const update = (idx: number, patch: Partial<CheckResult>) => {
      next[idx] = { ...next[idx], ...patch };
      setChecks([...next]);
    };

    // 1. empty init_data
    update(0, { status: "running" });
    {
      const r = await callAuth({});
      update(0, {
        status: r.status === 400 ? "pass" : "fail",
        actualStatus: r.status,
        actualBody: r.body,
        durationMs: r.ms,
      });
    }

    // 2. missing hash
    update(1, { status: "running" });
    {
      const initData = "user=" + encodeURIComponent(JSON.stringify({ id: 1 })) + "&auth_date=1";
      const r = await callAuth({ init_data: initData });
      update(1, {
        status: r.status === 401 ? "pass" : "fail",
        actualStatus: r.status,
        actualBody: r.body,
        durationMs: r.ms,
      });
    }

    // 3. missing user
    update(2, { status: "running" });
    {
      const initData = buildFakeInitData({ withUser: false });
      const r = await callAuth({ init_data: initData });
      update(2, {
        status: r.status === 401 ? "pass" : "fail",
        actualStatus: r.status,
        actualBody: r.body,
        durationMs: r.ms,
      });
    }

    // 4. unlinked user → expects 404 not_linked (org inference path executed)
    update(3, { status: "running" });
    {
      const initData = buildFakeInitData({ withUser: true });
      const r = await callAuth({ init_data: initData });
      const code = (r.body as { code?: string } | null)?.code;
      const pass = r.status === 404 && code === "not_linked";
      update(3, {
        status: pass ? "pass" : "fail",
        actualStatus: r.status,
        actualBody: r.body,
        durationMs: r.ms,
        notes:
          !pass && r.status === 401
            ? "401 = HMAC check chạy trước inference (sai thứ tự). Backend phải parse user.id → infer org TRƯỚC khi verify HMAC."
            : !pass && r.status === 400
              ? "400 = backend vẫn yêu cầu organization_id (chưa apply fallback default-bot)."
              : undefined,
      });
    }

    // 5. real init_data (optional) — full HMAC + magic link path
    update(4, { status: "running" });
    if (realInitData.trim()) {
      const r = await callAuth({ init_data: realInitData.trim() });
      const body = r.body as { token_hash?: string; email?: string; organization_id?: string } | null;
      const pass = r.status === 200 && !!body?.token_hash && !!body?.email;
      update(4, {
        status: pass ? "pass" : "fail",
        actualStatus: r.status,
        actualBody: r.body,
        durationMs: r.ms,
        notes: pass
          ? `✓ token_hash + email nhận được, org=${body?.organization_id ?? "(null)"}`
          : "Real init_data fail — xem body để biết lý do (HMAC mismatch / expired / bot config).",
      });
    } else {
      update(4, { status: "pass", notes: "Skipped — không có init_data thật." });
    }

    // 6. Frontend flow simulation: real init_data WITHOUT organization_id
    // This is the exact case that caused "Không xác thực được" cho default bot.
    update(5, { status: "running" });
    if (realInitData.trim()) {
      const r = await callAuth({ init_data: realInitData.trim() }); // intentionally NO organization_id
      const body = r.body as { organization_id?: string; code?: string; error?: string } | null;
      const orgResolved = !!body?.organization_id;
      const pass = r.status === 200 && orgResolved;
      update(5, {
        status: pass ? "pass" : "fail",
        actualStatus: r.status,
        actualBody: r.body,
        durationMs: r.ms,
        notes: pass
          ? `✓ Backend tự infer được org=${body?.organization_id} mà không cần frontend gửi. Hook sẽ KHÔNG còn block ở "organizationId null".`
          : body?.code === "ambiguous_org"
            ? "ambiguous_org — user link nhiều workspace. Cần truyền ?org=<id> qua URL hoặc start_param."
            : body?.code === "not_linked"
              ? "not_linked — user chưa /start bot. Đây là lỗi hợp lệ, không phải bug Mini App."
              : "Backend KHÔNG resolve được org → frontend sẽ hiện 'Không xác thực được'. Đây là bug cần fix ở edge function.",
      });
    } else {
      update(5, {
        status: "pass",
        notes: "Skipped — cần real init_data ở ô trên để chạy test này.",
      });
    }

    // 7. Supabase session probe
    update(6, { status: "running" });
    {
      const start = performance.now();
      const { data, error } = await supabase.auth.getSession();
      const ms = Math.round(performance.now() - start);
      const userId = data.session?.user?.id ?? null;
      update(6, {
        status: error ? "fail" : "pass",
        actualStatus: error ? 500 : 200,
        actualBody: {
          has_session: !!userId,
          user_id: userId,
          email: data.session?.user?.email ?? null,
          error: error?.message ?? null,
        },
        durationMs: ms,
        notes: userId
          ? "Có session active → nhánh 'existing session' của hook sẽ chạy. Kiểm tra test 6 để chắc backend vẫn resolve được org."
          : "Chưa có session → hook sẽ verifyOtp bằng token_hash từ test 5.",
      });
    }

    setRunning(false);
  }

  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const totalRunnable = checks.length;

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Telegram Auth Checklist</h1>
          <p className="text-sm text-muted-foreground">
            End-to-end verification cho <code className="font-mono">telegram-webapp-auth</code> — backend response + frontend hook flow.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Real init_data (optional)</CardTitle>
          <CardDescription>
            Trên Telegram (mobile/desktop), mở Mini App, bật DevTools, chạy{" "}
            <code className="font-mono">window.Telegram.WebApp.initData</code> và paste vào đây để chạy test 5 và 6.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="initdata" className="text-xs text-muted-foreground">
            init_data string
          </Label>
          <Textarea
            id="initdata"
            value={realInitData}
            onChange={(e) => setRealInitData(e.target.value)}
            placeholder="user=%7B%22id%22%3A123...&auth_date=...&hash=..."
            className="font-mono text-xs min-h-[80px]"
          />
          <Button onClick={runAll} disabled={running} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {running ? "Đang chạy..." : "Chạy toàn bộ checklist"}
          </Button>
        </CardContent>
      </Card>

      {(passed > 0 || failed > 0) && (
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3 w-3 text-primary" /> {passed} pass
          </Badge>
          {failed > 0 && (
            <Badge variant="outline" className="gap-1">
              <XCircle className="h-3 w-3 text-destructive" /> {failed} fail
            </Badge>
          )}
          <Badge variant="outline">{totalRunnable} total</Badge>
        </div>
      )}

      <div className="space-y-3">
        {checks.map((check, i) => (
          <Card
            key={i}
            className={
              check.status === "fail"
                ? "border-destructive/50"
                : check.status === "pass"
                  ? "border-primary/30"
                  : ""
            }
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {check.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {check.status === "pass" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    {check.status === "fail" && <XCircle className="h-4 w-4 text-destructive" />}
                    {check.status === "pending" && <AlertCircle className="h-4 w-4 text-muted-foreground" />}
                    {check.name}
                  </CardTitle>
                  <CardDescription className="text-xs">{check.description}</CardDescription>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    expect {String(check.expectedStatus)}
                    {check.expectedCode ? ` · ${check.expectedCode}` : ""}
                  </Badge>
                  {check.actualStatus !== undefined && (
                    <Badge
                      variant={check.status === "pass" ? "default" : "destructive"}
                      className="text-xs font-mono"
                    >
                      got {check.actualStatus} · {check.durationMs}ms
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            {(check.actualBody !== undefined || check.notes) && (
              <CardContent className="pt-0 space-y-2">
                {check.notes && <p className="text-xs text-muted-foreground italic">{check.notes}</p>}
                {check.actualBody !== undefined && (
                  <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto font-mono max-h-60">
                    {JSON.stringify(check.actualBody, null, 2)}
                  </pre>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
