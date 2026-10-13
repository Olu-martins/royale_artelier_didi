import { Helmet } from "react-helmet-async";
import type { RouteSEOConfig } from "@/lib/seo";
import {
  absoluteUrl,
  absoluteUrlExact,
  defaultSEOConfig,
  siteMetadata,
} from "@/lib/seo";

interface SEOProps extends RouteSEOConfig {
  path?: string;
}

const toArray = (
  data?: RouteSEOConfig["structuredData"]
): Record<string, unknown>[] => {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
};

const formatImage = (image?: string): string => {
  if (!image) return siteMetadata.defaultImage;
  if (image.startsWith("http")) return image;
  const normalized = image.startsWith("/") ? image : `/${image}`;
  return `${siteMetadata.siteUrl}${normalized}`;
};

const SEO = ({ path = "/", ...overrides }: SEOProps) => {
  const merged = { ...defaultSEOConfig, ...overrides };
  const title = merged.title ?? defaultSEOConfig.title;
  const description = merged.description ?? defaultSEOConfig.description;
  const keywords = merged.keywords ?? siteMetadata.defaultKeywords;
  const image = formatImage(merged.image);
  const imageAlt = merged.imageAlt ?? title;
  // A canonical passed in explicitly is trusted verbatim (it may intentionally
  // carry a query, e.g. /products?category=Women). One derived from the current
  // location drops the query so filters, search and tracking params all
  // consolidate onto the clean path.
  const canonicalUrl = merged.canonical
    ? absoluteUrlExact(merged.canonical)
    : absoluteUrl(path);
  const robots = merged.noIndex
    ? "noindex, nofollow"
    : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
  const structuredData = toArray(merged.structuredData);

  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={robots} />
      <meta name="googlebot" content={robots} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={merged.type || "website"} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:image:alt" content={imageAlt} />
      <meta property="og:site_name" content={siteMetadata.name} />
      <meta property="og:locale" content={siteMetadata.locale} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={siteMetadata.twitterHandle} />
      <meta name="twitter:creator" content={siteMetadata.twitterHandle} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={imageAlt} />

      {structuredData.map((schema, index) => (
        <script key={`schema-${index}`} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;
