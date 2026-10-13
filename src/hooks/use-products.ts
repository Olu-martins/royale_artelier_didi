import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  getTemporaryProduct,
  getTemporaryProducts,
} from "@/data/temporary-catalog";
import {
  PageRequest,
  Paginated,
  Product,
  ProductFilters,
} from "@/services/api";

/**
 * Paginated product list from the temporary catalogue snapshot.
 * Filtering runs before pagination so a page is a page of matching pieces.
 *
 * keepPreviousData holds the previous page on screen while the next one loads,
 * so paging through the grid doesn't flash an empty state.
 */
export const useProductsData = (
  filters?: ProductFilters,
  pagination?: PageRequest,
) =>
  useQuery<Paginated<Product>>({
    queryKey: ["products", filters ?? {}, pagination ?? {}],
    queryFn: () => getTemporaryProducts(filters, pagination),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

export const useProductDetail = (id?: string) =>
  useQuery<Product>({
    queryKey: ["product", id],
    queryFn: () => {
      if (!id) {
        throw new Error("Product ID is required");
      }
      return getTemporaryProduct(id);
    },
    enabled: Boolean(id),
  });
