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

type Comment = { username: string; comment: string };

function collectComments(value: unknown, output: Comment[], seen: Set<string>, depth = 0) {
  if (depth > 35 || output.length >= 1000 || value == null) return;
  if (Array.isArray(value)) {
    for (const item of value) collectComments(item, output, seen, depth + 1);
    return;
  }
  if (typeof value !== "object") return;

  const node = value as Record<string, unknown>;
  const text = typeof node.text === "string" ? node.text.trim() : "";
  const owner = node.owner && typeof node.owner === "object" ? node.owner as Record<string, unknown> : null;
  const user = node.user && typeof node.user === "object" ? node.user as Record<string, unknown> : null;
  const username = (
    (owner && typeof owner.username === "string" && owner.username) ||
    (user && typeof user.username === "string" && user.username) ||
    (typeof node.username === "string" && node.username) ||
    ""
  ).replace(/^@/, "").trim();

  if (username && text) {
    const key = `${username.toLowerCase()}\u0000${text}`;
    if (!seen.has(key)) {
      seen.add(key);
      output.push({ username, comment: text });
    }
  }

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

async function fetchInstagramPage(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "nb-NO,nb;q=0.9,en;q=0.7",
      },
    });
    if (!response.ok) throw new Error(`Instagram svarte med status ${response.status}`);
    const length = Number(response.headers.get("content-length") || 0);
    if (length > 8_000_000) throw new Error("Instagram-svaret var for stort");
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Kun POST er støttet" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const shortcode = getShortcode(String(body?.instagram_url || ""));
    if (!shortcode) return json({ error: "Ugyldig offentlig Instagram-lenke", code: "INVALID_URL" }, 400);

    const urls = [
      `https://www.instagram.com/p/${shortcode}/`,
      `https://www.instagram.com/p/${shortcode}/embed/captioned/`,
    ];
    const comments: Comment[] = [];
    const seen = new Set<string>();

    for (const url of urls) {
      try {
        const html = await fetchInstagramPage(url);
        for (const value of parseJsonScripts(html)) collectComments(value, comments, seen);
        if (comments.length >= 500) break;
      } catch (error) {
        console.warn("Instagram fetch attempt failed", error);
      }
    }

    if (!comments.length) {
      return json({
        error: "Instagram viste ikke kommentarene offentlig akkurat nå. Bruk filimport eller lim inn kommentarer manuelt.",
        code: "COMMENTS_UNAVAILABLE",
        experimental: true,
      }, 422);
    }

    return json({
      shortcode,
      comments: comments.slice(0, 500),
      count: Math.min(comments.length, 500),
      truncated: comments.length > 500,
      experimental: true,
      fetched_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("fetch-public-instagram-comments", error);
    return json({ error: "Kunne ikke hente kommentarer fra Instagram akkurat nå", code: "FETCH_FAILED" }, 500);
  }
});
