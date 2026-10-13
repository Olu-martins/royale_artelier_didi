import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminProductsProvider } from "@/contexts/AdminProductsContext";
import { CategoriesProvider } from "@/contexts/CategoriesContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { InvoiceShareProvider } from "@/contexts/InvoiceShareContext";
import RouterSEO from "@/components/RouterSEO";

import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Wishlist from "./pages/Wishlist";
import Checkout from "./pages/Checkout";
import CheckoutCallback from "./pages/CheckoutCallback";
import OrderDetail from "./pages/OrderDetail";
import ReturnDetail from "./pages/ReturnDetail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProductForm from "./pages/AdminProductForm";
import AdminCategories from "./pages/AdminCategories";
import AdminCustomerDetail from "./pages/AdminCustomerDetail";
import AdminInviteAccept from "./pages/AdminInviteAccept";
import AdminManagement from "./pages/AdminManagement";
import Contact from "./pages/Contact";
import ShippingReturns from "./pages/ShippingReturns";
import SizeGuide from "./pages/SizeGuide";
import FAQs from "./pages/FAQs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <AdminProductsProvider>
                <CategoriesProvider>
                  <CurrencyProvider>
                    <TooltipProvider>
                      <Toaster />
                      <Sonner />
                      <BrowserRouter>
                        <InvoiceShareProvider>
                        <RouterSEO />
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/products" element={<Products />} />
                          <Route
                            path="/product/:id"
                            element={<ProductDetail />}
                          />
                          <Route path="/cart" element={<Cart />} />
                          <Route path="/checkout" element={<Checkout />} />
                        <Route
                          path="/checkout/callback"
                          element={<CheckoutCallback />}
                        />
                        <Route path="/orders/:id" element={<OrderDetail />} />
                        <Route path="/returns/:id" element={<ReturnDetail />} />
                        <Route
                          path="/forgot-password"
                          element={<ForgotPassword />}
                        />
                        <Route
                          path="/reset-password"
                          element={<ResetPassword />}
                        />
                        <Route path="/verify-email" element={<VerifyEmail />} />
                          <Route path="/wishlist" element={<Wishlist />} />
                          <Route path="/login" element={<Login />} />
                          <Route path="/register" element={<Register />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/admin" element={<AdminDashboard />} />
                          <Route
                            path="/admin/manage"
                            element={<AdminManagement />}
                          />
                          <Route
                            path="/admin/invite/:token"
                            element={<AdminInviteAccept />}
                          />
                          <Route
                            path="/admin/products/add"
                            element={<AdminProductForm />}
                          />
                          <Route
                            path="/admin/products/edit/:id"
                            element={<AdminProductForm />}
                          />
                          <Route
                            path="/admin/categories"
                            element={<AdminCategories />}
                          />
                          <Route
                            path="/admin/customers/:id"
                            element={<AdminCustomerDetail />}
                          />
                          <Route path="/contact" element={<Contact />} />
                          <Route
                            path="/shipping-returns"
                            element={<ShippingReturns />}
                          />
                          <Route path="/size-guide" element={<SizeGuide />} />
                          <Route path="/faqs" element={<FAQs />} />
                          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                        </InvoiceShareProvider>
                      </BrowserRouter>
                    </TooltipProvider>
                  </CurrencyProvider>
                </CategoriesProvider>
              </AdminProductsProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
