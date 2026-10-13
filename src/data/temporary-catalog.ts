import catalogFile from "../../temporary-data/products.json";
import type {
  PageRequest,
  Paginated,
  Product,
  ProductAvailability,
  ProductFacets,
  ProductFilters,
  ProductSort,
} from "@/services/api";

/**
 * Storefront catalogue while the database is unavailable.
 * Prices and photo URLs stay as they were returned by the API.
 */

type RawProduct = {
  id: string;
  name: string;
  priceNaira?: string | number | null;
  priceUsd?: string | number | null;
  priceGbp?: string | number | null;
  price: string | number;
  originalPrice?: string | number | null;
  description?: string | null;
  images?: string[] | null;
  category?: string | null;
  subcategory?: string | null;
  sizes?: string[] | null;
  colors?: Array<{ name?: string; hex?: string }> | null;
  brand?: string | null;
  rating?: string | number | null;
  reviews?: number | null;
  isNew?: boolean;
  isSale?: boolean;
  inStock?: boolean;
  material?: string | null;
  careInstructions?: string[] | null;
  returnDays?: number | null;
  sizeGuideImage?: string | null;
  createdAt?: string;
};

const USD_TO = { NGN: 1550, GBP: 0.79 } as const;

const asNumber = (value: string | number | null | undefined) => {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalize = (raw: RawProduct): Product & { createdAt?: string } => ({
  id: raw.id,
  name: raw.name,
  priceNaira: asNumber(raw.priceNaira),
  priceUsd: asNumber(raw.priceUsd),
  priceGbp: asNumber(raw.priceGbp),
  price: asNumber(raw.price),
  originalPrice:
    raw.originalPrice == null ? undefined : asNumber(raw.originalPrice),
  description: raw.description ?? "",
  images: raw.images ?? [],
  category: raw.category ?? "",
  subcategory: raw.subcategory ?? "",
  sizes: raw.sizes ?? [],
  colors: (raw.colors ?? [])
    .filter((color) => color?.name && color?.hex)
    .map((color) => ({ name: color.name as string, hex: color.hex as string })),
  brand: raw.brand ?? "",
  rating: asNumber(raw.rating),
  reviews: raw.reviews ?? 0,
  isNew: Boolean(raw.isNew),
  isSale: Boolean(raw.isSale),
  inStock: raw.inStock !== false,
  material: raw.material ?? undefined,
  careInstructions: raw.careInstructions ?? undefined,
  returnDays: raw.returnDays ?? undefined,
  sizeGuideImage: raw.sizeGuideImage ?? undefined,
  createdAt: raw.createdAt,
});

const catalog = (
  (catalogFile as { data?: RawProduct[] }).data ?? []
).map(normalize);

/** Same currency choice the shop uses when a column is missing. */
export const priceIn = (product: Product, currency?: string) => {
  const usdBase = Number(product.priceUsd ?? product.price ?? 0);
  const ngn = Number(product.priceNaira ?? 0);
  const gbp = Number(product.priceGbp ?? 0);

  if (currency === "NGN") {
    if (ngn > 0) return ngn;
    if (usdBase > 0) return Number((usdBase * USD_TO.NGN).toFixed(2));
    return 0;
  }
  if (currency === "GBP") {
    if (gbp > 0) return gbp;
    if (usdBase > 0) return Number((usdBase * USD_TO.GBP).toFixed(2));
    return 0;
  }
  if (usdBase > 0) return usdBase;
  if (ngn > 0) return Number((ngn / USD_TO.NGN).toFixed(2));
  if (gbp > 0) return Number((gbp / USD_TO.GBP).toFixed(2));
  return 0;
};

const includesAny = (selected: string | undefined, values: string[]) => {
  if (!selected) return true;
  const wanted = selected
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  if (wanted.length === 0) return true;
  const have = values.map((value) => value.toLowerCase());
  return wanted.some((value) => have.includes(value));
};

const matches = (product: Product, filters?: ProductFilters) => {
  if (!filters) return true;
  if (filters.category && !includesAny(filters.category, [product.category])) {
    return false;
  }
  if (
    filters.subcategory &&
    !includesAny(filters.subcategory, [product.subcategory])
  ) {
    return false;
  }
  if (filters.brand && !includesAny(filters.brand, [product.brand])) {
    return false;
  }
  if (filters.sizes && !includesAny(filters.sizes, product.sizes)) {
    return false;
  }
  if (
    filters.colors &&
    !includesAny(
      filters.colors,
      product.colors.map((color) => color.name),
    )
  ) {
    return false;
  }
  if (filters.inStock && !product.inStock) return false;
  if (filters.isNew && !product.isNew) return false;
  if (filters.isSale && !product.isSale) return false;

  if (filters.minPrice != null || filters.maxPrice != null) {
    const price = priceIn(product, filters.currency);
    if (filters.minPrice != null && price < filters.minPrice) return false;
    if (filters.maxPrice != null && price > filters.maxPrice) return false;
  }

  const search = filters.search?.trim().toLowerCase();
  if (search) {
    const haystack = [
      product.name,
      product.brand,
      product.category,
      product.subcategory,
      product.description,
      product.material,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(search)) return false;
  }

  return true;
};

const bySort = (sort: ProductSort | undefined, currency?: string) => {
  if (sort === "price-low" || sort === "price-high") {
    const direction = sort === "price-low" ? 1 : -1;
    return (a: Product, b: Product) =>
      (priceIn(a, currency) - priceIn(b, currency)) * direction;
  }
  if (sort === "newest") {
    return (
      a: Product & { createdAt?: string },
      b: Product & { createdAt?: string },
    ) =>
      new Date(b.createdAt ?? 0).getTime() -
      new Date(a.createdAt ?? 0).getTime();
  }
  if (sort === "rating") {
    return (a: Product, b: Product) => b.rating - a.rating;
  }
  return () => 0;
};

export const getTemporaryProducts = (
  filters?: ProductFilters,
  pagination?: PageRequest,
): Paginated<Product> => {
  const matched = catalog
    .filter((product) => matches(product, filters))
    .sort(bySort(filters?.sort, filters?.currency));

  const page = pagination?.page && pagination.page > 0 ? pagination.page : 1;
  const pageSize =
    pagination?.pageSize && pagination.pageSize > 0 ? pagination.pageSize : 24;
  const start = (page - 1) * pageSize;
  const data = matched.slice(start, start + pageSize);
  const total = matched.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
    hasMore: page < totalPages,
  };
};

export const getTemporaryProduct = (id: string): Product => {
  const product = catalog.find((item) => item.id === id);
  if (!product) {
    throw new Error("Product not found");
  }
  return product;
};

export const getTemporaryFacets = (currency?: string): ProductFacets => {
  const prices = catalog.map((product) => priceIn(product, currency));
  return {
    brands: [...new Set(catalog.map((product) => product.brand).filter(Boolean))].sort(),
    categories: [
      ...new Set(catalog.map((product) => product.category).filter(Boolean)),
    ].sort(),
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
  };
};

/** No per-size stock rows in the snapshot; the product flag decides availability. */
export const getTemporaryAvailability = (
  id: string,
): ProductAvailability => {
  getTemporaryProduct(id);
  return { tracked: false, variants: [] };
};
