import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import Layout from "@/components/layout/Layout";
import ProductCard from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProductsData } from "@/hooks/use-products";
import { useCategories } from "@/contexts/CategoriesContext";
import type { ProductFilters } from "@/services/api";
import { cn } from "@/lib/utils";

const GRID_SIZE = 12;

type Chip = {
  id: string;
  label: string;
  filters?: ProductFilters;
};

const Index = () => {
  const navigate = useNavigate();
  const { categories } = useCategories();
  const [activeChip, setActiveChip] = useState("all");

  // Shop-first: the page opens on the catalogue, and the chips narrow it in
  // place rather than sending the shopper somewhere else.
  const chips = useMemo<Chip[]>(
    () => [
      { id: "all", label: "All" },
      { id: "new", label: "New In", filters: { isNew: true } },
      { id: "sale", label: "Sale", filters: { isSale: true } },
      ...categories.map((category) => ({
        id: `category:${category.name}`,
        label: category.name,
        filters: { category: category.name },
      })),
    ],
    [categories],
  );

  const activeFilters = useMemo(
    () => chips.find((chip) => chip.id === activeChip)?.filters,
    [chips, activeChip],
  );

  const { data, isLoading, isFetching } = useProductsData(activeFilters, {
    pageSize: GRID_SIZE,
  });

  const products = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <Layout>
      {/* Brand strip — deliberately slim. The shop is the page. */}
      <section className="border-b border-border bg-card">
        <div className="container mx-auto flex flex-col items-start gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">
              Royale Artelier
            </h1>
            <p className="text-sm text-muted-foreground">
              Your Style, Your Story — new pieces every week.
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate("/products")}>
            Shop everything
            <ArrowRight size={16} />
          </Button>
        </div>
      </section>

      {/* Category chips */}
      <section className="sticky top-16 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div
            className="-mx-1 flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Filter products">
            {chips.map((chip) => {
              const isActive = chip.id === activeChip;
              return (
                <button
                  key={chip.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveChip(chip.id)}
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:border-primary",
                  )}>
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* The catalogue */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="space-y-3">
                  <Skeleton className="aspect-[3/4] w-full rounded-lg" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center">
              <p className="mb-4 text-muted-foreground">
                Nothing here yet — try another filter.
              </p>
              <Button variant="outline" onClick={() => setActiveChip("all")}>
                Show everything
              </Button>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4",
                  isFetching && "opacity-60 transition-opacity",
                )}>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {total > products.length && (
                <div className="mt-10 text-center">
                  <Button
                    size="lg"
                    className="btn-primary gap-2"
                    onClick={() =>
                      navigate(
                        activeFilters?.category
                          ? `/products?category=${encodeURIComponent(
                              activeFilters.category,
                            )}`
                          : activeFilters?.isNew
                            ? "/products?isNew=true"
                            : activeFilters?.isSale
                              ? "/products?isSale=true"
                              : "/products",
                      )
                    }>
                    View all {total} pieces
                    <ArrowRight size={16} />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Practical info, stated once */}
      <section className="border-t border-border bg-card py-8">
        <div className="container mx-auto grid gap-6 px-4 sm:grid-cols-3">
          {[
            {
              icon: Truck,
              title: "Nationwide delivery",
              body: "Rates and timing shown at checkout for your area.",
            },
            {
              icon: RotateCcw,
              title: "Straightforward returns",
              body: "Return windows are listed on every product page.",
              href: "/shipping-returns",
            },
            {
              icon: ShieldCheck,
              title: "Secure checkout",
              body: "Encrypted payment, and your card details never touch us.",
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-3">
              <item.icon
                size={20}
                className="mt-0.5 shrink-0 text-accent"
                aria-hidden="true"
              />
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">
                  {item.body}
                  {item.href && (
                    <>
                      {" "}
                      <Link
                        to={item.href}
                        className="text-accent underline underline-offset-2">
                        Details
                      </Link>
                    </>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter — retained */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl lg:text-4xl font-semibold mb-4">
            Join the Royale Artelier Family
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-md mx-auto">
            Subscribe for exclusive access to new arrivals, special offers, and
            style inspiration.
          </p>
          <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-md bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 focus:outline-none focus:border-accent"
            />
            <Button className="btn-accent px-8">Subscribe</Button>
          </form>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
