import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import SEO from "@/components/SEO";
import {
  SITE_URL,
  createBreadcrumbSchema,
  createProductSchema,
  getRouteSEOConfig,
  truncateDescription,
} from "@/lib/seo";

const renderSEO = (props: Parameters<typeof SEO>[0]) =>
  render(
    <HelmetProvider>
      <SEO {...props} />
    </HelmetProvider>
  );

const head = {
  metaByName: (name: string) =>
    [...document.head.querySelectorAll(`meta[name="${name}"]`)].map(
      (el) => el.getAttribute("content") ?? ""
    ),
  metaByProperty: (property: string) =>
    [...document.head.querySelectorAll(`meta[property="${property}"]`)].map(
      (el) => el.getAttribute("content") ?? ""
    ),
  canonicals: () =>
    [...document.head.querySelectorAll('link[rel="canonical"]')].map(
      (el) => el.getAttribute("href") ?? ""
    ),
  jsonLd: () =>
    [...document.head.querySelectorAll('script[type="application/ld+json"]')]
      .map((el) => JSON.parse(el.textContent ?? "{}")),
};

afterEach(() => {
  cleanup();
  document.head.querySelectorAll("[data-rh]").forEach((el) => el.remove());
});

describe("SEO head output", () => {
  it("emits exactly one canonical, description and robots tag", async () => {
    renderSEO({ path: "/faqs", ...getRouteSEOConfig("/faqs") });

    await waitFor(() => expect(head.canonicals()).toHaveLength(1));
    expect(head.canonicals()[0]).toBe(`${SITE_URL}/faqs`);
    expect(head.metaByName("description")).toHaveLength(1);
    expect(head.metaByName("robots")).toHaveLength(1);
    expect(head.metaByName("robots")[0]).toContain("index, follow");
    expect(document.title).toBe("FAQs | Royale Artelier");
  });

  it("gives the home page a trailing-slash canonical matching the sitemap", async () => {
    renderSEO({ path: "/", ...getRouteSEOConfig("/") });
    await waitFor(() => expect(head.canonicals()).toHaveLength(1));
    expect(head.canonicals()[0]).toBe(`${SITE_URL}/`);
  });

  it("strips query strings from a derived canonical", async () => {
    renderSEO({ path: "/products?category=Women&sort=price" });
    await waitFor(() => expect(head.canonicals()).toHaveLength(1));
    expect(head.canonicals()[0]).toBe(`${SITE_URL}/products`);
  });

  it("keeps an explicitly declared canonical query intact", async () => {
    renderSEO({
      path: "/products?category=Women&sort=price",
      canonical: "/products?category=Women",
    });
    await waitFor(() => expect(head.canonicals()).toHaveLength(1));
    expect(head.canonicals()[0]).toBe(`${SITE_URL}/products?category=Women`);
  });

  it("marks private routes noindex", async () => {
    renderSEO({ path: "/checkout", ...getRouteSEOConfig("/checkout") });
    await waitFor(() =>
      expect(head.metaByName("robots")[0]).toBe("noindex, nofollow")
    );
  });

  it("emits absolute social images and og:url matching the canonical", async () => {
    renderSEO({ path: "/", ...getRouteSEOConfig("/") });
    await waitFor(() => expect(head.metaByProperty("og:image")).toHaveLength(1));
    expect(head.metaByProperty("og:image")[0]).toMatch(/^https?:\/\//);
    expect(head.metaByProperty("og:url")[0]).toBe(head.canonicals()[0]);
    expect(head.metaByName("twitter:card")[0]).toBe("summary_large_image");
  });

  it("renders page structured data as valid JSON-LD", async () => {
    renderSEO({ path: "/faqs", ...getRouteSEOConfig("/faqs") });
    await waitFor(() => expect(head.jsonLd().length).toBeGreaterThan(0));
    const types = head.jsonLd().map((s) => s["@type"]);
    expect(types).toContain("FAQPage");
    expect(types).toContain("BreadcrumbList");
  });
});

describe("route config", () => {
  it("noindexes unknown (404) routes", () => {
    expect(getRouteSEOConfig("/does-not-exist").noIndex).toBe(true);
  });

  it("noindexes every admin sub-route", () => {
    expect(getRouteSEOConfig("/admin").noIndex).toBe(true);
    expect(getRouteSEOConfig("/admin/products/edit/abc").noIndex).toBe(true);
  });

  it("indexes public content routes", () => {
    for (const route of ["/", "/products", "/contact", "/faqs"]) {
      expect(getRouteSEOConfig(route).noIndex).toBeFalsy();
    }
  });

  it("treats a trailing slash as the same route", () => {
    expect(getRouteSEOConfig("/faqs/").title).toBe(
      getRouteSEOConfig("/faqs").title
    );
  });

  it("leaves product detail schema to the page component", () => {
    expect(getRouteSEOConfig("/product/abc").structuredData).toBeUndefined();
  });
});

describe("breadcrumb schema", () => {
  it("keeps category query strings so crumbs stay distinct", () => {
    const schema = createBreadcrumbSchema([
      { name: "Home", href: "/" },
      { name: "Shop", href: "/products" },
      { name: "Women", href: "/products?category=Women" },
    ]);
    const items = (
      schema.itemListElement as Array<{ item: string; position: number }>
    ).map((entry) => entry.item);

    expect(items).toEqual([
      `${SITE_URL}/`,
      `${SITE_URL}/products`,
      `${SITE_URL}/products?category=Women`,
    ]);
    expect(new Set(items).size).toBe(items.length);
  });
});

describe("product schema", () => {
  const base = {
    id: "abc",
    name: "Silk Gown",
    price: 250,
    inStock: true,
  };

  it("builds a valid offer", () => {
    const schema = createProductSchema(base) as Record<string, never>;
    const offers = schema.offers as unknown as Record<string, string>;
    expect(offers.price).toBe("250.00");
    expect(offers.priceCurrency).toBe("USD");
    expect(offers.availability).toBe("https://schema.org/InStock");
    expect(schema.url).toBe(`${SITE_URL}/product/abc`);
  });

  it("marks sold-out items out of stock", () => {
    const schema = createProductSchema({ ...base, inStock: false });
    const offers = schema.offers as Record<string, string>;
    expect(offers.availability).toBe("https://schema.org/OutOfStock");
  });

  it("omits aggregateRating when there are no reviews", () => {
    expect(createProductSchema(base).aggregateRating).toBeUndefined();
    expect(
      createProductSchema({ ...base, ratingValue: 4.5, reviewCount: 0 })
        .aggregateRating
    ).toBeUndefined();
  });

  it("includes aggregateRating once reviews exist", () => {
    const rating = createProductSchema({
      ...base,
      ratingValue: 4.25,
      reviewCount: 8,
    }).aggregateRating as Record<string, unknown>;
    expect(rating.ratingValue).toBe("4.3");
    expect(rating.reviewCount).toBe(8);
  });

  it("falls back to the site image when a product has none", () => {
    expect(createProductSchema(base).image).toEqual([
      `${SITE_URL}/logo-full.png`,
    ]);
  });
});

describe("truncateDescription", () => {
  it("leaves short copy untouched", () => {
    expect(truncateDescription("A short line.")).toBe("A short line.");
  });

  it("caps long copy at the limit", () => {
    const result = truncateDescription("word ".repeat(100));
    expect(result.length).toBeLessThanOrEqual(160);
    expect(result.endsWith("…")).toBe(true);
  });

  it("collapses whitespace", () => {
    expect(truncateDescription("a\n\n  b   c")).toBe("a b c");
  });
});
