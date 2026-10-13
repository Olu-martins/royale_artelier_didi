import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';

const Footer = () => {
  return (
    <footer className="mt-20 bg-primary text-primary-foreground dark:border-t dark:border-border dark:bg-card dark:text-card-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <h3 className="font-display text-2xl font-semibold mb-4">Royale Artelier</h3>
            <p className="mb-6 text-sm leading-relaxed opacity-80">
              Timeless elegance meets modern sophistication. Discover curated collections 
              of premium clothing designed for the discerning individual.
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-accent transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="hover:text-accent transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="hover:text-accent transition-colors">
                <Twitter size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Shop</h4>
            <ul className="space-y-3 text-sm opacity-80">
              <li><Link to="/products?category=Women" className="hover:text-accent transition-colors">Women</Link></li>
              <li><Link to="/products?category=Men" className="hover:text-accent transition-colors">Men</Link></li>
              <li><Link to="/products?isNew=true" className="hover:text-accent transition-colors">New Arrivals</Link></li>
              <li><Link to="/products?isSale=true" className="hover:text-accent transition-colors">Sale</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-semibold mb-4">Customer Service</h4>
            <ul className="space-y-3 text-sm opacity-80">
              <li><Link to="/contact" className="hover:text-accent transition-colors">Contact Us</Link></li>
              <li><Link to="/shipping-returns" className="hover:text-accent transition-colors">Shipping & Returns</Link></li>
              <li><Link to="/size-guide" className="hover:text-accent transition-colors">Size Guide</Link></li>
              <li><Link to="/faqs" className="hover:text-accent transition-colors">FAQs</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-semibold mb-4">Newsletter</h4>
            <p className="mb-4 text-sm opacity-80">
              Subscribe for exclusive offers, new arrivals, and style inspiration.
            </p>
            <form className="flex gap-2">
              <Input
                type="email"
                placeholder="Your email"
                className="border-current/20 bg-current/10 text-current placeholder:text-current/50 dark:border-border dark:bg-background/40"
              />
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Mail size={18} />
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-current/20 pt-8 text-sm opacity-70 md:flex-row dark:border-border">
          <p>© 2025 Royale Artelier. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="#" className="hover:text-accent transition-colors">Privacy Policy</Link>
            <Link to="#" className="hover:text-accent transition-colors">Terms of Service</Link>
            {/* The footer is an inverted surface, so the toggle borrows the
                footer's own foreground colour instead of the default outline. */}
            <ThemeToggle className="h-9 w-9 border-current/25 bg-transparent text-current hover:bg-current/10 hover:text-current" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
