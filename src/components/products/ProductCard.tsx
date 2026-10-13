import React from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { Product } from "@/services/api";
import { useWishlist } from "@/contexts/WishlistContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { isInWishlist, toggleItem } = useWishlist();
  const inWishlist = isInWishlist(product.id);
  const { getProductPrice, formatPrice } = useCurrency();
  const displayPrice = getProductPrice(product);
  const soldOut = product.inStock === false;

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
  };

  return (
    <Link to={`/product/${product.id}`} className="card-product block">
      <div className="card-product-image relative">
        <img
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className={cn(
            "w-full h-full object-cover transition-transform duration-500 group-hover:scale-105",
            soldOut && "opacity-60",
          )}
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {soldOut && <span className="badge-sold-out">Out of stock</span>}
          {!soldOut && product.isNew && (
            <span className="badge-new">New</span>
          )}
          {!soldOut && product.isSale && (
            <span className="badge-sale">Sale</span>
          )}
        </div>

        {/* Wishlist Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-3 right-3 bg-background/80 backdrop-blur-sm hover:bg-background",
            inWishlist && "text-destructive",
          )}
          onClick={handleWishlistToggle}>
          <Heart size={18} fill={inWishlist ? "currentColor" : "none"} />
        </Button>

        {/* Quick View Overlay */}
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors duration-300 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
          <span className="bg-background text-foreground px-4 py-2 text-sm font-medium rounded-md shadow-elegant-md">
            {soldOut ? "Out of stock" : "Quick View"}
          </span>
        </div>
      </div>

      <div className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{product.brand}</p>
        <h3 className="font-medium text-sm mb-2 line-clamp-2">
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{formatPrice(displayPrice)}</span>
          {product.originalPrice && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>

        {/* Color Options */}
        <div className="flex gap-1.5 mt-3">
          {product.colors.slice(0, 4).map((color) => (
            <span
              key={color.name}
              className="w-4 h-4 rounded-full border border-border"
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
          ))}
          {product.colors.length > 4 && (
            <span className="text-xs text-muted-foreground">
              +{product.colors.length - 4}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
