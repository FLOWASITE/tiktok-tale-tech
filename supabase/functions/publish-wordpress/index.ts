import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function buildHtmlContent(rawContent: string): string {
  let html = rawContent || "";
  // If content has no HTML tags, naively convert paragraphs / line breaks
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    // Convert markdown headings ## / ###
    html = html
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h2>$1</h2>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html
      .split(/\n{2,}/)
      .map((p) => {
        const trimmed = p.trim();
        if (!trimmed) return "";
        if (/^<(h\d|ul|ol|li|blockquote)/i.test(trimmed)) return trimmed;
        return `<p>${trimmed.replace(/\n/g, "<br/>")}</p>`;
      })
      .join("\n");
  }
  return html;
}

async function uploadFeaturedImage(
  siteUrl: string,
  authString: string,
  imageUrl: string,
  altText: string,
): Promise<number | null> {
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const buf = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
      ? "webp"
      : "jpg";
    const filename = `flowa-featured-${Date.now()}.${ext}`;

    const uploadRes = await fetch(`${siteUrl}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
      body: buf,
    });
    if (!uploadRes.ok) {
      const t = await uploadRes.text();
      console.warn("[publish-wordpress] media upload failed:", uploadRes.status, t.slice(0, 200));
      return null;
    }
    const media = await uploadRes.json();
    // Set alt text
    if (altText && media?.id) {
      await fetch(`${siteUrl}/wp-json/wp/v2/media/${media.id}`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${authString}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ alt_text: altText }),
      }).catch(() => {});
    }
    return media?.id || null;
  } catch (e) {
    console.warn("[publish-wordpress] uploadFeaturedImage error:", e);
    return null;
  }
}

Deno.serve(
  withPerf({ functionName: "publish-wordpress" }, async (req) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const supabase = getServiceClient();
      const body = await req.json();
      const {
        connectionId,
        content,
        excerpt,
        tags = [],
        categories = [],
        featuredImageUrl,
        slug,
        status: requestedStatus,
        seoTitle,
        metaDescription,
        focusKeyword,
      } = body;
      let { title } = body;

      if (!connectionId) throw new Error("connectionId is required");
      if (!content) throw new Error("content is required");

      // Auto-extract title
      if (!title || typeof title !== "string" || !title.trim()) {
        const firstLine = String(content)
          .split("\n")
          .map((l: string) =>
            l.replace(/^#+\s*/, "").replace(/[*_~`]/g, "").trim()
          )
          .find((l: string) => l.length > 0);
        title = (firstLine || "Bài viết mới").substring(0, 200);
      }

      const { data: connection, error: connError } = await supabase
        .from("social_connections")
        .select("*")
        .eq("id", connectionId)
        .in("platform", ["wordpress", "wordpress_com"])
        .single();

      if (connError || !connection) {
        throw new Error("WordPress connection not found");
      }
      if (!connection.is_active) {
        throw new Error("WordPress connection bị vô hiệu hoá. Hãy kết nối lại.");
      }

      const isDotCom = connection.platform === "wordpress_com";

      const html = buildHtmlContent(content);

      // ============= WordPress.com branch (OAuth Bearer) =============
      if (isDotCom) {
        const siteId = connection.metadata?.selected_site_id;
        const siteUrlMeta = connection.metadata?.selected_site_url;
        if (!siteId) {
          throw new Error("WordPress.com connection thiếu selected_site_id. Hãy kết nối lại.");
        }
        const accessToken = await decryptCredential(connection.access_token);
        if (!accessToken) {
          throw new Error("Không decrypt được WordPress.com access token");
        }

        const status = requestedStatus || connection.metadata?.default_status || "publish";
        const wpcomPayload: Record<string, unknown> = {
          title,
          content: html,
          status,
        };
        if (excerpt) wpcomPayload.excerpt = excerpt;
        if (slug) wpcomPayload.slug = slug;
        if (featuredImageUrl) wpcomPayload.featured_image = featuredImageUrl;
        if (Array.isArray(tags) && tags.length) {
          wpcomPayload.tags = tags.filter((t) => typeof t === "string").join(",");
        }
        if (Array.isArray(categories) && categories.length) {
          wpcomPayload.categories = categories.filter((c) => typeof c === "string").join(",");
        }
        // Yoast / Rank Math meta via wp.com metadata array
        const wpcomMetadata: Array<{ key: string; value: string; operation?: string }> = [];
        if (metaDescription) {
          wpcomMetadata.push({ key: "_yoast_wpseo_metadesc", value: String(metaDescription) });
          wpcomMetadata.push({ key: "rank_math_description", value: String(metaDescription) });
        }
        if (seoTitle) {
          wpcomMetadata.push({ key: "_yoast_wpseo_title", value: String(seoTitle) });
          wpcomMetadata.push({ key: "rank_math_title", value: String(seoTitle) });
        }
        if (focusKeyword) {
          wpcomMetadata.push({ key: "_yoast_wpseo_focuskw", value: String(focusKeyword) });
          wpcomMetadata.push({ key: "rank_math_focus_keyword", value: String(focusKeyword) });
        }
        if (wpcomMetadata.length) wpcomPayload.metadata = wpcomMetadata;

        const wpcomRes = await fetch(
          `https://public-api.wordpress.com/rest/v1.1/sites/${encodeURIComponent(String(siteId))}/posts/new`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(wpcomPayload),
          },
        );
        if (!wpcomRes.ok) {
          const txt = await wpcomRes.text();
          throw new Error(
            `WordPress.com publish failed (${wpcomRes.status}): ${txt.slice(0, 500)}`,
          );
        }
        const post = await wpcomRes.json();
        return new Response(
          JSON.stringify({
            success: true,
            postId: String(post?.ID),
            postUrl: post?.URL,
            status: post?.status,
            site: siteUrlMeta,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ============= Self-hosted WordPress branch (Application Password) =============
      const siteUrl: string = connection.metadata?.site_url;
      const username: string = connection.metadata?.username;
      if (!siteUrl || !username) {
        throw new Error("Connection thiếu site_url hoặc username");
      }

      const appPassword = await decryptCredential(connection.refresh_token);
      if (!appPassword) {
        throw new Error("Không decrypt được Application Password");
      }

      const authString = btoa(`${username}:${appPassword}`);

      // Upload featured image first
      let featuredMediaId: number | null = null;
      if (featuredImageUrl) {
        featuredMediaId = await uploadFeaturedImage(
          siteUrl,
          authString,
          featuredImageUrl,
          seoTitle || title,
        );
      }

      // Resolve tag/category IDs (tags by slug/name, categories by id or name)
      async function resolveTaxonomy(
        taxonomy: "tags" | "categories",
        items: Array<string | number>,
      ): Promise<number[]> {
        const ids: number[] = [];
        for (const it of items) {
          if (typeof it === "number") {
            ids.push(it);
            continue;
          }
          if (!it || typeof it !== "string") continue;
          const name = it.trim();
          if (!name) continue;
          // Search existing
          try {
            const sr = await fetch(
              `${siteUrl}/wp-json/wp/v2/${taxonomy}?search=${encodeURIComponent(name)}&per_page=5`,
              { headers: { Authorization: `Basic ${authString}` } },
            );
            if (sr.ok) {
              const arr = await sr.json();
              const match = (arr || []).find((x: any) =>
                x.name?.toLowerCase() === name.toLowerCase()
              );
              if (match?.id) {
                ids.push(match.id);
                continue;
              }
            }
            // Create
            const cr = await fetch(`${siteUrl}/wp-json/wp/v2/${taxonomy}`, {
              method: "POST",
              headers: {
                Authorization: `Basic ${authString}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ name }),
            });
            if (cr.ok) {
              const created = await cr.json();
              if (created?.id) ids.push(created.id);
            }
          } catch (e) {
            console.warn(`[publish-wordpress] resolve ${taxonomy} fail:`, e);
          }
        }
        return ids;
      }

      const tagIds = tags.length ? await resolveTaxonomy("tags", tags) : [];
      let categoryIds: number[] = categories.length
        ? await resolveTaxonomy("categories", categories)
        : [];
      if (
        !categoryIds.length && connection.metadata?.default_category_id
      ) {
        categoryIds = [Number(connection.metadata.default_category_id)];
      }

      const status = requestedStatus ||
        connection.metadata?.default_status || "publish";

      const postPayload: Record<string, unknown> = {
        title,
        content: html,
        status,
      };
      if (excerpt) postPayload.excerpt = excerpt;
      if (slug) postPayload.slug = slug;
      if (featuredMediaId) postPayload.featured_media = featuredMediaId;
      if (tagIds.length) postPayload.tags = tagIds;
      if (categoryIds.length) postPayload.categories = categoryIds;
      // Yoast / Rank Math meta — both plugins keyed; whichever is active picks up
      // (Requires plugin registered REST meta or REST API permission to write _yoast_*).
      const wpMeta: Record<string, string> = {};
      if (metaDescription) {
        wpMeta._yoast_wpseo_metadesc = String(metaDescription);
        wpMeta.rank_math_description = String(metaDescription);
      }
      if (seoTitle) {
        wpMeta._yoast_wpseo_title = String(seoTitle);
        wpMeta.rank_math_title = String(seoTitle);
      }
      if (focusKeyword) {
        wpMeta._yoast_wpseo_focuskw = String(focusKeyword);
        wpMeta.rank_math_focus_keyword = String(focusKeyword);
      }
      if (Object.keys(wpMeta).length) postPayload.meta = wpMeta;

      const r = await fetch(`${siteUrl}/wp-json/wp/v2/posts`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${authString}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postPayload),
      });

      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`WordPress publish failed (${r.status}): ${txt.slice(0, 500)}`);
      }
      const post = await r.json();

      return new Response(
        JSON.stringify({
          success: true,
          postId: String(post?.id),
          postUrl: post?.link,
          status: post?.status,
          featuredMediaId,
          tagIds,
          categoryIds,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } catch (error: any) {
      console.error("[publish-wordpress] Error:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Unknown error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  }),
);
