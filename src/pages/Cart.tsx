import React from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, X, ShoppingBag } from "lucide-react";
import Layout from "@/components/layout/Layout";
import PageBreadcrumbs from "@/components/layout/PageBreadcrumbs";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/contexts/CurrencyContext";

const Cart = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const { currency, formatPrice, getProductPrice } = useCurrency();

  const getItemUnitPrice = (item: (typeof items)[number]) =>
    getProductPrice({
      price: Number(item.price ?? 0),
      priceUsd: item.priceUsd,
      priceNaira: item.priceNaira,
      priceGbp: item.priceGbp,
    } as Parameters<typeof getProductPrice>[0]);

  const subtotal = items.reduce(
    (sum, item) => sum + getItemUnitPrice(item) * item.quantity,
    0,
  );

  const freeShippingThreshold =
    currency === "NGN" ? 150 * 1550 : currency === "GBP" ? 150 * 0.79 : 150;
  const shippingFee =
    currency === "NGN" ? 15 * 1550 : currency === "GBP" ? 15 * 0.79 : 15;
  const shipping = subtotal > freeShippingThreshold ? 0 : shippingFee;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <PageBreadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Shop", href: "/products" },
              { label: "Cart" },
            ]}
          />
        </div>
        <div className="container mx-auto px-4 py-8 text-center">
          <ShoppingBag
            size={64}
            className="mx-auto text-muted-foreground mb-6"
          />
          <h1 className="font-display text-3xl font-semibold mb-4">
            Your cart is empty
          </h1>
          <p className="text-muted-foreground mb-8">
            Looks like you haven't added anything to your cart yet.
          </p>
          <Button
            onClick={() => navigate("/products")}
            size="lg"
            className="btn-primary">
            Start Shopping
          </Button>
        </div>
      </Layout>
    );
  }

  // Straight to checkout, signed in or not. Bouncing guests to a login form
  // here is a well-known drop-off point, and checkout collects everything an
  // order needs anyway.
  const handleCheckout = () => navigate("/checkout");

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <PageBreadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Shop", href: "/products" },
            { label: "Cart" },
          ]}
        />
        <h1 className="font-display text-3xl lg:text-4xl font-semibold mb-8">
          Shopping Cart
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={`${item.id}-${item.size}-${item.color}`}
                className="flex gap-4 p-4 bg-card rounded-lg">
                <div className="w-24 h-32 bg-muted rounded-md overflow-hidden flex-shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-4">
                    <div>
                      <h3
                        className="font-medium mb-1 cursor-pointer hover:text-accent transition-colors"
                        onClick={() => navigate(`/product/${item.id}`)}>
                        {item.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Size: {item.size} | Color: {item.color}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id, item.size, item.color)}
                      className="flex-shrink-0">
                      <X size={18} />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border border-border rounded-md">
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            item.size,
                            item.color,
                            item.quantity - 1,
                          )
                        }
                        className="p-2 hover:bg-secondary transition-colors">
                        <Minus size={16} />
                      </button>
                      <span className="w-10 text-center text-sm">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            item.size,
                            item.color,
                            item.quantity + 1,
                          )
                        }
                        className="p-2 hover:bg-secondary transition-colors">
                        <Plus size={16} />
                      </button>
                    </div>
                    <span className="font-semibold">
                      {formatPrice(getItemUnitPrice(item) * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={clearCart} className="mt-4">
              Clear Cart
            </Button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg p-6 sticky top-32">
              <h2 className="font-display text-xl font-semibold mb-6">
                Order Summary
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {/* <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
                </div> */}
                {/* {shipping > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Add {formatPrice(freeShippingThreshold - subtotal)} more for
                    free shipping
                  </p>
                )} */}
                <div className="border-t border-border pt-4 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <Button
                className="w-full btn-primary"
                size="lg"
                onClick={handleCheckout}>
                Proceed to Checkout
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Secure checkout · no account needed
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Cart;
