import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Package, Heart, MapPin, Settings, LogOut, Undo2 } from 'lucide-react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import PageBreadcrumbs from '@/components/layout/PageBreadcrumbs';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  statusTone,
  orderStatusTone,
  returnStatusTone,
} from "@/lib/status-styles";
import AddressBook from '@/components/account/AddressBook';
import ChangePasswordDialog from '@/components/account/ChangePasswordDialog';
import type { CurrencyCode } from '@/services/api';

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '\u20a6',
  USD: '$',
  GBP: '\u00a3',
};

/**
 * Orders render in the currency they were charged in, not the shopper's
 * current site preference — the old hardcoded `$` mislabelled every naira
 * order on this page.
 */
const formatOrderTotal = (amount: number | string, currency?: CurrencyCode) => {
  const value = Number(amount);
  const symbol = CURRENCY_SYMBOLS[currency ?? ''] ?? '';
  return `${symbol}${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const Profile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, logout } = useAuth();
  const defaultTab = searchParams.get('tab') || 'profile';

  const [ordersPage, setOrdersPage] = useState(1);
  const { data: ordersResult, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'my', ordersPage],
    queryFn: () => api.getOrders({ page: ordersPage, pageSize: 10 }),
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  });
  const orders = ordersResult?.data ?? [];

  const [returnsPage, setReturnsPage] = useState(1);
  const { data: returnsResult, isLoading: returnsLoading } = useQuery({
    queryKey: ['returns', 'my', returnsPage],
    queryFn: () => api.getReturns(undefined, { page: returnsPage, pageSize: 10 }),
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  });
  const returns = returnsResult?.data ?? [];

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
  });

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <User size={64} className="mx-auto text-muted-foreground mb-6" />
          <h1 className="font-display text-3xl font-semibold mb-4">Sign in to view your profile</h1>
          <p className="text-muted-foreground mb-8">
            Access your orders, wishlist, and account settings
          </p>
          <Button onClick={() => navigate('/login')} size="lg" className="btn-primary">
            Sign In
          </Button>
        </div>
      </Layout>
    );
  }

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Profile updated successfully');
  };

  const orderStatusClass = (status: string) =>
    statusTone[orderStatusTone(status)];

  const returnStatusClass = (status: string) =>
    statusTone[returnStatusTone(status)];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <PageBreadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "My Account" },
            ]}
          />
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl font-semibold">My Account</h1>
              <p className="text-muted-foreground">Welcome back, {user?.name}</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut size={18} className="mr-2" />
              Logout
            </Button>
          </div>

          <Tabs defaultValue={defaultTab}>
            <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent h-auto p-0 mb-8">
              <TabsTrigger 
                value="profile" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2"
              >
                <User size={18} />
                Profile
              </TabsTrigger>
              <TabsTrigger 
                value="orders"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2"
              >
                <Package size={18} />
                Orders
              </TabsTrigger>
              <TabsTrigger 
                value="returns"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2"
              >
                <Undo2 size={18} />
                Returns
              </TabsTrigger>
              <TabsTrigger 
                value="addresses"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2"
              >
                <MapPin size={18} />
                Addresses
              </TabsTrigger>
              <TabsTrigger 
                value="settings"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2"
              >
                <Settings size={18} />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <div className="bg-card rounded-lg p-6">
                <h2 className="font-display text-xl font-semibold mb-6">Personal Information</h2>
                <form onSubmit={handleSaveProfile} className="space-y-6 max-w-md">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="mt-2 input-elegant"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="mt-2 input-elegant"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="mt-2 input-elegant"
                    />
                  </div>
                  <Button type="submit" className="btn-primary">
                    Save Changes
                  </Button>
                </form>
              </div>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders">
              <div className="space-y-4">
                {ordersLoading ? (
                  <p className="text-center text-muted-foreground py-8">Loading orders...</p>
                ) : orders.length === 0 ? (
                  <div className="bg-card rounded-lg p-12 text-center">
                    <Package size={48} className="mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-display text-lg font-semibold mb-2">No orders yet</h3>
                    <p className="text-muted-foreground mb-6">When you place an order, it will appear here.</p>
                    <Button onClick={() => navigate('/products')} className="btn-primary">Shop Now</Button>
                  </div>
                ) : (
                  orders.map((order) => (
                    <div key={order.id} className="bg-card rounded-lg p-6">
                      <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                        <div>
                          <p className="font-semibold">{order.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${orderStatusClass(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-border">
                        <p className="text-sm text-muted-foreground">{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</p>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold">
                            {formatOrderTotal(order.total, order.currency)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/orders/${order.id}`)}>
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Returns Tab */}
            <TabsContent value="returns">
              <div className="space-y-4">
                {returnsLoading ? (
                  <p className="text-center text-muted-foreground py-8">Loading returns...</p>
                ) : returns.length === 0 ? (
                  <div className="bg-card rounded-lg p-12 text-center">
                    <Undo2 size={48} className="mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-display text-lg font-semibold mb-2">No returns yet</h3>
                    <p className="text-muted-foreground mb-6">
                      You can start a return from a delivered order.
                    </p>
                    <Button onClick={() => navigate('/profile?tab=orders')} className="btn-primary">
                      View your orders
                    </Button>
                  </div>
                ) : (
                  returns.map((returnRequest) => (
                    <div key={returnRequest.id} className="bg-card rounded-lg p-6">
                      <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                        <div>
                          <p className="font-semibold">{returnRequest.returnNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            Requested on {new Date(returnRequest.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${returnStatusClass(returnRequest.status)}`}>
                          {returnRequest.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-border">
                        <p className="text-sm text-muted-foreground">
                          {returnRequest.items.length} {returnRequest.items.length === 1 ? 'item' : 'items'}
                        </p>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold">
                            {formatOrderTotal(returnRequest.refundAmount, returnRequest.currency)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/returns/${returnRequest.id}`)}>
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Addresses Tab */}
            <TabsContent value="addresses">
              <div className="bg-card rounded-lg p-6">
                <AddressBook />
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <div className="bg-card rounded-lg p-6 space-y-6">
                <div>
                  <h2 className="font-display text-xl font-semibold mb-4">Email Preferences</h2>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4" />
                      <span className="text-sm">Order updates and shipping notifications</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4" />
                      <span className="text-sm">New arrivals and promotions</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4" />
                      <span className="text-sm">Style tips and fashion news</span>
                    </label>
                  </div>
                </div>

                <div className="pt-6 border-t border-border">
                  <h2 className="font-display text-xl font-semibold mb-4">Account Security</h2>
                  <ChangePasswordDialog />
                </div>

                <div className="pt-6 border-t border-border">
                  <h2 className="font-display text-xl font-semibold mb-4 text-destructive">Danger Zone</h2>
                  <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                    Delete Account
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
