import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export const config = {
  maxDuration: 60,
};

const MAX_COMMENTS = 500;

function validInstagramUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return ["instagram.com", "www.instagram.com"].includes(url.hostname.toLowerCase())
      && /^\/(p|reel|reels|tv)\/[A-Za-z0-9_-]+/i.test(url.pathname);
  } catch {
    return false;
  }
}

function addComment(output, seen, usernameValue, textValue) {
  if (output.length >= MAX_COMMENTS) return;
  const username = typeof usernameValue === "string" ? usernameValue.replace(/^@/, "").trim() : "";
  const comment = typeof textValue === "string" ? textValue.trim() : "";
  if (!username || !comment) return;
  const key = `${username.toLowerCase()}\u0000${comment}`;
  if (seen.has(key)) return;
  seen.add(key);
  output.push({ username, comment });
}

function collectFromPayload(value, output, seen, depth = 0) {
  if (!value || depth > 30 || output.length >= MAX_COMMENTS) return;
  if (Array.isArray(value)) {
    for (const item of value) collectFromPayload(item, output, seen, depth + 1);
    return;
  }
  if (typeof value !== "object") return;
  const row = value;
  const user = row.user && typeof row.user === "object" ? row.user : null;
  const owner = row.owner && typeof row.owner === "object" ? row.owner : null;
  addComment(output, seen, user?.username || owner?.username || row.username, row.text);
  for (const child of Object.values(row)) collectFromPayload(child, output, seen, depth + 1);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Kun POST er støttet" });

  const instagramUrl = String(req.body?.instagram_url || "").trim();
  if (!validInstagramUrl(instagramUrl)) {
    return res.status(400).json({ error: "Ugyldig offentlig Instagram-lenke", code: "INVALID_URL", beta: true });
  }

  let browser;
  const comments = [];
  const seen = new Set();
  const diagnostics = { apiResponses: 0, pageStatus: null, loginWall: false };

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 900 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0 Safari/537.36");
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9,nb;q=0.8",
    });

    page.on("response", async (response) => {
      const url = response.url();
      if (!/instagram\.com\/(api\/v1\/media\/.*\/comments|graphql\/query)/i.test(url)) return;
      try {
        const contentType = response.headers()["content-type"] || "";
        if (!contentType.includes("json")) return;
        const payload = await response.json();
        diagnostics.apiResponses += 1;
        collectFromPayload(payload, comments, seen);
      } catch {
        // Ignore responses that disappear or cannot be decoded.
      }
    });

    const response = await page.goto(instagramUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    diagnostics.pageStatus = response?.status() || null;
    await new Promise((resolve) => setTimeout(resolve, 3500));

    const bodyText = await page.evaluate(() => document.body?.innerText || "");
    diagnostics.loginWall = /log in|sign up|logg inn|registrer deg/i.test(bodyText);

    for (let attempt = 0; attempt < 12 && comments.length < MAX_COMMENTS; attempt += 1) {
      const clicked = await page.evaluate(() => {
        const candidates = [...document.querySelectorAll("button, [role='button'], span")];
        const target = candidates.find((element) => {
          const text = (element.textContent || "").trim();
          return /view all .* comments|load more comments|view more comments|vis alle .* kommentarer|last inn flere kommentarer/i.test(text);
        });
        if (!target) return false;
        target.click();
        return true;
      });
      if (!clicked) break;
      await new Promise((resolve) => setTimeout(resolve, 1800));
    }

    const domRows = await page.evaluate(() => {
      const rows = [];
      for (const article of document.querySelectorAll("article")) {
        const links = [...article.querySelectorAll("a[href^='/']")];
        for (const link of links) {
          const username = (link.textContent || "").trim();
          if (!/^[A-Za-z0-9._]{1,30}$/.test(username)) continue;
          const container = link.closest("li, div");
          const text = (container?.innerText || "").trim();
          if (!text || text === username || text.length > 2200) continue;
          const comment = text.split("\n").filter(Boolean).filter((part) => part !== username).join(" ").trim();
          if (comment) rows.push({ username, comment });
        }
      }
      return rows.slice(0, 1000);
    });

    for (const row of domRows) addComment(comments, seen, row.username, row.comment);

    if (!comments.length) {
      return res.status(422).json({
        error: "Nettleser-betaen fikk ikke tilgang til kommentarene. Instagram viste trolig en innloggings- eller botkontroll.",
        code: "COMMENTS_UNAVAILABLE",
        beta: true,
        strategy: "vercel-headless-chromium",
        diagnostics,
      });
    }

    return res.status(200).json({
      comments: comments.slice(0, MAX_COMMENTS),
      count: Math.min(comments.length, MAX_COMMENTS),
      truncated: comments.length >= MAX_COMMENTS,
      beta: true,
      strategy: "vercel-headless-chromium",
      diagnostics,
      fetched_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("instagram-comments-browser beta", error);
    return res.status(500).json({
      error: "Nettleser-betaen kunne ikke starte eller fullføre hentingen",
      code: "BROWSER_FETCH_FAILED",
      beta: true,
      detail: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
