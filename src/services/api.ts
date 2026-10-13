// The server mounts every route under /api, but the base URL is often
// configured as a bare origin — accept either form.
const withApiPrefix = (url: string) => {
  const trimmed = url.replace(/\/$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
};

const API_BASE_URL = (() => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();

  if (!configured) {
    throw new Error(
      "VITE_API_BASE_URL is not set. Copy .env.example to .env (or set it in " +
        "the deploy environment) before building."
    );
  }

  return withApiPrefix(configured);
})();

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

/** Offset-paginated list envelope returned by the admin/list endpoints. */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

/** Keyset-paginated envelope, used where the table only ever grows. */
export interface CursorPage<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PageRequest {
  page?: number;
  pageSize?: number;
}

const withPageParams = (params: URLSearchParams, pagination?: PageRequest) => {
  if (pagination?.page) params.set("page", String(pagination.page));
  if (pagination?.pageSize) params.set("pageSize", String(pagination.pageSize));
  return params;
};

const queryString = (params: URLSearchParams) => {
  const query = params.toString();
  return query ? `?${query}` : "";
};

class ApiService {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on initialization
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("auth_token");
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("auth_token", token);
      } else {
        localStorage.removeItem("auth_token");
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const isFormData = options.body instanceof FormData;
    const headers: HeadersInit = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)["Authorization"] =
        `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Request failed" }));
      throw new Error(error.message || "Request failed");
    }

    return response.json();
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const data = await this.request<{
      user: User;
      accessToken: string;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.accessToken);
    return data;
  }

  async register(name: string, email: string, password: string) {
    const data = await this.request<{
      user: User;
      accessToken: string;
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    this.setToken(data.accessToken);
    return data;
  }

  async getProfile() {
    return this.request<User>("/auth/me");
  }

  logout() {
    this.setToken(null);
  }

  // Users endpoints
  async updateProfile(data: Partial<User>) {
    return this.request<User>("/users/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async getAddresses() {
    return this.request<Address[]>("/users/addresses");
  }

  async createAddress(address: AddressInput) {
    return this.request<Address>("/users/addresses", {
      method: "POST",
      body: JSON.stringify(address),
    });
  }

  async updateAddress(id: string, address: Partial<Address>) {
    return this.request<Address>(`/users/addresses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(address),
    });
  }

  async deleteAddress(id: string) {
    return this.request<void>(`/users/addresses/${id}`, {
      method: "DELETE",
    });
  }

  // Admin invites endpoints
  async getAdminInvites(pagination?: PageRequest) {
    const params = withPageParams(new URLSearchParams(), pagination);
    return this.request<Paginated<AdminInvite>>(
      `/admin-invites${queryString(params)}`,
    );
  }

  async createAdminInvite(email: string, role?: AdminRole) {
    return this.request<AdminInvite>("/admin-invites", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });
  }

  async getAdminInvitePreview(token: string) {
    return this.request<InvitePreview>(`/admin-invites/${token}`);
  }

  async acceptAdminInvite(
    token: string,
    payload: { name: string; password: string },
  ) {
    const data = await this.request<{ user: User; accessToken: string }>(
      `/admin-invites/${token}/accept`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    this.setToken(data.accessToken);
    return data;
  }

  // Products endpoints
  async getProducts(filters?: ProductFilters, pagination?: PageRequest) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, String(value));
        }
      });
    }
    withPageParams(params, pagination);
    return this.request<Paginated<Product>>(
      `/products${queryString(params)}`,
    );
  }

  async getProduct(id: string) {
    return this.request<Product>(`/products/${id}`);
  }

  async createProduct(
    product: Omit<
      Product,
      "id" | "rating" | "reviews" | "createdAt" | "updatedAt"
    >,
  ) {
    return this.request<Product>("/products", {
      method: "POST",
      body: JSON.stringify(product),
    });
  }

  async updateProduct(id: string, product: Partial<Product>) {
    return this.request<Product>(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(product),
    });
  }

  async deleteProduct(id: string) {
    return this.request<void>(`/products/${id}`, {
      method: "DELETE",
    });
  }

  async uploadProductImages(files: File[]) {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    return this.request<{ urls: string[] }>("/upload/images", {
      method: "POST",
      body: formData,
    });
  }

  // Categories endpoints
  /** Filter facets across the whole catalogue (not just the current page). */
  async getProductFacets(currency?: string) {
    const params = new URLSearchParams();
    if (currency) params.set("currency", currency);
    return this.request<ProductFacets>(
      `/products/facets${queryString(params)}`,
    );
  }

  // --- Delivery zones ---
  /** Public: active zones only, optionally filtered by area name. */
  async getDeliveryZones(search?: string) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const query = params.toString();
    return this.request<DeliveryZone[]>(
      `/delivery-zones${query ? `?${query}` : ""}`,
    );
  }

  /** Admin: every zone, including disabled ones. */
  async getAllDeliveryZones(pagination?: { page?: number; pageSize?: number }) {
    const params = new URLSearchParams();
    if (pagination?.page) params.set("page", String(pagination.page));
    if (pagination?.pageSize)
      params.set("pageSize", String(pagination.pageSize));
    const query = params.toString();
    return this.request<{
      data: DeliveryZone[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
      hasMore: boolean;
    }>(`/delivery-zones/admin${query ? `?${query}` : ""}`);
  }

  async createDeliveryZone(zone: Partial<DeliveryZoneInput>) {
    return this.request<DeliveryZone>("/delivery-zones", {
      method: "POST",
      body: JSON.stringify(zone),
    });
  }

  async updateDeliveryZone(id: string, zone: Partial<DeliveryZoneInput>) {
    return this.request<DeliveryZone>(`/delivery-zones/${id}`, {
      method: "PATCH",
      body: JSON.stringify(zone),
    });
  }

  async setDeliveryZoneActive(id: string, isActive: boolean) {
    return this.request<DeliveryZone>(`/delivery-zones/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
  }

  async deleteDeliveryZone(id: string) {
    return this.request<{ id: string; deleted: boolean }>(
      `/delivery-zones/${id}`,
      { method: "DELETE" },
    );
  }

  async getCategories() {
    return this.request<Category[]>("/categories");
  }

  async createCategory(name: string, subcategories?: string[]) {
    return this.request<Category>("/categories", {
      method: "POST",
      body: JSON.stringify({ name, subcategories }),
    });
  }

  async updateCategory(
    id: string,
    data: { name?: string; subcategories?: string[] },
  ) {
    return this.request<Category>(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: string) {
    return this.request<void>(`/categories/${id}`, {
      method: "DELETE",
    });
  }

  async addSubcategory(categoryId: string, subcategory: string) {
    return this.request<Category>(`/categories/${categoryId}/subcategories`, {
      method: "POST",
      body: JSON.stringify({ subcategory }),
    });
  }

  async deleteSubcategory(categoryId: string, subcategory: string) {
    return this.request<Category>(
      `/categories/${categoryId}/subcategories/${subcategory}`,
      {
        method: "DELETE",
      },
    );
  }

  // Cart endpoints
  async getCart() {
    return this.request<CartResponse>("/cart");
  }

  async addToCart(item: {
    productId: string;
    size: string;
    color: string;
    quantity: number;
  }) {
    return this.request<CartResponse>("/cart/items", {
      method: "POST",
      body: JSON.stringify(item),
    });
  }

  async updateCartItem(itemId: string, quantity: number) {
    return this.request<CartResponse>(`/cart/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
  }

  async removeFromCart(itemId: string) {
    return this.request<CartResponse>(`/cart/items/${itemId}`, {
      method: "DELETE",
    });
  }

  async clearCart() {
    return this.request<CartResponse>("/cart/clear", {
      method: "DELETE",
    });
  }

  // Wishlist endpoints
  async getWishlist() {
    return this.request<WishlistItem[]>("/wishlist");
  }

  async addToWishlist(productId: string) {
    return this.request<WishlistItem[]>(`/wishlist/${productId}`, {
      method: "POST",
    });
  }

  async removeFromWishlist(productId: string) {
    return this.request<WishlistItem[]>(`/wishlist/${productId}`, {
      method: "DELETE",
    });
  }

  async toggleWishlist(productId: string) {
    return this.request<WishlistItem[]>(`/wishlist/${productId}/toggle`, {
      method: "POST",
    });
  }

  // Orders endpoints
  async getOrders(pagination?: PageRequest) {
    const params = withPageParams(new URLSearchParams(), pagination);
    return this.request<Paginated<Order>>(`/orders${queryString(params)}`);
  }

  async getOrder(id: string) {
    return this.request<Order>(`/orders/${id}`);
  }

  /**
   * Places an unpaid order and reserves its stock. Pass either a saved
   * address id or a one-off address; the currency decides which of the
   * product's price columns is charged.
   */
  /** Guest checkout — no auth. Returns the order plus its one-off token. */
  async createGuestOrder(input: {
    contact: { name: string; email: string; phone: string };
    items: Array<{
      productId: string;
      quantity: number;
      size: string;
      color: string;
    }>;
    shippingAddress: AddressInput;
    currency: CurrencyCode;
    deliveryZoneId?: string;
    note?: string;
  }) {
    return this.request<{ order: Order; guestToken: string }>(
      "/orders/guest",
      { method: "POST", body: JSON.stringify(input) },
    );
  }

  async initializeGuestPaystack(
    orderId: string,
    guestToken: string,
    callbackUrl?: string,
  ) {
    return this.request<{ authorizationUrl: string; reference: string }>(
      "/payments/paystack/guest/initialize",
      {
        method: "POST",
        body: JSON.stringify({ orderId, guestToken, callbackUrl }),
      },
    );
  }

  async createOrder(input: {
    addressId?: string;
    shippingAddress?: AddressInput;
    currency: CurrencyCode;
    deliveryZoneId?: string;
    note?: string;
  }) {
    return this.request<Order>("/orders", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async cancelOrder(id: string, reason?: string) {
    return this.request<Order>(`/orders/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async updateOrderStatus(id: string, status: string) {
    return this.request<Order>(`/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  async getOrderStats() {
    return this.request<OrderStats>("/orders/stats");
  }

  async getUsers(pagination?: PageRequest) {
    const params = withPageParams(new URLSearchParams(), pagination);
    return this.request<Paginated<AdminUserSummary>>(
      `/users${queryString(params)}`,
    );
  }

  // --- Customer detail (admin) ---
  async getCustomer(id: string) {
    return this.request<AdminUserSummary>(`/users/customers/${id}`);
  }

  async getCustomerOrders(id: string, pagination?: PageRequest) {
    const params = withPageParams(new URLSearchParams(), pagination);
    return this.request<Paginated<Order>>(
      `/users/customers/${id}/orders${queryString(params)}`,
    );
  }

  async getCustomerWishlist(id: string) {
    return this.request<WishlistItem[]>(`/users/customers/${id}/wishlist`);
  }

  async setCustomerSuspension(id: string, suspended: boolean, reason?: string) {
    return this.request<AdminUserSummary>(`/users/customers/${id}/suspension`, {
      method: "PATCH",
      body: JSON.stringify({ suspended, reason }),
    });
  }

  async updateAdminStatus(id: string, status: AdminStatus) {
    return this.request<AdminUserSummary>(`/users/admins/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  async removeAdmin(id: string) {
    const response = await this.request<{
      message: string;
      user: AdminUserSummary;
    }>(`/users/admins/${id}`, {
      method: "DELETE",
    });
    return response.user;
  }

  /** Audit logs use keyset pagination — pass the previous page's nextCursor. */
  async getAuditLogs(limit = 50, cursor?: string | null) {
    const params = new URLSearchParams();
    if (limit) {
      params.set("limit", String(limit));
    }
    if (cursor) {
      params.set("cursor", cursor);
    }
    return this.request<CursorPage<AuditLog>>(
      `/audit-logs${queryString(params)}`,
    );
  }

  // Reviews endpoints
  async getProductReviews(productId: string, pagination?: PageRequest) {
    const params = withPageParams(new URLSearchParams(), pagination);
    return this.request<Paginated<Review>>(
      `/products/${productId}/reviews${queryString(params)}`,
    );
  }

  async getFeaturedReviews(limit = 6) {
    return this.request<FeaturedReview[]>(`/reviews/featured?limit=${limit}`);
  }

  async getReviewEligibility(productId: string) {
    return this.request<ReviewEligibility>(
      `/products/${productId}/reviews/eligibility`,
    );
  }

  async createReview(
    productId: string,
    payload: { rating: number; title?: string; comment: string },
  ) {
    return this.request<Review>(`/products/${productId}/reviews`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getReviews(status?: ReviewStatus, pagination?: PageRequest) {
    const params = new URLSearchParams();
    if (status) {
      params.set("status", status);
    }
    withPageParams(params, pagination);
    return this.request<Paginated<Review>>(`/reviews${queryString(params)}`);
  }

  async updateReviewStatus(id: string, status: ReviewStatus) {
    return this.request<Review>(`/reviews/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  async deleteReview(id: string) {
    return this.request<{ message: string }>(`/reviews/${id}`, {
      method: "DELETE",
    });
  }

  // Upload endpoints
  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/upload/image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    return response.json();
  }

  // Settings endpoints
  // --- Payments ---

  async getPaymentMethods(currency: CurrencyCode) {
    return this.request<PaymentMethod[]>(
      `/payments/methods?currency=${currency}`,
    );
  }

  async initializePaystack(orderId: string, callbackUrl?: string) {
    return this.request<PaystackInitialization>(
      "/payments/paystack/initialize",
      {
        method: "POST",
        body: JSON.stringify({ orderId, callbackUrl }),
      },
    );
  }

  async verifyPayment(reference: string) {
    return this.request<PaymentVerification>(
      `/payments/paystack/verify?reference=${encodeURIComponent(reference)}`,
    );
  }

  // --- Account ---

  async forgotPassword(email: string) {
    return this.request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string) {
    return this.request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  }

  async verifyEmail(token: string) {
    return this.request<{ verified: boolean }>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  async resendVerification(email: string) {
    return this.request<{ message: string }>("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // --- Contact ---

  async submitContactEnquiry(payload: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) {
    return this.request<{ message: string }>("/contact", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // --- Returns & refunds ---

  async getReturnEligibility(orderId: string) {
    return this.request<ReturnEligibility>(
      `/orders/${orderId}/returns/eligibility`,
    );
  }

  async createReturn(
    orderId: string,
    payload: {
      items: Array<{ orderItemId: string; quantity: number }>;
      reason: ReturnReason;
      customerNote?: string;
    },
  ) {
    return this.request<ReturnRequest>(`/orders/${orderId}/returns`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getReturns(status?: ReturnStatus, pagination?: PageRequest) {
    const params = withPageParams(new URLSearchParams(), pagination);
    if (status) params.set("status", status);
    return this.request<Paginated<ReturnRequest>>(
      `/returns${queryString(params)}`,
    );
  }

  async getReturn(id: string) {
    return this.request<ReturnRequest>(`/returns/${id}`);
  }

  async markReturnShipped(
    id: string,
    payload: { trackingNumber?: string; carrier?: string },
  ) {
    return this.request<ReturnRequest>(`/returns/${id}/ship`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async cancelReturn(id: string, reason?: string) {
    return this.request<ReturnRequest>(`/returns/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async updateReturnStatus(
    id: string,
    status: ReturnStatus,
    adminNote?: string,
  ) {
    return this.request<ReturnRequest>(`/returns/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, adminNote }),
    });
  }

  async refundReturn(id: string, merchantNote?: string) {
    return this.request<ReturnRequest>(`/returns/${id}/refund`, {
      method: "POST",
      body: JSON.stringify({ merchantNote }),
    });
  }

  async getReturnStats() {
    return this.request<ReturnStats>("/returns/stats");
  }

  // --- Inventory ---

  async getProductAvailability(productId: string) {
    return this.request<ProductAvailability>(
      `/products/${productId}/availability`,
    );
  }

  async getProductVariants(productId: string) {
    return this.request<ProductVariant[]>(`/products/${productId}/variants`);
  }

  async replaceProductVariants(
    productId: string,
    variants: Array<{
      size: string;
      color: string;
      stockQuantity: number;
      lowStockThreshold?: number;
      sku?: string;
    }>,
  ) {
    return this.request<ProductVariant[]>(`/products/${productId}/variants`, {
      method: "PUT",
      body: JSON.stringify({ variants }),
    });
  }

  async adjustStock(
    productId: string,
    size: string,
    color: string,
    stockQuantity: number,
  ) {
    return this.request<ProductVariant>(`/products/${productId}/stock`, {
      method: "PATCH",
      body: JSON.stringify({ size, color, stockQuantity }),
    });
  }

  async getLowStock() {
    return this.request<LowStockVariant[]>("/products/low-stock");
  }

  async getSettings() {
    return this.request<StoreSettings>("/settings");
  }

  async updateSettings(data: Partial<Omit<StoreSettings, "id" | "updatedAt">>) {
    return this.request<StoreSettings>("/settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }
}

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isDisabled: boolean;
  disabledAt?: string | null;
  emailVerified?: boolean;
  /** Authoritative role; isAdmin/isSuperAdmin are derived from it. */
  role?: AdminRole;
  permissions?: Permission[];
}

export interface Address {
  id: string;
  label: string;
  /** Who receives the parcel, when that is not the account holder. */
  recipientName?: string;
  /** Couriers here call ahead, so a delivery without a number stalls. */
  phone?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
}

export type AddressInput = Omit<Address, "id">;

import type { AdminRole, Permission } from "@/lib/roles";

export interface ProductColor {
  name: string;
  hex: string;
}

export interface Product {
  id: string;
  name: string;
  priceNaira?: number;
  priceUsd?: number;
  priceGbp?: number;
  price: number;
  originalPrice?: number;
  description: string;
  images: string[];
  category: string;
  subcategory: string;
  sizes: string[];
  colors: ProductColor[];
  brand: string;
  rating: number;
  reviews: number;
  isNew?: boolean;
  isSale?: boolean;
  inStock: boolean;
  material?: string;
  careInstructions?: string[];
  returnDays?: number;
  sizeGuideImage?: string;
}

export type ProductSort =
  | "featured"
  | "price-low"
  | "price-high"
  | "newest"
  | "rating";

export interface ProductFacets {
  brands: string[];
  categories: string[];
  minPrice: number;
  maxPrice: number;
}

export interface ProductFilters {
  category?: string;
  subcategory?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  isNew?: boolean;
  isSale?: boolean;
  search?: string;
  sizes?: string;
  colors?: string;
  currency?: string;
  sort?: ProductSort;
}

export interface DeliveryZone {
  id: string;
  name: string;
  areas: string[];
  priceNaira: number;
  priceUsd: number;
  priceGbp: number;
  minDays: number;
  maxDays: number;
  isActive: boolean;
  sortOrder: number;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DeliveryZoneInput = Omit<
  DeliveryZone,
  "id" | "createdAt" | "updatedAt"
>;

export interface Category {
  id: string;
  name: string;
  subcategories: string[];
}

export interface CartItem {
  cartItemId: string; // Cart item ID from the database
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

export interface CartResponse {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  priceNaira?: number;
  priceUsd?: number;
  priceGbp?: number;
  image: string;
  category: string;
  sizes?: string[];
  colors?: ProductColor[];
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  size: string;
  color: string;
  quantity: number;
  image: string;
}

export type OrderStatus =
  | "Pending"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export type PaymentStatus =
  | "Pending"
  | "Paid"
  | "Failed"
  | "Refunded"
  | "Abandoned";

export interface OrderStatusEvent {
  id: string;
  status: OrderStatus;
  note?: string | null;
  actorName?: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  /** The currency this order was priced and charged in. */
  currency: CurrencyCode;
  subtotal: number;
  shipping: number;
  total: number;
  shippingAddress: Address;
  items: OrderItem[];
  note?: string | null;
  deliveryZoneName?: string | null;
  deliveryEstimate?: string | null;
  paymentProvider?: string | null;
  paymentReference?: string | null;
  paidAt?: string | null;
  trackingNumber?: string | null;
  carrier?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  /** Present on the single-order endpoint only. */
  statusEvents?: OrderStatusEvent[];
  createdAt: string;
}

export interface OrderStats {
  totalOrders: number;
  paidOrders: number;
  statusCounts: Record<string, number>;
  /**
   * Revenue is reported per currency and deliberately not summed — adding
   * naira to pounds would produce a meaningless figure.
   */
  revenueByCurrency: Record<
    string,
    { revenue: number; orders: number; averageOrderValue: number }
  >;
}

export type CurrencyCode = "NGN" | "USD" | "GBP";

export interface PaymentMethod {
  provider: string;
  label: string;
  /** Channels available for the currency being checked out in. */
  channels?: string[];
  currencies: CurrencyCode[];
  /** False when the merchant enabled it but the server has no API key. */
  ready: boolean;
  publicKey?: string;
}

export interface PaystackInitialization {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: CurrencyCode;
  publicKey?: string;
}

export interface PaymentVerification {
  status: "success" | "failed";
  reason?: string;
  order: Order;
}

// --- Returns & refunds ---

export type ReturnStatus =
  | "Requested"
  | "Approved"
  | "Rejected"
  | "In transit"
  | "Received"
  | "Refunded"
  | "Cancelled";

export type RefundStatus = "None" | "Pending" | "Processed" | "Failed";

export const RETURN_REASONS = [
  "Does not fit",
  "Not as described",
  "Arrived damaged",
  "Wrong item sent",
  "Changed my mind",
  "Other",
] as const;

export type ReturnReason = (typeof RETURN_REASONS)[number];

export interface ReturnRequestItem {
  id: string;
  orderItemId: string;
  productId: string;
  name: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  image?: string;
}

export interface ReturnRequest {
  id: string;
  returnNumber: string;
  orderId: string;
  userId: string;
  status: ReturnStatus;
  reason: ReturnReason;
  customerNote?: string | null;
  adminNote?: string | null;
  currency: CurrencyCode;
  /** Items only — shipping is never refunded. */
  refundAmount: number;
  refundStatus: RefundStatus;
  refundReference?: string | null;
  refundFailureReason?: string | null;
  returnTrackingNumber?: string | null;
  returnCarrier?: string | null;
  handledByName?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  shippedAt?: string | null;
  receivedAt?: string | null;
  refundedAt?: string | null;
  cancelledAt?: string | null;
  restocked: boolean;
  items: ReturnRequestItem[];
  order?: Order;
  createdAt: string;
}

export interface ReturnableLine {
  orderItemId: string;
  productId: string;
  name: string;
  size: string;
  color: string;
  image: string;
  unitPrice: number;
  purchasedQuantity: number;
  /** Already spoken for by another return. */
  claimedQuantity: number;
  returnableQuantity: number;
  returnDays: number;
  returnWindowClosesAt: string | null;
  withinWindow: boolean;
  /** Why this line cannot be returned, when it cannot. */
  reason: string | null;
}

export interface ReturnEligibility {
  eligible: boolean;
  reason: string | null;
  currency: CurrencyCode;
  lines: ReturnableLine[];
}

export interface ReturnStats {
  statusCounts: Record<string, number>;
  refundedByCurrency: Record<string, { amount: number; returns: number }>;
  /** Returns waiting on the store to do something. */
  pendingAction: number;
}

export interface VariantAvailability {
  size: string;
  color: string;
  stockQuantity: number;
  inStock: boolean;
  lowStock: boolean;
}

export interface ProductAvailability {
  /** False when the product has no variant rows and falls back to inStock. */
  tracked: boolean;
  variants: VariantAvailability[];
}

export interface ProductVariant extends VariantAvailability {
  id: string;
  productId: string;
  lowStockThreshold: number;
  sku?: string;
}

export interface LowStockVariant extends VariantAvailability {
  productId: string;
  productName: string;
}

export interface PaymentMethodConfig {
  provider: string;
  label: string;
  enabled: boolean;
  currencies: CurrencyCode[];
}

export interface ShippingRate {
  flatRate: number;
  freeThreshold: number | null;
}

export type AdminStatus = "active" | "disabled";

export interface AdminUserSummary {
  id: string;
  role?: AdminRole;
  permissions?: Permission[];
  email: string;
  name: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isDisabled: boolean;
  disabledAt?: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  description?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  createdAt: string;
}

export interface AdminInvite {
  id: string;
  role?: AdminRole;
  token?: string;
  email: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expiresAt: string;
  acceptedAt?: string;
  invitedByName?: string;
  invitedByEmail?: string;
  createdAt: string;
  acceptUrl: string;
}

export interface InvitePreview {
  email: string;
  expiresAt: string;
  status: string;
}

export interface StoreSettings {
  id: number;
  storeName: string;
  contactEmail: string;
  currency: string;
  /** Which providers are live, and the currencies each will accept. */
  paymentMethods?: PaymentMethodConfig[];
  /** Per-currency flat rate and free-shipping threshold. */
  shippingRates?: Record<string, ShippingRate>;
  updatedAt: string;
}

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
  status: ReviewStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface FeaturedReview {
  id: string;
  productId: string;
  productName: string | null;
  userName: string;
  rating: number;
  title?: string | null;
  comment: string;
  createdAt: string;
}

export interface ReviewEligibility {
  hasPurchased: boolean;
  hasReviewed: boolean;
  canReview: boolean;
  reviewStatus: ReviewStatus | null;
}

// Export singleton instance
export const api = new ApiService();
export default api;
