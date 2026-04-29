import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCipheriv, randomBytes } from "node:crypto";
import { Buffer } from "node:buffer";
import { withPerf } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ConnectWordPressRequest {
  organizationId?: string;
  brandTemplateId?: string;
  siteUrl: string;
  username: string;
  applicationPassword: string;
  // optional default category/tags
  defaultCategoryId?: number;
  defaultStatus?: "publish" | "draft";
}

function encrypt(text: string, key: string): string {
  const iv = randomBytes(16);
  const keyBuffer = Buffer.alloc(32);
  Buffer.from(key).copy(keyBuffer);
  const cipher = createCipheriv("aes-256-cbc", keyBuffer, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

Deno.serve(
  withPerf({ functionName: "connect-wordpress" }, async (req) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const encryptionKey = Deno.env.get("AI_ENCRYPTION_KEY") || "default-key";
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Missing authorization header");
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);
      if (authError || !user) throw new Error("Unauthorized");

      const body: ConnectWordPressRequest = await req.json();
      let {
        organizationId,
        brandTemplateId,
        siteUrl,
        username,
        applicationPassword,
        defaultCategoryId,
        defaultStatus,
      } = body;

      if (!siteUrl || !username || !applicationPassword) {
        throw new Error(
          "siteUrl, username, applicationPassword đều bắt buộc",
        );
      }
      if (!brandTemplateId && !organizationId) {
        throw new Error("brandTemplateId hoặc organizationId là bắt buộc");
      }

      // Derive organizationId from brand if missing
      if (!organizationId && brandTemplateId) {
        const { data: bt } = await supabase
          .from("brand_templates")
          .select("organization_id")
          .eq("id", brandTemplateId)
          .maybeSingle();
        if (bt?.organization_id) organizationId = bt.organization_id;
      }

      // Normalize URL
      siteUrl = siteUrl.replace(/\/$/, "");
      if (!/^https?:\/\//i.test(siteUrl)) siteUrl = `https://${siteUrl}`;

      // Test connection — call /wp-json/wp/v2/users/me?context=edit
      const authString = btoa(`${username}:${applicationPassword}`);
      const meUrl = `${siteUrl}/wp-json/wp/v2/users/me?context=edit`;
      let meData: any = null;
      try {
        const r = await fetch(meUrl, {
          headers: { Authorization: `Basic ${authString}` },
        });
        if (!r.ok) {
          const txt = await r.text();
          throw new Error(`WordPress test thất bại (${r.status}): ${txt.slice(0, 300)}`);
        }
        meData = await r.json();
      } catch (e: any) {
        throw new Error(`Không kết nối được WordPress: ${e.message}`);
      }

      // Try to detect WP version + capabilities
      let wpVersion: string | null = null;
      let categories: any[] = [];
      try {
        const root = await fetch(`${siteUrl}/wp-json/`).then((r) =>
          r.ok ? r.json() : null,
        );
        if (root?.description) wpVersion = root?.gmt_offset?.toString() || null;
      } catch (_) { /* noop */ }

      try {
        const cats = await fetch(
          `${siteUrl}/wp-json/wp/v2/categories?per_page=100`,
          { headers: { Authorization: `Basic ${authString}` } },
        );
        if (cats.ok) {
          const arr = await cats.json();
          categories = (arr || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
          }));
        }
      } catch (_) { /* noop */ }

      const urlObj = new URL(siteUrl);
      const domain = urlObj.hostname;

      // Existing? per (brand|org, platform=wordpress, domain)
      let q = supabase
        .from("social_connections")
        .select("id")
        .eq("platform", "wordpress")
        .eq("platform_user_id", domain);
      if (brandTemplateId) q = q.eq("brand_template_id", brandTemplateId);
      else q = q.eq("organization_id", organizationId!);
      const { data: existing } = await q.maybeSingle();

      const encryptedAppPassword = encrypt(applicationPassword, encryptionKey);

      const connectionData = {
        organization_id: organizationId || null,
        brand_template_id: brandTemplateId || null,
        user_id: user.id,
        platform: "wordpress",
        platform_user_id: domain,
        platform_username: meData?.name || username,
        access_token: "wordpress-app-password", // marker
        refresh_token: encryptedAppPassword,
        is_active: true,
        connected_at: new Date().toISOString(),
        scopes: ["publish", "read", "media"],
        metadata: {
          site_url: siteUrl,
          username,
          wp_user_id: meData?.id || null,
          wp_user_name: meData?.name || null,
          wp_user_roles: meData?.roles || [],
          wp_version: wpVersion,
          categories,
          default_category_id: defaultCategoryId || null,
          default_status: defaultStatus || "publish",
          can_auto_publish: true,
          integration_type: "wordpress_self_hosted",
        },
      };

      let connection;
      if (existing) {
        const { data, error } = await supabase
          .from("social_connections")
          .update(connectionData)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        connection = data;
      } else {
        const { data, error } = await supabase
          .from("social_connections")
          .insert(connectionData)
          .select()
          .single();
        if (error) throw error;
        connection = data;
      }

      return new Response(
        JSON.stringify({
          success: true,
          connection: {
            id: connection.id,
            platform: connection.platform,
            site_url: siteUrl,
            username: connection.platform_username,
            categories,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } catch (error: any) {
      console.error("[connect-wordpress] Error:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Unknown error" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  }),
);
