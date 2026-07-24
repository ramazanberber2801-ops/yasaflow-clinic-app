import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
});

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const IG_APP_ID = "936619743392459";
const MAX_COMMENTS = 500;

type Comment = { username: string; comment: string };
type Strategy = "instagram-web-api" | "public-html";

function getShortcode(value: string) {
  try {
    const url = new URL(value.trim());
    if (!["instagram.com", "www.instagram.com"].includes(url.hostname.toLowerCase())) return null;
    const match = url.pathname.match(/^\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

/** Instagram shortcodes are base64-like encodings of the numeric media id. */
function shortcodeToMediaId(shortcode: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let id = 0n;
  for (const char of shortcode) {
    const value = alphabet.indexOf(char);
    if (value < 0) throw new Error("Ugyldig Instagram-shortcode");
    id = id * 64n + BigInt(value);
  }
  return id.toString();
}

function addComment(output: Comment[], seen: Set<string>, usernameValue: unknown, textValue: unknown) {
  if (output.length >= MAX_COMMENTS) return;
  const username = typeof usernameValue === "string" ? usernameValue.replace(/^@/, "").trim() : "";
  const comment = typeof textValue === "string" ? textValue.trim() : "";
  if (!username || !comment) return;
  const key = `${username.toLowerCase()}\u0000${comment}`;
  if (seen.has(key)) return;
  seen.add(key);
  output.push({ username, comment });
}

function collectComments(value: unknown, output: Comment[], seen: Set<string>, depth = 0) {
  if (depth > 35 || output.length >= MAX_COMMENTS || value == null) return;
  if (Array.isArray(value)) {
    for (const item of value) collectComments(item, output, seen, depth + 1);
    return;
  }
  if (typeof value !== "object") return;

  const node = value as Record<string, unknown>;
  const owner = node.owner && typeof node.owner === "object" ? node.owner as Record<string, unknown> : null;
  const user = node.user && typeof node.user === "object" ? node.user as Record<string, unknown> : null;
  addComment(output, seen,
    (owner && owner.username) || (user && user.username) || node.username,
    node.text,
  );

  for (const child of Object.values(node)) collectComments(child, output, seen, depth + 1);
}

function parseJsonScripts(html: string) {
  const values: unknown[] = [];
  const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(scriptPattern)) {
    const source = match[1]?.trim();
    if (!source || source.length > 8_000_000) continue;
    if (!(source.startsWith("{") || source.startsWith("["))) continue;
    try { values.push(JSON.parse(source)); } catch { /* ignore non-JSON scripts */ }
  }
  return values;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 15_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timeout);
  }
}

async function scrapeWebApi(mediaId: string, output: Comment[], seen: Set<string>) {
  let nextMinId: string | null = null;
  let pages = 0;

  do {
    const endpoint = new URL(`https://www.instagram.com/api/v1/media/${mediaId}/comments/`);
    endpoint.searchParams.set("can_support_threading", "true");
    endpoint.searchParams.set("permalink_enabled", "false");
    if (nextMinId) endpoint.searchParams.set("min_id", nextMinId);

    const response = await fetchWithTimeout(endpoint.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "X-IG-App-ID": IG_APP_ID,
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://www.instagram.com/",
      },
    });

    if (!response.ok) throw new Error(`Instagram web API svarte med status ${response.status}`);
    const payload = await response.json() as Record<string, unknown>;
    const comments = Array.isArray(payload.comments) ? payload.comments : [];
    for (const item of comments) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const user = row.user && typeof row.user === "object" ? row.user as Record<string, unknown> : null;
      addComment(output, seen, user?.username, row.text);
      collectComments(row.child_comment_count ? row.preview_child_comments : null, output, seen);
    }

    nextMinId = typeof payload.next_min_id === "string" ? payload.next_min_id : null;
    pages += 1;
  } while (nextMinId && pages < 10 && output.length < MAX_COMMENTS);
}

async function scrapePublicHtml(shortcode: string, output: Comment[], seen: Set<string>) {
  const urls = [
    `https://www.instagram.com/p/${shortcode}/`,
    `https://www.instagram.com/reel/${shortcode}/`,
    `https://www.instagram.com/p/${shortcode}/embed/captioned/`,
  ];

  for (const url of urls) {
    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "nb-NO,nb;q=0.9,en;q=0.7",
      },
    }, 12_000);
    if (!response.ok) continue;
    const html = await response.text();
    if (html.length > 8_000_000) continue;
    for (const value of parseJsonScripts(html)) collectComments(value, output, seen);
    if (output.length >= MAX_COMMENTS) break;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Kun POST er støttet" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const shortcode = getShortcode(String(body?.instagram_url || ""));
    if (!shortcode) return json({ error: "Ugyldig offentlig Instagram-lenke", code: "INVALID_URL" }, 400);

    const mediaId = shortcodeToMediaId(shortcode);
    const comments: Comment[] = [];
    const seen = new Set<string>();
    const attempted: Strategy[] = [];
    let strategy: Strategy | null = null;

    try {
      attempted.push("instagram-web-api");
      await scrapeWebApi(mediaId, comments, seen);
      if (comments.length) strategy = "instagram-web-api";
    } catch (error) {
      console.warn("Beta web API strategy failed", error);
    }

    if (!comments.length) {
      try {
        attempted.push("public-html");
        await scrapePublicHtml(shortcode, comments, seen);
        if (comments.length) strategy = "public-html";
      } catch (error) {
        console.warn("Beta public HTML strategy failed", error);
      }
    }

    if (!comments.length) {
      return json({
        error: "Beta-importen fikk ikke tilgang til kommentarene. Prøv igjen senere eller bruk filimport.",
        code: "COMMENTS_UNAVAILABLE",
        beta: true,
        attempted_strategies: attempted,
      }, 422);
    }

    return json({
      shortcode,
      media_id: mediaId,
      comments: comments.slice(0, MAX_COMMENTS),
      count: Math.min(comments.length, MAX_COMMENTS),
      truncated: comments.length >= MAX_COMMENTS,
      beta: true,
      strategy,
      attempted_strategies: attempted,
      fetched_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("fetch-public-instagram-comments beta", error);
    return json({ error: "Kunne ikke hente kommentarer fra Instagram akkurat nå", code: "FETCH_FAILED", beta: true }, 500);
  }
});