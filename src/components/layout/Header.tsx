import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingBag, Heart, User, Menu, X } from "lucide-react";
import CurrencySelect from "./CurrencySelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Category navigation is parked for now.
 *
 * Kept behind a flag rather than deleted so the links, the mobile menu and
 * its toggle all come back together by flipping this one value.
 */
const SHOW_CATEGORY_NAV = false;

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { user, isAuthenticated, logout } = useAuth();
  const accountDestination = isAuthenticated ? "/profile" : "/login";

  const mobileActions = [
    {
      id: "wishlist",
      label: "Wishlist",
      icon: Heart,
      count: wishlistItems.length,
      onClick: () => navigate("/wishlist"),
    },
    {
      id: "cart",
      label: "Bag",
      icon: ShoppingBag,
      count: totalItems,
      onClick: () => navigate("/cart"),
    },
    {
      id: "account",
      label: isAuthenticated ? "Profile" : "Sign In",
      icon: User,
      count: 0,
      onClick: () => navigate(accountDestination),
    },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        {/* Announcement Bar */}
        <div className="bg-primary text-primary-foreground text-center py-2 text-sm">
          Welcome to Royale Artelier, your seamless shopping experience awaits.</div>

        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-4 lg:gap-6 h-16">
            {/* Mobile Menu Button — the menu holds only the category links,
                so with those hidden there is nothing to toggle. */}
            {SHOW_CATEGORY_NAV && (
              <button
                className="lg:hidden p-2"
                aria-label="Menu"
                aria-expanded={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            )}

            {/* Logo */}
            <div className="flex items-center justify-center gap-2 shrink-0">
              {/* Mark is decorative next to the wordmark, and hidden on mobile
                  where the header only has room for the text. */}
              <img
                src="/logo.png"
                alt=""
                aria-hidden="true"
                width={32}
                height={32}
                decoding="async"
                className="hidden lg:block h-8 w-8 object-contain"
              />

              <Link
                to="/"
                className="text-xl sm:text-2xl lg:text-xl font-montserrat font-normal tracking-tight whitespace-nowrap">
                Royale Artelier
              </Link>
            </div>

            {/* Desktop Navigation. Gap tightens at lg so the nav, the search
                bar and the actions all fit on a 1024px screen without the
                wordmark colliding with the first link. */}
            {SHOW_CATEGORY_NAV && (
              <nav className="hidden lg:flex items-center gap-5 xl:gap-8 shrink-0">
                <Link
                  to="/products?category=Women"
                  className="text-sm font-medium link-underline">
                  Women
                </Link>
                <Link
                  to="/products?category=Men"
                  className="text-sm font-medium link-underline">
                  Men
                </Link>
                <Link
                  to="/products?isNew=true"
                  className="text-sm font-medium link-underline">
                  New Arrivals
                </Link>
                <Link
                  to="/products?isSale=true"
                  className="text-sm font-medium text-destructive link-underline">
                  Sale
                </Link>
              </nav>
            )}

            {/* Right Actions */}
            <div className="flex items-center gap-2 lg:gap-2 xl:gap-3 min-w-0 flex-1 justify-end">
              {/* Search — always open. It sits in the layout rather than
                  absolutely positioned, so it takes real width instead of
                  overlapping the actions beside it. */}
              <form
                onSubmit={handleSearch}
                role="search"
                className="hidden md:block relative min-w-0 flex-1 max-w-[18rem] xl:max-w-[28rem]">
                {/* A real submit button, not decoration: the form has no other
                    button, so without it submission relies on the browser's
                    implicit behaviour — and clicking the magnifier is what
                    people expect to do anyway. */}
                <button
                  type="submit"
                  aria-label="Search"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                  <Search size={17} aria-hidden />
                </button>
                <Input
                  type="search"
                  placeholder="Search for a piece, a brand…"
                  aria-label="Search products"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 input-elegant"
                />
              </form>

              {/* Currency — sits immediately right of the search field. It
                  restyles itself by breakpoint: a bare tappable code on
                  phones, an ordinary select from md up. Shown at every width,
                  since the mobile menu that used to hold it is gone. */}
              <CurrencySelect />

              {/* Wishlist */}
              <div className="hidden lg:block">
                <Link to="/wishlist" className="relative">
                  <Button variant="ghost" size="icon">
                    <Heart size={20} />
                    {wishlistItems.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center">
                        {wishlistItems.length}
                      </span>
                    )}
                  </Button>
                </Link>
              </div>

              {/* Cart */}
              <div className="hidden lg:block">
                <Link to="/cart" className="relative">
                  <Button variant="ghost" size="icon">
                    <ShoppingBag size={20} />
                    {totalItems > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center">
                        {totalItems}
                      </span>
                    )}
                  </Button>
                </Link>
              </div>

              {/* User Menu */}
              <div className="hidden lg:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <User size={20} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {isAuthenticated ? (
                      <>
                        <DropdownMenuItem className="font-medium">
                          Hi, {user?.name}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/profile")}>
                          My Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate("/profile?tab=orders")}>
                          My Orders
                        </DropdownMenuItem>
                        {user?.isAdmin && !user.isDisabled && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => navigate("/admin")}>
                              Admin Dashboard
                            </DropdownMenuItem>
                            {user.isSuperAdmin && (
                              <DropdownMenuItem
                                onClick={() => navigate("/admin/manage")}>
                                Admin Management
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={logout}>
                          Logout
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem onClick={() => navigate("/login")}>
                          Sign In
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/register")}>
                          Create Account
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Mobile search — the desktop bar is hidden below md, so search
              gets its own always-visible row rather than disappearing. */}
          <form
            onSubmit={handleSearch}
            role="search"
            className="md:hidden pb-3 relative">
            <button
              type="submit"
              aria-label="Search"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
              <Search size={17} aria-hidden />
            </button>
            <Input
              type="search"
              placeholder="Search for a piece, a brand…"
              aria-label="Search products"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 input-elegant"
            />
          </form>

          {/* Mobile Menu */}
          {SHOW_CATEGORY_NAV && isMobileMenuOpen && (
            <nav className="lg:hidden py-4 border-t border-border animate-fade-in">
              <div className="flex flex-col gap-4">
                <Link
                  to="/products?category=Women"
                  className="text-lg font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}>
                  Women
                </Link>
                <Link
                  to="/products?category=Men"
                  className="text-lg font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}>
                  Men
                </Link>
                <Link
                  to="/products?isNew=true"
                  className="text-lg font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}>
                  New Arrivals
                </Link>
                <Link
                  to="/products?isSale=true"
                  className="text-lg font-medium text-destructive"
                  onClick={() => setIsMobileMenuOpen(false)}>
                  Sale
                </Link>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-background/95 border-t border-border backdrop-blur supports-[backdrop-filter]:bg-background/75 z-50">
        <div className="grid grid-cols-3">
          {mobileActions.map((action) => (
            <button
              key={action.id}
              className="flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium"
              onClick={action.onClick}>
              <span className="relative">
                <action.icon size={20} />
                {action.count > 0 && (
                  <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[10px] flex items-center justify-center">
                    {action.count}
                  </span>
                )}
              </span>
              {action.label}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};

export default Header;
