import React, { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SlidersHorizontal, Grid3X3, LayoutList } from "lucide-react";
import Layout from "@/components/layout/Layout";
import ProductCard from "@/components/products/ProductCard";
import ProductFilters, {
  FilterState,
} from "@/components/products/ProductFilters";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useProductsData } from "@/hooks/use-products";
import { getTemporaryFacets } from "@/data/temporary-catalog";
import { useQuery } from "@tanstack/react-query";
import {
  ProductFilters as ProductQuery,
  ProductSort,
} from "@/services/api";
import TablePagination from "@/components/ui/table-pagination";
import { useCategories } from "@/contexts/CategoriesContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import SEO from "@/components/SEO";
import {
  createBreadcrumbSchema,
  createItemListSchema,
  siteMetadata,
} from "@/lib/seo";

const initialFilters: FilterState = {
  category: [],
  subcategory: [],
  brand: [],
  size: [],
  color: [],
  priceRange: [0, 500],
  isNew: false,
  isSale: false,
};

const PAGE_SIZE = 24;

const Products = () => {
  const [searchParams] = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const [sortBy, setSortBy] = useState<ProductSort>("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { getProductPrice, currency } = useCurrency();

  // Facets come from the whole catalogue. They cannot be derived from the
  // current page any more, and deriving them from it would make the brand list
  // and price slider change every time you paged.
  const { data: facets } = useQuery({
    queryKey: ["product-facets", currency],
    queryFn: () => getTemporaryFacets(currency),
    staleTime: 1000 * 60 * 5,
  });

  const maxPrice = facets?.maxPrice && facets.maxPrice > 0 ? facets.maxPrice : 500;
  const brandOptions = facets?.brands ?? [];

  // Initialize filters from URL params
  const urlDrivenFilters = useMemo<FilterState>(() => {
    const params = new URLSearchParams(searchParamsKey);
    const category = params.get("category");
    const isNew = params.get("isNew");
    const isSale = params.get("isSale");

    return {
      ...initialFilters,
      category: category ? [category] : [],
      isNew: isNew === "true",
      isSale: isSale === "true",
      priceRange: [0, maxPrice],
    };
  }, [searchParamsKey, maxPrice]);

  const [filters, setFilters] = useState<FilterState>(urlDrivenFilters);

  // Whether the shopper actually moved the price slider. Inferring this by
  // comparing the range against maxPrice is unreliable: maxPrice starts at a
  // placeholder and only becomes correct once facets load (and its units change
  // with the currency), so for one render the stale range looks like a
  // deliberate filter and fires a query that excludes everything.
  const [priceDirty, setPriceDirty] = useState(false);

  useEffect(() => {
    setFilters(urlDrivenFilters);
    setPriceDirty(false);
  }, [urlDrivenFilters]);

  const handleFilterChange = (next: FilterState) => {
    if (
      next.priceRange[0] !== filters.priceRange[0] ||
      next.priceRange[1] !== filters.priceRange[1]
    ) {
      setPriceDirty(true);
    }
    setFilters(next);
  };

  const searchQuery = searchParams.get("search") || "";

  // Translate the sidebar's UI state into server filters. Everything that
  // narrows the result set must go to the server, otherwise a page of 24 rows
  // would be filtered down to a handful client-side and the pager would report
  // counts that don't match what is on screen.
  const serverFilters = useMemo(() => {
    const built: ProductQuery = { currency, sort: sortBy };
    if (searchQuery) built.search = searchQuery;
    if (filters.category.length) built.category = filters.category.join(",");
    if (filters.subcategory.length)
      built.subcategory = filters.subcategory.join(",");
    if (filters.brand.length) built.brand = filters.brand.join(",");
    if (filters.size.length) built.sizes = filters.size.join(",");
    if (filters.color.length) built.colors = filters.color.join(",");
    if (priceDirty) {
      built.minPrice = filters.priceRange[0];
      built.maxPrice = filters.priceRange[1];
    }
    if (filters.isNew) built.isNew = true;
    if (filters.isSale) built.isSale = true;
    return built;
  }, [filters, searchQuery, sortBy, currency, priceDirty]);

  const {
    data: result,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useProductsData(serverFilters, { page, pageSize: PAGE_SIZE });

  const products = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 0;

  // Any change to the query must return to page 1 — staying on page 5 of a
  // narrower result set would show an empty grid.
  const filterKey = JSON.stringify(serverFilters);
  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  // Sorting and filtering are both server-side now, so the grid renders the
  // page exactly as returned.
  const filteredProducts = products;

  const clearFilters = () => {
    setFilters({ ...initialFilters, priceRange: [0, maxPrice] });
    setPriceDirty(false);
  };
  const loading = isLoading || categoriesLoading;

  // A single category filter is a real landing page worth indexing under its
  // own title; search results and multi-facet combinations are not, so they
  // stay noindex and canonicalise back to /products.
  const activeCategory =
    filters.category.length === 1 ? filters.category[0] : undefined;
  const isSearchResults = Boolean(searchQuery);

  const seo = useMemo(() => {
    if (isSearchResults) {
      return {
        title: `Search results for "${searchQuery}" | Royale Artelier`,
        description: `Browse Royale Artelier pieces matching "${searchQuery}".`,
        canonical: "/products",
        noIndex: true,
      };
    }

    if (activeCategory) {
      return {
        title: `${activeCategory} Collection | Royale Artelier`,
        description: `Shop the Royale Artelier ${activeCategory} collection — couture craftsmanship, ready-to-wear silhouettes, and elevated accessories.`,
        canonical: `/products?category=${encodeURIComponent(activeCategory)}`,
        noIndex: false,
      };
    }

    if (filters.isNew) {
      return {
        title: "New Arrivals | Royale Artelier",
        description:
          "The newest couture and ready-to-wear pieces to land at Royale Artelier.",
        canonical: "/products?isNew=true",
        noIndex: false,
      };
    }

    if (filters.isSale) {
      return {
        title: "Sale | Royale Artelier",
        description:
          "Reduced couture and ready-to-wear pieces, while sizes last.",
        canonical: "/products?isSale=true",
        noIndex: false,
      };
    }

    return {
      title: "Shop All Collections | Royale Artelier",
      description: siteMetadata.description,
      canonical: "/products",
      noIndex: false,
    };
  }, [activeCategory, filters.isNew, filters.isSale, isSearchResults, searchQuery]);

  const listSchema = useMemo(
    () =>
      createItemListSchema(
        filteredProducts.slice(0, 30).map(({ id, name }) => ({ id, name })),
        seo.title,
      ),
    [filteredProducts, seo.title],
  );

  const collectionSchema = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: seo.title,
      description: seo.description,
      url: `${siteMetadata.siteUrl}${seo.canonical}`,
      isPartOf: { "@id": `${siteMetadata.siteUrl}/#website` },
    }),
    [seo.canonical, seo.description, seo.title],
  );

  const breadcrumbSchema = useMemo(
    () =>
      createBreadcrumbSchema(
        [
          { name: "Home", href: "/" },
          { name: "Shop", href: "/products" },
          ...(activeCategory
            ? [
                {
                  name: activeCategory,
                  href: `/products?category=${encodeURIComponent(
                    activeCategory,
                  )}`,
                },
              ]
            : []),
        ],
      ),
    [activeCategory],
  );

  return (
    <Layout>
      <SEO
        path={seo.canonical}
        canonical={seo.canonical}
        title={seo.title}
        description={seo.description}
        type="collection"
        noIndex={seo.noIndex}
        structuredData={
          seo.noIndex
            ? undefined
            : [collectionSchema, listSchema, breadcrumbSchema]
        }
      />
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/products">Shop</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {filters.category.length > 0 && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{filters.category.join(", ")}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl lg:text-4xl font-semibold mb-2">
            {searchQuery
              ? `Search: "${searchQuery}"`
              : filters.category.length > 0
                ? filters.category.join(" & ")
                : "All Products"}
          </h1>
          <p className="text-muted-foreground">
            {loading
              ? "Loading products..."
              : `${total} ${total === 1 ? "product" : "products"} found`}
          </p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Filters - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-32">
              <ProductFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={clearFilters}
                categories={categories}
                brandOptions={brandOptions}
                maxPrice={maxPrice}
              />
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
              {/* Mobile Filter Button */}
              <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden gap-2">
                    <SlidersHorizontal size={18} />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 overflow-y-auto">
                  <ProductFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={clearFilters}
                    categories={categories}
                    brandOptions={brandOptions}
                    isMobile
                    onClose={() => setIsFilterOpen(false)}
                    maxPrice={maxPrice}
                  />
                </SheetContent>
              </Sheet>

              {/* Sort & View Options */}
              <div className="flex items-center gap-4 ml-auto">
                <Select
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value as ProductSort)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featured">Featured</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price-low">
                      Price: Low to High
                    </SelectItem>
                    <SelectItem value="price-high">
                      Price: High to Low
                    </SelectItem>
                    {/* Reviews paused
                    <SelectItem value="rating">Best Rating</SelectItem>
                    */}
                  </SelectContent>
                </Select>

                <div className="hidden sm:flex items-center gap-1 border border-border rounded-md p-1">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded ${
                      viewMode === "grid" ? "bg-secondary" : ""
                    }`}>
                    <Grid3X3 size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded ${
                      viewMode === "list" ? "bg-secondary" : ""
                    }`}>
                    <LayoutList size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="py-16 text-center text-muted-foreground">
                Loading products...
              </div>
            ) : isError ? (
              <div className="text-center py-16">
                <p className="text-lg text-muted-foreground mb-4">
                  Failed to load products.
                </p>
                <Button onClick={() => refetch()}>Retry</Button>
              </div>
            ) : filteredProducts.length > 0 ? (
              <>
                <div
                  className={`grid gap-6 ${
                    viewMode === "grid"
                      ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
                      : "grid-cols-1"
                  } ${isFetching ? "opacity-60 transition-opacity" : ""}`}>
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                <TablePagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={total}
                  totalPages={totalPages}
                  onPageChange={(next) => {
                    setPage(next);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  isLoading={isFetching}
                  label="product"
                  className="mt-8"
                />
              </>
            ) : (
              <div className="text-center py-16">
                <p className="text-lg text-muted-foreground mb-4">
                  No products found
                </p>
                <Button onClick={clearFilters}>Clear all filters</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Products;
