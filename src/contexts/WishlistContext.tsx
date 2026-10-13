import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import api, { WishlistItem as ApiWishlistItem } from "@/services/api";
import { useAuth } from "./AuthContext";
import { GUEST_WISHLIST_KEY } from "@/constants/storage";

export type WishlistItem = ApiWishlistItem;

interface WishlistContextType {
  items: WishlistItem[];
  addItem: (item: WishlistItem) => void;
  removeItem: (id: string) => void;
  isInWishlist: (id: string) => boolean;
  toggleItem: (item: WishlistItem) => void;
  isLoading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined
);

const loadGuestWishlist = (): WishlistItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(GUEST_WISHLIST_KEY);
    return stored ? (JSON.parse(stored) as WishlistItem[]) : [];
  } catch (error) {
    console.error("Failed to parse guest wishlist", error);
    return [];
  }
};

const saveGuestWishlist = (items: WishlistItem[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(items));
};

const clearGuestWishlist = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GUEST_WISHLIST_KEY);
};

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Sync wishlist with server when authenticated
  useEffect(() => {
    if (authLoading) return;

    const initializeWishlist = async () => {
      if (isAuthenticated) {
        setIsLoading(true);
        try {
          const guestItems = loadGuestWishlist();
          let wishlistData = await api.getWishlist();

          if (guestItems.length) {
            const existingIds = new Set(wishlistData.map((item) => item.id));
            for (const guestItem of guestItems) {
              if (existingIds.has(guestItem.id)) continue;
              wishlistData = await api.addToWishlist(guestItem.id);
              existingIds.add(guestItem.id);
            }
            clearGuestWishlist();
          }

          setItems(wishlistData);
        } catch (error) {
          console.error("Failed to fetch wishlist:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setItems(loadGuestWishlist());
        setIsLoading(false);
      }
    };

    initializeWishlist();
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    if (!isAuthenticated) {
      saveGuestWishlist(items);
    }
  }, [items, isAuthenticated]);

  const addItem = async (item: WishlistItem) => {
    // Optimistic update
    setItems((prev) => {
      if (prev.find((i) => i.id === item.id)) return prev;
      return [...prev, item];
    });

    if (isAuthenticated) {
      try {
        const data = await api.addToWishlist(item.id);
        setItems(data);
      } catch (error) {
        console.error("Failed to add to wishlist:", error);
      }
    }
  };

  const removeItem = async (id: string) => {
    // Optimistic update
    setItems((prev) => prev.filter((i) => i.id !== id));

    if (isAuthenticated) {
      try {
        const data = await api.removeFromWishlist(id);
        setItems(data);
      } catch (error) {
        console.error("Failed to remove from wishlist:", error);
      }
    }
  };

  const isInWishlist = (id: string) => items.some((i) => i.id === id);

  const toggleItem = async (item: WishlistItem) => {
    if (isInWishlist(item.id)) {
      removeItem(item.id);
    } else {
      addItem(item);
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        isInWishlist,
        toggleItem,
        isLoading,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context)
    throw new Error("useWishlist must be used within WishlistProvider");
  return context;
};
