import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import api, { Product } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

interface AdminProductsContextType {
  products: Product[];
  isLoading: boolean;
  addProduct: (
    product: Omit<
      Product,
      "id" | "rating" | "reviews" | "createdAt" | "updatedAt"
    >
  ) => Promise<Product>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  getProduct: (id: string) => Product | undefined;
  refreshProducts: () => Promise<void>;
}

const AdminProductsContext = createContext<
  AdminProductsContextType | undefined
>(undefined);

export const AdminProductsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = Boolean(user?.isAdmin);

  // Prefix invalidation: the storefront caches one entry per filter/page
  // combination, so invalidating a single fixed key would leave every other
  // page stale after an admin edit.
  const invalidateProductList = () =>
    queryClient.invalidateQueries({ queryKey: ["products"] });

  const invalidateProductDetail = (id: string) =>
    queryClient.invalidateQueries({ queryKey: ["product", id] });

  const refreshProducts = async () => {
    try {
      setIsLoading(true);
      // Admin product management needs the full list (search + inline edit),
      // so walk the pages rather than assuming one response holds everything.
      const collected: Product[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const result = await api.getProducts(undefined, { page, pageSize: 100 });
        collected.push(...result.data);
        hasMore = result.hasMore;
        page += 1;
      }
      setProducts(collected);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only admins need the whole catalogue in memory. Shoppers would otherwise
    // page through every product on each visit purely to fill a context they
    // never read.
    if (!isAdmin) {
      setProducts([]);
      setIsLoading(false);
      return;
    }
    refreshProducts();
  }, [isAdmin]);

  const addProduct = async (
    productData: Omit<
      Product,
      "id" | "rating" | "reviews" | "createdAt" | "updatedAt"
    >
  ) => {
    try {
      const newProduct = await api.createProduct(productData);
      setProducts((prev) => [newProduct, ...prev]);
      invalidateProductList();
      invalidateProductDetail(newProduct.id);
      // Returned so callers can act on the new id — the product form needs it
      // to write the variant stock rows straight after creation.
      return newProduct;
    } catch (error) {
      console.error("Failed to add product:", error);
      throw error;
    }
  };

  const updateProduct = async (id: string, productData: Partial<Product>) => {
    try {
      const updatedProduct = await api.updateProduct(id, productData);
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? updatedProduct : p))
      );
      invalidateProductList();
      invalidateProductDetail(id);
    } catch (error) {
      console.error("Failed to update product:", error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      invalidateProductList();
      invalidateProductDetail(id);
    } catch (error) {
      console.error("Failed to delete product:", error);
      throw error;
    }
  };

  const getProduct = (id: string) => {
    return products.find((p) => p.id === id);
  };

  return (
    <AdminProductsContext.Provider
      value={{
        products,
        isLoading,
        addProduct,
        updateProduct,
        deleteProduct,
        getProduct,
        refreshProducts,
      }}
    >
      {children}
    </AdminProductsContext.Provider>
  );
};

export const useAdminProducts = () => {
  const context = useContext(AdminProductsContext);
  if (!context) {
    throw new Error(
      "useAdminProducts must be used within an AdminProductsProvider"
    );
  }
  return context;
};

export type { Product };
