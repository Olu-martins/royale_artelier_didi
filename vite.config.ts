import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

const requireEnv = (env: Record<string, string>, key: string) => {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(
      `${key} is not set. Copy .env.example to .env (or set it in the deploy ` +
        "environment) before building.",
    );
  }
  return value;
};

const originOf = (url: string) => {
  try {
    return new URL(url).origin;
  } catch {
    throw new Error(`Expected an absolute URL, received: ${url}`);
  }
};

/**
 * Fills the %SITE_URL% / %API_ORIGIN% placeholders in index.html so the static
 * JSON-LD and preconnect hints always match the deployed origin.
 */
const htmlSeoPlaceholders = (env: Record<string, string>): Plugin => {
  const siteUrl = requireEnv(env, "VITE_SITE_URL").replace(/\/$/, "");
  const apiOrigin = originOf(requireEnv(env, "VITE_API_BASE_URL"));

  return {
    name: "html-seo-placeholders",
    transformIndexHtml: {
      // Must run before vite:build-html, which parses (and decodeURI-s) the
      // href attributes the placeholders sit in.
      order: "pre",
      handler: (html: string) =>
        html
          .replaceAll("__SITE_URL__", siteUrl)
          .replaceAll("__API_ORIGIN__", apiOrigin),
    },
  };
};

const APP_NAME = "Royale Artelier";
const APP_DESCRIPTION =
  "Curated couture, luxury ready-to-wear, and accessories for modern royalty.";

/**
 * Installable PWA + offline app shell.
 *
 * Deliberate choices:
 * - robots.txt / sitemap.xml are NOT precached; they are regenerated each build
 *   and a stale cached copy would be served to anyone opening them directly.
 * - Only public, unauthenticated API reads are runtime-cached. Cart, auth,
 *   orders, profile and every admin endpoint always hit the network so a signed
 *   -in shopper can never be served another session's data from the cache.
 */
const pwa = () =>
  VitePWA({
    registerType: "autoUpdate",
    injectRegister: "auto",
    includeAssets: ["favicon.ico", "apple-touch-icon-180x180.png"],
    manifest: {
      id: "/",
      name: APP_NAME,
      short_name: "Artelier",
      description: APP_DESCRIPTION,
      start_url: "/?source=pwa",
      scope: "/",
      display: "standalone",
      orientation: "portrait-primary",
      background_color: "#f8f5f1",
      theme_color: "#0b0b0b",
      lang: "en",
      dir: "ltr",
      categories: ["shopping", "lifestyle"],
      icons: [
        { src: "/pwa-64x64.png", sizes: "64x64", type: "image/png" },
        { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
        {
          src: "/pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/maskable-icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
      shortcuts: [
        {
          name: "Shop all",
          url: "/products",
          icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
        },
        {
          name: "New arrivals",
          url: "/products?isNew=true",
          icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
        },
        {
          name: "Your bag",
          url: "/cart",
          icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
        },
      ],
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html,woff2}", "pwa-*.png", "favicon.ico"],
      // SEO/verification files must always come from the network.
      globIgnores: ["**/robots.txt", "**/sitemap.xml", "**/google*.html"],
      navigateFallback: "/index.html",
      navigateFallbackDenylist: [
        /^\/api\//,
        /^\/robots\.txt$/,
        /^\/sitemap\.xml$/,
        /^\/google.*\.html$/,
      ],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,
      runtimeCaching: [
        {
          urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com",
          handler: "StaleWhileRevalidate",
          options: { cacheName: "google-fonts-stylesheets" },
        },
        {
          urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
          handler: "CacheFirst",
          options: {
            cacheName: "google-fonts-webfonts",
            expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: ({ url, request }) =>
            request.destination === "image" &&
            (url.hostname.endsWith("res.cloudinary.com") ||
              url.hostname.endsWith("images.unsplash.com") ||
              url.hostname.endsWith("plus.unsplash.com")),
          handler: "CacheFirst",
          options: {
            cacheName: "product-images",
            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          // Public catalogue reads only — never authenticated endpoints.
          urlPattern: ({ url, request }) =>
            request.method === "GET" &&
            /\/api\/(products|categories|settings)(\/|\?|$)/.test(
              url.pathname + url.search
            ),
          handler: "NetworkFirst",
          options: {
            cacheName: "catalogue-api",
            networkTimeoutSeconds: 5,
            expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
    devOptions: {
      // Keep the service worker out of `npm run dev`; stale precaching during
      // HMR is more confusing than useful. Test it with build + preview.
      enabled: false,
    },
  });

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: "0.0.0.0",
      // 5001, and strict: macOS Control Centre (AirPlay Receiver) holds 5000,
      // and the API only whitelists localhost:5000 and :5001 for CORS. Letting
      // Vite silently fall through to 5002+ makes every API call fail CORS,
      // which looks like a broken backend rather than a busy port.
      port: 5001,
      strictPort: true,
      allowedHosts: true,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), htmlSeoPlaceholders(env), pwa()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
