import React from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ShoppingBag, X } from "lucide-react";
import Layout from "@/components/layout/Layout";
import PageBreadcrumbs from "@/components/layout/PageBreadcrumbs";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Wishlist = () => {
  const navigate = useNavigate();
  const { items, removeItem } = useWishlist();
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();

  const handleAddToCart = (item: (typeof items)[number]) => {
    const size = item.sizes?.[0];
    const color = item.colors?.[0]?.name;

    if (!size || !color) {
      toast.error(
        "Product options unavailable. Please view the product to select size and color.",
      );
      return;
    }

    addItem({
      id: item.id,
      name: item.name,
      price: Number(item.priceUsd ?? item.price ?? 0),
      priceUsd: Number(item.priceUsd ?? item.price ?? 0),
      priceGbp: Number(item.priceGbp ?? 0),
      priceNaira: Number(item.priceNaira ?? 0),
      image: item.image,
      size,
      color,
      quantity: 1,
    });
    toast.success("Added to cart");
  };

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <PageBreadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Shop", href: "/products" },
              { label: "Wishlist" },
            ]}
          />
        </div>
        <div className="container mx-auto px-4 py-8 text-center">
          <Heart size={64} className="mx-auto text-muted-foreground mb-6" />
          <h1 className="font-display text-3xl font-semibold mb-4">
            Your wishlist is empty
          </h1>
          <p className="text-muted-foreground mb-8">
            Save items you love for later.
          </p>
          <Button
            onClick={() => navigate("/products")}
            size="lg"
            className="btn-primary">
            Explore Products
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <PageBreadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Shop", href: "/products" },
            { label: "Wishlist" },
          ]}
        />
        <h1 className="font-display text-3xl lg:text-4xl font-semibold mb-2">
          My Wishlist
        </h1>
        <p className="text-muted-foreground mb-8">{items.length} items saved</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <div key={item.id} className="group relative">
              <div
                className="aspect-[3/4] bg-muted rounded-lg overflow-hidden mb-4 cursor-pointer"
                onClick={() => navigate(`/product/${item.id}`)}>
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(item.id);
                    toast.success("Removed from wishlist");
                  }}
                  className="absolute top-3 right-3 p-2 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{item.category}</p>
                <h3
                  className="font-medium text-sm line-clamp-2 cursor-pointer hover:text-accent transition-colors"
                  onClick={() => navigate(`/product/${item.id}`)}>
                  {item.name}
                </h3>
                <p className="font-semibold">{formatPrice(item.price)}</p>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => handleAddToCart(item)}>
                  <ShoppingBag size={16} className="mr-2" />
                  Add to Cart
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Wishlist;
