import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import api from "@/services/api";
import { getTemporaryProduct } from "@/data/temporary-catalog";
import { useAuth } from "./AuthContext";
import { GUEST_CART_KEY } from "@/constants/storage";

export interface CartItem {
  cartItemId?: string; // Optional cart item ID from the database
  id: string; // Product ID
  name: string;
  price: number;
  priceNaira?: number;
  priceUsd?: number;
  priceGbp?: number;
  image: string;
  size: string;
  color: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string, size: string, color: string) => void;
  updateQuantity: (
    id: string,
    size: string,
    color: string,
    quantity: number,
  ) => void;
  clearCart: () => void;
  /**
   * Re-reads the cart from the server. Needed after checkout: the server
   * clears the cart when payment confirms, and without this the client would
   * keep showing items the shopper has already bought.
   */
  refreshCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
  isLoading: boolean;
}

const normalizePart = (value: string) => value.trim().toLowerCase();

/** Same product + size + colour = one cart line (case/whitespace tolerant). */
const getItemKey = (item: Pick<CartItem, "id" | "size" | "color">) =>
  `${item.id}::${normalizePart(item.size)}::${normalizePart(item.color)}`;

const isSameCartLine = (
  a: Pick<CartItem, "id" | "size" | "color">,
  b: Pick<CartItem, "id" | "size" | "color">,
) => getItemKey(a) === getItemKey(b);

/** Collapse duplicate lines into one quantity (repairs stale carts). */
const mergeCartLines = (cartItems: CartItem[]): CartItem[] => {
  const merged = new Map<string, CartItem>();

  for (const item of cartItems) {
    const key = getItemKey(item);
    const existing = merged.get(key);
    if (existing) {
      merged.set(key, {
        ...existing,
        quantity: existing.quantity + item.quantity,
        // Prefer richer price data if a later row has it.
        priceNaira: Number(existing.priceNaira) || Number(item.priceNaira) || 0,
        priceUsd: Number(existing.priceUsd) || Number(item.priceUsd) || 0,
        priceGbp: Number(existing.priceGbp) || Number(item.priceGbp) || 0,
        price: Number(existing.price) || Number(item.price) || 0,
        cartItemId: existing.cartItemId ?? item.cartItemId,
      });
    } else {
      merged.set(key, {
        ...item,
        size: item.size.trim(),
        color: item.color.trim(),
      });
    }
  }

  return [...merged.values()];
};

const loadGuestCart = (): CartItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(GUEST_CART_KEY);
    return mergeCartLines(stored ? JSON.parse(stored) : []);
  } catch (error) {
    console.error("Failed to parse guest cart", error);
    return [];
  }
};

const saveGuestCart = (items: CartItem[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
};

const clearGuestCart = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GUEST_CART_KEY);
};

/** Re-read live product prices into a guest cart (localStorage can go stale). */
const refreshGuestCartPrices = async (
  cartItems: CartItem[],
): Promise<CartItem[]> => {
  if (cartItems.length === 0) return cartItems;

  const uniqueIds = [...new Set(cartItems.map((item) => item.id))];
  const products = await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        return getTemporaryProduct(id);
      } catch {
        return null;
      }
    }),
  );
  const byId = new Map(
    products.filter(Boolean).map((product) => [product!.id, product!]),
  );

  return mergeCartLines(
    cartItems.map((item) => {
      const product = byId.get(item.id);
      if (!product) return item;

      const priceUsd = Number(product.priceUsd ?? product.price ?? 0);
      const priceNaira = Number(product.priceNaira ?? 0);
      const priceGbp = Number(product.priceGbp ?? 0);

      return {
        ...item,
        name: product.name,
        image: product.images?.[0] ?? item.image,
        price: priceUsd > 0 ? priceUsd : Number(item.price ?? 0),
        priceUsd,
        priceNaira,
        priceGbp,
      };
    }),
  );
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Guards the persist effect below until the stored cart has been read.
  const [hydrated, setHydrated] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Sync cart with server when authenticated
  useEffect(() => {
    if (authLoading) return;

    const initializeCart = async () => {
      setIsLoading(true);
      try {
        if (isAuthenticated) {
          const guestItems = loadGuestCart();
          let cartResponse = await api.getCart();

          if (guestItems.length) {
            // Always POST — the API increments quantity when the line exists.
            for (const guestItem of guestItems) {
              cartResponse = await api.addToCart({
                productId: guestItem.id,
                size: guestItem.size.trim(),
                color: guestItem.color.trim(),
                quantity: guestItem.quantity,
              });
            }

            clearGuestCart();
          }

          setItems(mergeCartLines(cartResponse.items));
        } else {
          const guestItems = loadGuestCart();
          try {
            setItems(await refreshGuestCartPrices(guestItems));
          } catch (error) {
            console.error("Failed to refresh guest cart prices:", error);
            setItems(guestItems);
          }
        }
      } catch (error) {
        console.error("Failed to fetch cart:", error);
      } finally {
        setIsLoading(false);
        setHydrated(true);
      }
    };

    initializeCart();
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    // Wait for hydration. This effect also runs on mount, when `items` is still
    // the initial empty array — persisting then overwrote the stored guest cart
    // with [] before it had been read, so a guest's cart never survived a page
    // load.
    if (!hydrated) return;

    if (!isAuthenticated) {
      saveGuestCart(items);
    }
  }, [items, isAuthenticated, hydrated]);

  const refreshCart = async () => {
    if (!isAuthenticated) {
      const guestItems = loadGuestCart();
      try {
        setItems(await refreshGuestCartPrices(guestItems));
      } catch (error) {
        console.error("Failed to refresh guest cart prices:", error);
        setItems(guestItems);
      }
      return;
    }

    try {
      const cartResponse = await api.getCart();
      setItems(mergeCartLines(cartResponse.items));
    } catch (error) {
      console.error("Failed to refresh cart:", error);
    }
  };

  const addItem = async (item: CartItem) => {
    const normalized: CartItem = {
      ...item,
      size: item.size.trim(),
      color: item.color.trim(),
      quantity: Math.max(1, Number(item.quantity) || 1),
    };

    // Optimistic update — same product/size/colour bumps quantity.
    setItems((prev) => {
      const existing = prev.find((row) => isSameCartLine(row, normalized));
      if (existing) {
        return prev.map((row) =>
          isSameCartLine(row, normalized)
            ? { ...row, quantity: row.quantity + normalized.quantity }
            : row,
        );
      }
      return mergeCartLines([...prev, normalized]);
    });

    // Sync with server if authenticated
    if (isAuthenticated) {
      try {
        const data = await api.addToCart({
          productId: normalized.id,
          size: normalized.size,
          color: normalized.color,
          quantity: normalized.quantity,
        });
        setItems(mergeCartLines(data.items));
      } catch (error) {
        console.error("Failed to add to cart:", error);
      }
    }
  };

  const removeItem = async (id: string, size: string, color: string) => {
    const target = { id, size, color };
    const itemToRemove = items.find((row) => isSameCartLine(row, target));

    // Optimistic update
    setItems((prev) => prev.filter((row) => !isSameCartLine(row, target)));

    // Sync with server if authenticated
    if (isAuthenticated && itemToRemove?.cartItemId) {
      try {
        const data = await api.removeFromCart(itemToRemove.cartItemId);
        setItems(mergeCartLines(data.items));
      } catch (error) {
        console.error("Failed to remove from cart:", error);
        // Revert on error
        await syncCart();
      }
    }
  };

  const updateQuantity = async (
    id: string,
    size: string,
    color: string,
    quantity: number,
  ) => {
    if (quantity < 1) {
      removeItem(id, size, color);
      return;
    }

    const target = { id, size, color };
    const item = items.find((row) => isSameCartLine(row, target));

    // Optimistic update
    setItems((prev) =>
      prev.map((row) =>
        isSameCartLine(row, target) ? { ...row, quantity } : row,
      ),
    );

    // Sync with server if authenticated
    if (isAuthenticated && item?.cartItemId) {
      try {
        const data = await api.updateCartItem(item.cartItemId, quantity);
        setItems(mergeCartLines(data.items));
      } catch (error) {
        console.error("Failed to update cart:", error);
        // Revert on error
        await syncCart();
      }
    }
  };

  const syncCart = async () => {
    if (isAuthenticated) {
      try {
        const data = await api.getCart();
        setItems(mergeCartLines(data.items));
      } catch (error) {
        console.error("Failed to sync cart:", error);
      }
    }
  };

  const clearCart = async () => {
    setItems([]);

    if (isAuthenticated) {
      try {
        await api.clearCart();
      } catch (error) {
        console.error("Failed to clear cart:", error);
      }
    } else {
      clearGuestCart();
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        refreshCart,
        totalItems,
        totalPrice,
        isLoading,
      }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
