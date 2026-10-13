#!/usr/bin/env node
/**
 * Generates public/sitemap.xml and public/robots.txt from the live catalogue
 * and VITE_SITE_URL, so no origin is ever hardcoded in the repo.
 *
 * Runs as a prebuild step. If the API is unreachable (offline build, cold
 * Render instance) it still writes a sitemap containing the static routes
 * rather than failing the build.
 */
import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const FETCH_TIMEOUT_MS = 20_000;
const FETCH_ATTEMPTS = 4;
const RETRY_DELAY_MS = 5_000;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Minimal .env reader. Vite loads these itself, but this script runs under
 * plain Node before the build, so it has to parse the file on its own.
 * Real environment variables (CI, Netlify, Vercel) always win.
 */
const loadDotEnv = async () => {
  const values = {};
  for (const file of [".env", ".env.local"]) {
    let contents;
    try {
      contents = await readFile(path.join(ROOT, file), "utf8");
    } catch {
      continue;
    }
    for (const line of contents.split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (!match || line.trimStart().startsWith("#")) continue;
      const [, key, rawValue = ""] = match;
      values[key] = rawValue.trim().replace(/^["'](.*)["']$/, "$1");
    }
  }
  return { ...values, ...process.env };
};

const requireEnv = (env, key) => {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(
      `${key} is not set. Copy .env.example to .env (or set it in the deploy ` +
        "environment) before building."
    );
  }
  return value;
};

const env = await loadDotEnv();

const SITE_URL = requireEnv(env, "VITE_SITE_URL").replace(/\/$/, "");
// The server mounts every route under /api, but the base URL is sometimes
// configured as a bare origin — accept either form.
const rawApiBaseUrl = requireEnv(env, "VITE_API_BASE_URL").replace(/\/$/, "");
const API_BASE_URL = rawApiBaseUrl.endsWith("/api")
  ? rawApiBaseUrl
  : `${rawApiBaseUrl}/api`;

const SITEMAP_OUTPUT = path.join(ROOT, "public/sitemap.xml");
const ROBOTS_OUTPUT = path.join(ROOT, "public/robots.txt");

/** Public, indexable routes. Account/admin/checkout routes are excluded. */
const staticRoutes = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/products", changefreq: "daily", priority: "0.9" },
  { loc: "/products?isNew=true", changefreq: "daily", priority: "0.8" },
  { loc: "/products?isSale=true", changefreq: "daily", priority: "0.8" },
  { loc: "/contact", changefreq: "monthly", priority: "0.5" },
  { loc: "/shipping-returns", changefreq: "monthly", priority: "0.5" },
  { loc: "/size-guide", changefreq: "monthly", priority: "0.5" },
  { loc: "/faqs", changefreq: "monthly", priority: "0.5" },
];

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchOnce = async (endpoint) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Retries with backoff: the API is hosted on a free tier that answers 503
 * while the instance cold-starts, which would otherwise silently truncate the
 * sitemap to its static routes.
 */
const fetchJson = async (endpoint) => {
  let lastError;
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt += 1) {
    try {
      return await fetchOnce(endpoint);
    } catch (error) {
      lastError = error;
      if (attempt < FETCH_ATTEMPTS) {
        const delay = RETRY_DELAY_MS * attempt;
        console.warn(
          `[sitemap] ${endpoint} failed (${error.message}); ` +
            `retry ${attempt}/${FETCH_ATTEMPTS - 1} in ${delay / 1000}s`
        );
        await sleep(delay);
      }
    }
  }
  throw lastError;
};

const toIsoDate = (value) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 10)
    : date.toISOString().slice(0, 10);
};

const urlEntry = ({ loc, lastmod, changefreq, priority, images = [] }) => {
  const lines = [
    "  <url>",
    `    <loc>${escapeXml(`${SITE_URL}${loc}`)}</loc>`,
  ];
  if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
  if (changefreq) lines.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) lines.push(`    <priority>${priority}</priority>`);
  for (const image of images) {
    lines.push(
      "    <image:image>",
      `      <image:loc>${escapeXml(image.loc)}</image:loc>`,
      ...(image.title
        ? [`      <image:title>${escapeXml(image.title)}</image:title>`]
        : []),
      "    </image:image>"
    );
  }
  lines.push("  </url>");
  return lines.join("\n");
};

const buildRobots = () =>
  [
    `# ${SITE_URL}/robots.txt`,
    "# Generated by scripts/generate-sitemap.mjs from VITE_SITE_URL.",
    "",
    "User-agent: *",
    "Allow: /",
    "",
    "# Account, admin and funnel routes: no crawl value, and gated behind auth.",
    "Disallow: /admin",
    "Disallow: /checkout",
    "Disallow: /cart",
    "Disallow: /wishlist",
    "Disallow: /profile",
    "Disallow: /login",
    "Disallow: /register",
    "",
    "# Search result pages stay crawlable so Googlebot can read the noindex tag",
    "# they serve and still follow through to the product pages.",
    "",
    "# Ad and image crawlers need product pages for shopping/image results.",
    "User-agent: AdsBot-Google",
    "Allow: /",
    "",
    "User-agent: Googlebot-Image",
    "Allow: /",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");

const main = async () => {
  const entries = [...staticRoutes];
  const today = toIsoDate();

  let products = [];
  let categories = [];

  /** Walks every page so the sitemap covers the whole catalogue, not page 1. */
  const fetchAllProducts = async () => {
    const collected = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const result = await fetchJson(`/products?page=${page}&pageSize=100`);
      const rows = Array.isArray(result) ? result : (result?.data ?? []);
      collected.push(...rows);
      // Tolerate the pre-pagination array response so an older deployed API
      // still produces a sitemap instead of looping forever.
      hasMore = Array.isArray(result) ? false : Boolean(result?.hasMore);
      page += 1;
      if (page > 200) break;
    }
    return collected;
  };

  try {
    [products, categories] = await Promise.all([
      fetchAllProducts(),
      fetchJson("/categories").catch(() => []),
    ]);
  } catch (error) {
    console.warn(
      `[sitemap] Could not reach ${API_BASE_URL} (${error.message}). ` +
        "Writing static routes only."
    );
  }

  if (Array.isArray(categories)) {
    for (const category of categories) {
      if (!category?.name) continue;
      entries.push({
        loc: `/products?category=${encodeURIComponent(category.name)}`,
        lastmod: today,
        changefreq: "daily",
        priority: "0.8",
      });
    }
  }

  if (Array.isArray(products)) {
    for (const product of products) {
      if (!product?.id) continue;
      entries.push({
        loc: `/product/${encodeURIComponent(product.id)}`,
        lastmod: toIsoDate(product.updatedAt || product.createdAt),
        changefreq: "weekly",
        priority: "0.7",
        images: (Array.isArray(product.images) ? product.images : [])
          .slice(0, 5)
          .filter((src) => typeof src === "string" && src.startsWith("http"))
          .map((src) => ({ loc: src, title: product.name })),
      });
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...entries.map(urlEntry),
    "</urlset>",
    "",
  ].join("\n");

  await writeFile(SITEMAP_OUTPUT, xml, "utf8");
  console.log(
    `[sitemap] Wrote ${entries.length} URLs to public/sitemap.xml (${SITE_URL})`
  );

  await writeFile(ROBOTS_OUTPUT, buildRobots(), "utf8");
  console.log(`[sitemap] Wrote public/robots.txt (${SITE_URL})`);
};

main().catch((error) => {
  console.error("[sitemap] Generation failed:", error);
  process.exitCode = 1;
});
