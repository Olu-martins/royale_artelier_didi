export type StructuredData = Record<string, unknown>;

export interface RouteSEOConfig {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  imageAlt?: string;
  /** Overrides the canonical derived from the current path. */
  canonical?: string;
  type?: "website" | "article" | "product" | "collection" | "profile" | string;
  noIndex?: boolean;
  structuredData?: StructuredData | StructuredData[];
}

const rawSiteUrl = import.meta.env.VITE_SITE_URL?.trim();

if (!rawSiteUrl) {
  // Deliberately fatal: falling back to a guessed origin would silently emit
  // wrong canonicals, Open Graph URLs and JSON-LD across the whole site.
  throw new Error(
    "VITE_SITE_URL is not set. Copy .env.example to .env (or set it in the " +
      "deploy environment) before building."
  );
}

export const SITE_URL = rawSiteUrl.replace(/\/$/, "");

export const siteMetadata = {
  name: "Royale Artelier",
  tagline: "Your Style Your Story",
  description:
    "Curated couture, luxury ready-to-wear, and accessories crafted to help you express modern royalty in every look.",
  siteUrl: SITE_URL,
  locale: "en_US",
  defaultImage: `${SITE_URL}/logo-full.png`,
  contactEmail: "support@royale-artelier.com",
  telephone: "+1-415-555-0134",
  twitterHandle: "@royale_artelier",
  socialProfiles: [
    "https://www.instagram.com/royaleartelier",
    "https://www.pinterest.com/royaleartelier",
    "https://x.com/royale_artelier",
  ],
  defaultKeywords:
    "royale artelier, luxury fashion, couture womenswear, couture menswear, accessories, atelier, designer boutique",
};

/** Builds an absolute, canonical URL from a route path. */
export const absoluteUrl = (path = "/"): string => {
  if (path.startsWith("http")) return path;
  const [pathname] = path.split("?");
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const trimmed =
    normalized.length > 1 ? normalized.replace(/\/$/, "") : normalized;
  // Root keeps its trailing slash so canonicals match the sitemap's home entry.
  return `${SITE_URL}${trimmed}`;
};

/**
 * Absolute URL that keeps an explicitly declared query string intact. Used for
 * canonicals we deliberately want to point at a filtered view, e.g.
 * /products?category=Women.
 */
export const absoluteUrlExact = (path = "/"): string => {
  if (path.startsWith("http")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
};

/** Truncates copy to a length search engines will actually render. */
export const truncateDescription = (text: string, max = 160): string => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/[\s,;:.-]+$/, "")}…`;
};

/**
 * Trail hrefs are declared explicitly by the caller, so their query strings are
 * meaningful (e.g. the ?category= landing page) and must survive — using the
 * query-stripping helper here would collapse distinct crumbs onto one URL.
 */
export const createBreadcrumbSchema = (
  trail: Array<{ name: string; href: string }>
): StructuredData => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: trail.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: absoluteUrlExact(item.href),
  })),
});

interface ProductSchemaInput {
  id: string;
  name: string;
  description?: string;
  images?: string[];
  brand?: string;
  category?: string;
  material?: string;
  price: number;
  priceCurrency?: string;
  inStock?: boolean;
  ratingValue?: number;
  reviewCount?: number;
}

/**
 * Product schema for rich results. Optional blocks (rating, brand) are only
 * emitted when the data really exists — Google rejects placeholder values.
 */
export const createProductSchema = ({
  id,
  name,
  description,
  images = [],
  brand,
  category,
  material,
  price,
  priceCurrency = "USD",
  inStock = true,
  ratingValue = 0,
  reviewCount = 0,
}: ProductSchemaInput): StructuredData => {
  const schema: StructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    url: absoluteUrl(`/product/${id}`),
    sku: id,
    productID: id,
    image: images.length ? images : [siteMetadata.defaultImage],
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/product/${id}`),
      price: Number(price).toFixed(2),
      priceCurrency,
      itemCondition: "https://schema.org/NewCondition",
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: siteMetadata.name },
    },
  };

  if (description) schema.description = truncateDescription(description, 300);
  if (brand) schema.brand = { "@type": "Brand", name: brand };
  if (category) schema.category = category;
  if (material) schema.material = material;

  if (reviewCount > 0 && ratingValue > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(ratingValue).toFixed(1),
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return schema;
};

export const createItemListSchema = (
  items: Array<{ id: string; name: string }>,
  listName: string
): StructuredData => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: listName,
  numberOfItems: items.length,
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    url: absoluteUrl(`/product/${item.id}`),
  })),
});

export const organizationSchema: StructuredData = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  "@id": `${SITE_URL}/#organization`,
  name: siteMetadata.name,
  url: SITE_URL,
  logo: `${SITE_URL}/logo-full.png`,
  image: `${SITE_URL}/logo-full.png`,
  slogan: siteMetadata.tagline,
  description: siteMetadata.description,
  sameAs: siteMetadata.socialProfiles,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: siteMetadata.contactEmail,
    telephone: siteMetadata.telephone,
    availableLanguage: ["English"],
  },
};

export const websiteSchema: StructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: siteMetadata.name,
  url: SITE_URL,
  description: siteMetadata.description,
  publisher: { "@id": `${SITE_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/products?search={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const staticRouteConfig: Record<string, RouteSEOConfig> = {
  "/": {
    title: `${siteMetadata.name} | ${siteMetadata.tagline}`,
    description: siteMetadata.description,
    image: siteMetadata.defaultImage,
    type: "website",
    // organizationSchema / websiteSchema are emitted statically in index.html
    // so crawlers see them without executing JS; only page schema lives here.
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Royale Artelier Home",
        url: SITE_URL,
        description: siteMetadata.description,
        isPartOf: { "@id": `${SITE_URL}/#website` },
      },
    ],
  },
  "/products": {
    title: "Shop All Collections | Royale Artelier",
    description:
      "Explore curated womenswear, menswear, and accessories with couture craftsmanship and ready-to-ship silhouettes.",
    keywords: "luxury apparel, womenswear, menswear, designer accessories",
    type: "collection",
    // Products.tsx renders its own <SEO> with category-aware CollectionPage,
    // ItemList and breadcrumb schema. Declaring any here as well would put two
    // conflicting BreadcrumbLists on the same page.
  },
  "/contact": {
    title: "Contact Concierge | Royale Artelier",
    description:
      "Speak with our client concierge team about orders, styling appointments, or bespoke requests.",
    type: "article",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        name: "Royale Artelier Concierge",
        url: `${SITE_URL}/contact`,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: siteMetadata.contactEmail,
          telephone: siteMetadata.telephone,
        },
      },
      createBreadcrumbSchema([
        { name: "Home", href: "/" },
        { name: "Contact", href: "/contact" },
      ]),
    ],
  },
  "/shipping-returns": {
    title: "Shipping & Returns | Royale Artelier",
    description:
      "Understand processing times, express delivery options, and our streamlined return policy for couture garments.",
    type: "article",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Shipping & Returns",
        url: `${SITE_URL}/shipping-returns`,
        isPartOf: { "@id": `${SITE_URL}/#website` },
      },
      createBreadcrumbSchema([
        { name: "Home", href: "/" },
        { name: "Shipping & Returns", href: "/shipping-returns" },
      ]),
    ],
  },
  "/size-guide": {
    title: "Size Guide | Royale Artelier",
    description:
      "Use our detailed measurement charts to find a couture-level fit across dresses, tailoring, and footwear.",
    type: "article",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Size Guide",
        url: `${SITE_URL}/size-guide`,
        isPartOf: { "@id": `${SITE_URL}/#website` },
      },
      createBreadcrumbSchema([
        { name: "Home", href: "/" },
        { name: "Size Guide", href: "/size-guide" },
      ]),
    ],
  },
  "/faqs": {
    title: "FAQs | Royale Artelier",
    description:
      "Answers to common questions about orders, tailoring, invitations, and membership perks.",
    type: "article",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        url: `${SITE_URL}/faqs`,
        mainEntity: [
          {
            "@type": "Question",
            name: "How long does shipping take?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Standard orders ship in 3-5 business days, with express upgrades available at checkout.",
            },
          },
          {
            "@type": "Question",
            name: "Do you offer bespoke tailoring?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes, our atelier team can tailor select garments post-purchase. Contact concierge for availability.",
            },
          },
        ],
      },
      createBreadcrumbSchema([
        { name: "Home", href: "/" },
        { name: "FAQs", href: "/faqs" },
      ]),
    ],
  },
  "/login": {
    title: "Login | Royale Artelier",
    description:
      "Access your account, saved looks, and personalized recommendations.",
    noIndex: true,
    type: "profile",
  },
  "/register": {
    title: "Register | Royale Artelier",
    description:
      "Join Royale Artelier to unlock wishlist syncing, private events, and member priority drops.",
    noIndex: true,
    type: "profile",
  },
  "/wishlist": {
    title: "Wishlist | Royale Artelier",
    description:
      "Revisit the couture pieces you love and get notified when sizes restock.",
    noIndex: true,
  },
  "/cart": {
    title: "Your Bag | Royale Artelier",
    description: "Review your curated pieces before checkout.",
    noIndex: true,
  },
  "/checkout": {
    title: "Secure Checkout | Royale Artelier",
    description:
      "Complete your purchase with encrypted payments and express shipping options.",
    noIndex: true,
  },
  "/profile": {
    title: "Profile | Royale Artelier",
    description:
      "Manage orders, addresses, and atelier appointments in one place.",
    noIndex: true,
  },
  "/forgot-password": {
    title: "Reset Your Password | Royale Artelier",
    description: "Request a link to choose a new password for your account.",
    noIndex: true,
    type: "profile",
  },
  "/reset-password": {
    title: "Choose a New Password | Royale Artelier",
    description: "Set a new password for your Royale Artelier account.",
    noIndex: true,
    type: "profile",
  },
  "/verify-email": {
    title: "Confirm Your Email | Royale Artelier",
    description: "Confirm your email address to finish setting up your account.",
    noIndex: true,
    type: "profile",
  },
};

/** Route prefixes that must never be indexed, whatever the sub-path. */
const noIndexPrefixes = [
  "/admin",
  "/checkout",
  "/cart",
  "/profile",
  "/wishlist",
  "/login",
  "/register",
  // A customer's own order or return; never indexable, and unreachable
  // without a session.
  "/orders",
  "/returns",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

const dynamicRouteConfig: Array<{
  test: (path: string) => boolean;
  config: RouteSEOConfig;
}> = [
  {
    // A single order. Titled generically on purpose: the order number is
    // personal data and does not belong in a browser title or tab.
    test: (path) => path.startsWith("/orders/"),
    config: {
      title: "Your Order | Royale Artelier",
      description: "Track the progress of your order.",
      noIndex: true,
    },
  },
  {
    // Titled generically: the return number is personal data and does not
    // belong in a browser title or a shared tab.
    test: (path) => path.startsWith("/returns/"),
    config: {
      title: "Your Return | Royale Artelier",
      description: "Track the progress of your return and refund.",
      noIndex: true,
    },
  },
  {
    test: (path) => path.startsWith("/checkout/"),
    config: {
      title: "Secure Checkout | Royale Artelier",
      description: "Completing your payment.",
      noIndex: true,
    },
  },
  {
    // ProductDetail renders its own <SEO> with the real product data; this is
    // only the placeholder shown while the product is still loading.
    test: (path) => path.startsWith("/product/"),
    config: {
      title: "Product Detail | Royale Artelier",
      description:
        "View couture craftsmanship, detailed fabrication notes, and styling inspiration for individual pieces.",
      type: "product",
    },
  },
];

export const defaultSEOConfig: RouteSEOConfig = {
  title: `${siteMetadata.name} | ${siteMetadata.tagline}`,
  description: siteMetadata.description,
  keywords: siteMetadata.defaultKeywords,
  image: siteMetadata.defaultImage,
  type: "website",
};

export const getRouteSEOConfig = (path: string): RouteSEOConfig => {
  const normalized =
    path.length > 1 ? path.replace(/\/$/, "") : path || "/";

  if (staticRouteConfig[normalized]) {
    return staticRouteConfig[normalized];
  }

  const matcher = dynamicRouteConfig.find((entry) => entry.test(normalized));
  if (matcher) {
    return matcher.config;
  }

  if (noIndexPrefixes.some((prefix) => normalized.startsWith(prefix))) {
    return {
      title: `${siteMetadata.name} | ${siteMetadata.tagline}`,
      noIndex: true,
    };
  }

  // Unknown route -> the SPA renders the 404 view, so keep it out of the index.
  return {
    title: "Page Not Found | Royale Artelier",
    description:
      "The page you are looking for is no longer available. Explore the current collection instead.",
    noIndex: true,
  };
};
