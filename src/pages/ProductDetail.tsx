import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Heart,
  Minus,
  Plus,
  // Star, // reviews paused
  Truck,
  RotateCcw,
  Shield,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ProductCard from "@/components/products/ProductCard";
// import ProductReviews from "@/components/products/ProductReviews"; // reviews paused
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useProductDetail, useProductsData } from "@/hooks/use-products";
import { getTemporaryAvailability } from "@/data/temporary-catalog";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import {
  createBreadcrumbSchema,
  createProductSchema,
  truncateDescription,
} from "@/lib/seo";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isInWishlist, toggleItem } = useWishlist();
  const { data: product, isLoading, isError } = useProductDetail(id);
  // Fetch one extra so removing the current product still leaves four.
  const { data: relatedPage } = useProductsData(
    product?.category ? { category: product.category } : undefined,
    { pageSize: 5 },
  );
  const { getProductPrice, formatPrice } = useCurrency();
  // Reviews paused — no review UI / fetch for now.
  // const { data: approvedReviews } = useQuery({
  //   queryKey: ["reviews", id, 1],
  //   queryFn: () => api.getProductReviews(id as string, { page: 1 }),
  //   enabled: Boolean(id),
  // });
  /**
   * Stock is per size+colour, so what is available depends on both choices.
   * Products with no variant rows report tracked:false and fall back to the
   * product-level flag, which keeps the pre-inventory catalogue sellable.
   */
  const { data: availability } = useQuery({
    queryKey: ["availability", id],
    queryFn: () => getTemporaryAvailability(id as string),
    enabled: Boolean(id),
  });

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (product) {
      setSelectedImage(0);
      setSelectedSize("");
      setSelectedColor(product.colors[0]?.name || "");
      setQuantity(1);
    }
  }, [product]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return (relatedPage?.data ?? [])
      .filter((p) => p.id !== product.id)
      .slice(0, 4);
  }, [relatedPage, product]);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Loading product...</p>
        </div>
      </Layout>
    );
  }

  if (isError || !product) {
    return (
      <Layout>
        <SEO
          path={`/product/${id ?? ""}`}
          title="Product Not Found | Royale Artelier"
          description="This piece is no longer available. Explore the current collection instead."
          noIndex
        />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-display mb-4">Product not found</h1>
          <Button onClick={() => navigate("/products")}>Back to Shop</Button>
        </div>
      </Layout>
    );
  }

  const inWishlist = isInWishlist(product.id);
  const displayPrice = getProductPrice(product);
  const returnDays = product.returnDays ?? 2;
  const returnLabel =
    returnDays > 0 ? `${returnDays}-Day Returns` : "Final Sale";
  // Reviews paused.
  // const reviewCount =
  //   approvedReviews?.total ?? (Number(product.reviews) || 0);
  // const averageRating = Number(product.rating) || 0;

  // Structured data is priced in USD so the markup stays stable regardless of
  // the currency the shopper happens to be viewing.
  const schemaPrice = Number(product.priceUsd ?? product.price ?? displayPrice);
  const seoTitle = `${product.name}${
    product.brand ? ` by ${product.brand}` : ""
  } | Royale Artelier`;
  const seoDescription = truncateDescription(
    product.description ||
      `Shop the ${product.name} from Royale Artelier's ${product.category} collection.`,
  );
  const productSchema = createProductSchema({
    id: product.id,
    name: product.name,
    description: product.description,
    images: product.images,
    brand: product.brand,
    category: product.category,
    material: product.material,
    price: schemaPrice,
    inStock: product.inStock,
    // ratingValue: averageRating,
    // reviewCount,
  });
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", href: "/" },
    { name: "Shop", href: "/products" },
    {
      name: product.category,
      href: `/products?category=${encodeURIComponent(product.category)}`,
    },
    { name: product.name, href: `/product/${product.id}` },
  ]);

  const stockFor = (size: string, color: string) =>
    availability?.variants.find(
      (variant) => variant.size === size && variant.color === color,
    );

  const isTracked = availability?.tracked ?? false;

  /** A colour is unavailable only when every size of it is sold out. */
  const isColorSoldOut = (color: string) => {
    if (!isTracked) return false;
    const forColor = availability!.variants.filter(
      (variant) => variant.color === color,
    );
    return forColor.length > 0 && forColor.every((v) => v.stockQuantity <= 0);
  };

  const isSizeSoldOut = (size: string) => {
    if (!isTracked || !selectedColor) return false;
    const variant = stockFor(size, selectedColor);
    return Boolean(variant && variant.stockQuantity <= 0);
  };

  const selectedVariant =
    selectedSize && selectedColor
      ? stockFor(selectedSize, selectedColor)
      : undefined;

  const maxQuantity =
    isTracked && selectedVariant ? selectedVariant.stockQuantity : Infinity;

  const productSoldOut = product.inStock === false;
  const selectionSoldOut = Boolean(
    productSoldOut ||
      (isTracked && selectedVariant && selectedVariant.stockQuantity <= 0),
  );

  const handleAddToCart = () => {
    if (productSoldOut || selectionSoldOut) {
      toast.error("This item is out of stock");
      return;
    }
    if (!selectedSize) {
      toast.error("Please select a size");
      return;
    }
    addItem({
      id: product.id,
      name: product.name,
      // Keep USD canonical in cart item for stable conversions.
      price: Number(product.priceUsd ?? product.price ?? displayPrice),
      priceUsd: Number(product.priceUsd ?? product.price ?? displayPrice),
      priceGbp: Number(product.priceGbp ?? 0),
      priceNaira: Number(product.priceNaira ?? 0),
      image: product.images[0],
      size: selectedSize,
      color: selectedColor,
      quantity,
    });
    toast.success("Added to cart");
  };

  const handleWishlistToggle = () => {
    toggleItem({
      id: product.id,
      name: product.name,
      price: Number(product.priceUsd ?? product.price ?? displayPrice),
      priceUsd: Number(product.priceUsd ?? product.price ?? displayPrice),
      priceGbp: Number(product.priceGbp ?? 0),
      priceNaira: Number(product.priceNaira ?? 0),
      image: product.images[0],
      category: product.category,
      sizes: product.sizes,
      colors: product.colors,
    });
    toast.success(inWishlist ? "Removed from wishlist" : "Added to wishlist");
  };

  return (
    <Layout>
      <SEO
        path={`/product/${product.id}`}
        title={seoTitle}
        description={seoDescription}
        image={product.images[0]}
        imageAlt={product.name}
        type="product"
        structuredData={[productSchema, breadcrumbSchema]}
      />
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-8">
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
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  to={`/products?category=${encodeURIComponent(
                    product.category,
                  )}`}>
                  {product.category}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{product.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                // React 18 does not map the camelCase prop; the lowercase
                // attribute is what actually reaches the DOM.
                {...{ fetchpriority: "high" }}
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex gap-4">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={cn(
                    "w-20 aspect-square rounded-md overflow-hidden border-2 transition-colors",
                    selectedImage === index
                      ? "border-primary"
                      : "border-transparent",
                  )}>
                  <img
                    src={image}
                    alt={`${product.name} — view ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div>
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-1">
                {product.brand}
              </p>
              <h1 className="font-display text-3xl font-semibold mb-3">
                {product.name}
              </h1>

              {/* Rating — paused until reviews ship
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={
                        i < Math.floor(averageRating)
                          ? "fill-accent text-accent"
                          : "text-muted"
                      }
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {averageRating.toFixed(1)} ({reviewCount}{" "}
                  {reviewCount === 1 ? "review" : "reviews"})
                </span>
              </div>
              */}

              {/* Price */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl font-semibold">
                  {formatPrice(displayPrice)}
                </span>
                {product.originalPrice && (
                  <>
                    <span className="text-lg text-muted-foreground line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                    <span className="badge-sale">
                      {Math.round(
                        (1 - displayPrice / product.originalPrice) * 100,
                      )}
                      % OFF
                    </span>
                  </>
                )}
              </div>

              <p className="text-muted-foreground mb-6">
                {product.description}
              </p>
            </div>

            {/* Color Selection */}
            <div className="mb-6">
              <p className="text-sm font-medium mb-3">Color: {selectedColor}</p>
              <div className="flex gap-3">
                {product.colors.map((color) => {
                  const soldOut = isColorSoldOut(color.name);
                  return (
                    <button
                      key={`${color.name}-${color.hex}`}
                      onClick={() => setSelectedColor(color.name)}
                      disabled={soldOut}
                      aria-label={
                        soldOut ? `${color.name} — sold out` : color.name
                      }
                      className={cn(
                        "w-10 h-10 rounded-full border-2 transition-all relative",
                        selectedColor === color.name
                          ? "ring-2 ring-offset-2 ring-accent border-transparent"
                          : "border-border",
                        soldOut && "opacity-40 cursor-not-allowed",
                      )}
                      style={{ backgroundColor: color.hex }}
                      title={soldOut ? `${color.name} (sold out)` : color.name}
                    />
                  );
                })}
              </div>
            </div>

            {/* Size Selection */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Size</p>
                {product.sizeGuideImage ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="text-sm text-accent underline">
                        Size Guide
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Size Guide</DialogTitle>
                      </DialogHeader>
                      <img
                        src={product.sizeGuideImage}
                        alt={`${product.name} size guide`}
                        className="w-full h-auto rounded-md"
                      />
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Link
                    to="/size-guide"
                    className="text-sm text-accent underline">
                    Size Guide
                  </Link>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => {
                  const soldOut = isSizeSoldOut(size);
                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      disabled={soldOut}
                      className={cn(
                        "min-w-[48px] px-4 py-2 border rounded-md text-sm font-medium transition-colors",
                        selectedSize === size
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-foreground",
                        soldOut &&
                          "opacity-40 cursor-not-allowed line-through hover:border-border",
                      )}>
                      {size}
                    </button>
                  );
                })}
              </div>
              {selectedVariant && selectedVariant.lowStock && (
                <p className="text-sm text-accent mt-3">
                  Only {selectedVariant.stockQuantity} left in {selectedSize} /{" "}
                  {selectedColor}
                </p>
              )}
              {productSoldOut ? (
                <p className="text-sm text-destructive mt-3">
                  This item is currently out of stock.
                </p>
              ) : (
                selectionSoldOut && (
                  <p className="text-sm text-destructive mt-3">
                    {selectedSize} / {selectedColor} is sold out — try another
                    size or colour.
                  </p>
                )
              )}
            </div>

            {/* Quantity */}
            <div className="mb-6">
              <p className="text-sm font-medium mb-3">Quantity</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-border rounded-md">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={selectionSoldOut}
                    className="p-2 hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <Minus size={18} />
                  </button>
                  <span className="w-12 text-center font-medium">
                    {quantity}
                  </span>
                  <button
                    onClick={() =>
                      setQuantity(Math.min(maxQuantity, quantity + 1))
                    }
                    disabled={selectionSoldOut || quantity >= maxQuantity}
                    className="p-2 hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 mb-8">
              <Button
                onClick={handleAddToCart}
                size="lg"
                disabled={selectionSoldOut}
                className="flex-1 btn-primary">
                {selectionSoldOut ? "Out of stock" : "Add to Cart"}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleWishlistToggle}
                className={cn(
                  inWishlist && "text-destructive border-destructive",
                )}>
                <Heart size={20} fill={inWishlist ? "currentColor" : "none"} />
              </Button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 py-6 border-t border-b border-border">
              <div className="flex flex-col items-center text-center gap-2">
                <Truck size={24} className="text-muted-foreground" />
                <span className="text-xs">Seamless shopping experience</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <RotateCcw size={24} className="text-muted-foreground" />
                <span className="text-xs">Flexible return policy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <Tabs defaultValue="details" className="mb-16">
          <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent h-auto p-0">
            <TabsTrigger
              value="details"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Details
            </TabsTrigger>
            <TabsTrigger
              value="care"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Care Instructions
            </TabsTrigger>
            {/* Reviews paused
            <TabsTrigger
              value="reviews"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Reviews ({reviewCount})
            </TabsTrigger>
            */}
          </TabsList>
          <TabsContent value="details" className="py-6">
            <div className="max-w-2xl space-y-4">
              <p className="text-muted-foreground">{product.description}</p>
              {product.material && (
                <div>
                  <h4 className="font-medium mb-1">Material</h4>
                  <p className="text-muted-foreground">{product.material}</p>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="care" className="py-6">
            <ul className="space-y-2 max-w-2xl">
              {product.careInstructions?.map((instruction, index) => (
                <li
                  key={index}
                  className="text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                  {instruction}
                </li>
              ))}
            </ul>
          </TabsContent>
          {/* Reviews paused
          <TabsContent value="reviews" className="py-6">
            <ProductReviews productId={product.id} />
          </TabsContent>
          */}
        </Tabs>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section>
            <h2 className="font-display text-2xl font-semibold mb-6">
              You May Also Like
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
};

export default ProductDetail;
