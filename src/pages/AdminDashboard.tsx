import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  BarChart3,
  Settings,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  ArrowUpRight,
  RefreshCw,
  ShieldCheck,
  ScrollText,
  Copy,
  UserCheck,
  UserX,
  Ban,
  MessageSquare,
  Star,
  Check,
  X,
  Undo2,
  Download,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminProducts } from "@/contexts/AdminProductsContext";
import api, {
  Order,
  OrderStats,
  AdminUserSummary,
  AuditLog,
  AdminInvite,
  StoreSettings,
  Review,
  ReviewStatus,
} from "@/services/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import AdminReturnsPanel from "@/components/admin/AdminReturnsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { formatMoneyIn } from "@/lib/money";
import {
  downloadInvoice,
  invoicePayloadFromOrder,
  orderNoteParts,
} from "@/lib/invoice";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { statusTone } from "@/lib/status-styles";
import { cn } from "@/lib/utils";
import {
  AdminRole,
  INVITABLE_ROLES,
  Permission,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  resolveRole,
} from "@/lib/roles";
import ThemeToggle from "@/components/ThemeToggle";
import TablePagination from "@/components/ui/table-pagination";

const statusStyleMap: Record<Order["status"], string> = {
  Pending: statusTone.warning,
  Processing: statusTone.progress,
  Shipped: statusTone.info,
  Delivered: statusTone.success,
  Cancelled: statusTone.danger,
};

const AdminOrderDetailBody = ({
  order,
  customerName,
  customerEmail,
  downloadingInvoice,
  onDownload,
}: {
  order: Order;
  customerName: string;
  customerEmail: string | null;
  downloadingInvoice: boolean;
  onDownload: () => void;
}) => {
  const noteParts = orderNoteParts(order.note);

  return (
    <div className="space-y-5 text-sm">
      <section className="space-y-1.5">
        <p>
          <span className="text-muted-foreground">Customer: </span>
          {customerName}
        </p>
        {customerEmail && (
          <p>
            <span className="text-muted-foreground">Email: </span>
            {customerEmail}
          </p>
        )}
        {(order.guestPhone || order.shippingAddress?.phone) && (
          <p>
            <span className="text-muted-foreground">Phone: </span>
            {order.guestPhone || order.shippingAddress?.phone}
          </p>
        )}
        {noteParts.businessName && (
          <p>
            <span className="text-muted-foreground">Business: </span>
            {noteParts.businessName}
          </p>
        )}
        <p>
          <span className="text-muted-foreground">Status: </span>
          {order.status} · {order.paymentStatus}
        </p>
        <p>
          <span className="text-muted-foreground">Total: </span>
          {formatMoneyIn(order.total, order.currency)}
        </p>
      </section>

      {(noteParts.pickupLabel || noteParts.pickupAddress) && (
        <section>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pickup
          </h3>
          {noteParts.pickupLabel && (
            <p className="font-medium">{noteParts.pickupLabel}</p>
          )}
          {noteParts.pickupAddress && (
            <p className="text-muted-foreground">{noteParts.pickupAddress}</p>
          )}
        </section>
      )}

      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Items
        </h3>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.name}</p>
                <p className="text-muted-foreground">
                  Size {item.size} · {item.color} · Qty {item.quantity}
                </p>
              </div>
              <p className="whitespace-nowrap font-semibold">
                {formatMoneyIn(
                  Number(item.price) * item.quantity,
                  order.currency,
                )}
              </p>
            </div>
          ))}
        </div>
      </section>

      {noteParts.customerNote && (
        <section>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Note
          </h3>
          <p className="text-muted-foreground">{noteParts.customerNote}</p>
        </section>
      )}

      <Separator />

      <Button
        className="btn-primary w-full gap-2"
        size="lg"
        disabled={downloadingInvoice}
        onClick={onDownload}>
        {downloadingInvoice ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Preparing invoice…
          </>
        ) : (
          <>
            <Download size={16} />
            Download invoice
          </>
        )}
      </Button>
    </div>
  );
};

const inviteStatusStyleMap: Record<AdminInvite["status"], string> = {
  pending: statusTone.warning,
  accepted: statusTone.success,
  expired: statusTone.neutral,
  revoked: statusTone.danger,
};

const reviewStatusStyleMap: Record<ReviewStatus, string> = {
  pending: statusTone.warning,
  approved: statusTone.success,
  rejected: statusTone.danger,
};

type AdminTab =
  | "dashboard"
  | "products"
  | "orders"
  | "returns"
  | "reviews"
  | "customers"
  | "analytics"
  | "team"
  | "audit"
  | "settings";

type AdminNavItem = {
  id: AdminTab;
  label: string;
  icon: LucideIcon;
  isLink?: boolean;
  href?: string;
  /** Permission a role must hold for this section to appear. */
  permission: Permission;
};

type AdminDashboardProps = {
  initialTab?: AdminTab;
};

const menuItems: AdminNavItem[] = [
  {
    id: "dashboard",
    label: "Overview",
    icon: LayoutDashboard,
    permission: "dashboard:view",
  },
  {
    id: "products",
    label: "Products",
    icon: Package,
    permission: "products:manage",
  },
  {
    id: "orders",
    label: "Orders",
    icon: ShoppingCart,
    permission: "orders:manage",
  },
  {
    id: "returns",
    label: "Returns",
    icon: Undo2,
    // Returns are order management; they do not warrant a separate role.
    permission: "orders:manage",
  },
  // Reviews paused — no review feature in the storefront yet.
  // {
  //   id: "reviews",
  //   label: "Reviews",
  //   icon: MessageSquare,
  //   permission: "reviews:moderate",
  // },
  {
    id: "customers",
    label: "Customers",
    icon: Users,
    permission: "customers:view",
  },
  {
    id: "team",
    label: "Admin Team",
    icon: ShieldCheck,
    isLink: true,
    href: "/admin/manage",
    permission: "team:manage",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    permission: "analytics:view",
  },
  {
    id: "audit",
    label: "Audit Logs",
    icon: ScrollText,
    permission: "audit:view",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    permission: "settings:manage",
  },
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  initialTab = "dashboard",
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, can, role, isLoading: isAuthLoading } =
    useAuth();
  const {
    formatPrice: formatCurrencyFromCtx,
    currency,
    getProductPrice,
    refetchSettings,
  } = useCurrency();
  const { products, deleteProduct } = useAdminProducts();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [viewingOrderLoading, setViewingOrderLoading] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [customers, setCustomers] = useState<AdminUserSummary[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewActionId, setReviewActionId] = useState<string | null>(null);
  const [reviewStatusFilter, setReviewStatusFilter] = useState<
    ReviewStatus | "all"
  >("pending");
  const [adminStatusUpdatingId, setAdminStatusUpdatingId] = useState<
    string | null
  >(null);
  const [adminDeletingId, setAdminDeletingId] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [storeSettings, setStoreSettings] = useState<Partial<StoreSettings>>(
    {},
  );
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    const tab = searchParams.get("tab");
    if (tab && menuItems.some((item) => item.id === tab)) {
      return tab as AdminTab;
    }
    return initialTab;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // One page cursor per table. Audit logs use a cursor stack instead of a page
  // number so "Previous" can walk back without re-querying from the start.
  const ADMIN_PAGE_SIZE = 25;
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersMeta, setOrdersMeta] = useState({ total: 0, totalPages: 0 });
  const [customersPage, setCustomersPage] = useState(1);
  const [customersMeta, setCustomersMeta] = useState({ total: 0, totalPages: 0 });
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsMeta, setReviewsMeta] = useState({ total: 0, totalPages: 0 });
  const [invitesPage, setInvitesPage] = useState(1);
  const [invitesMeta, setInvitesMeta] = useState({ total: 0, totalPages: 0 });
  const [auditCursors, setAuditCursors] = useState<(string | null)[]>([null]);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [auditNextCursor, setAuditNextCursor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteRole, setInviteRole] = useState<AdminRole>("manager");

  const tabIsAccessible = useCallback(
    (tab: AdminTab) => {
      const navItem = menuItems.find((item) => item.id === tab);
      if (!navItem) return false;
      return can(navItem.permission);
    },
    [can],
  );

  const visibleMenuItems = useMemo(
    () => menuItems.filter((item) => tabIsAccessible(item.id)),
    [tabIsAccessible],
  );

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return products;
    }

    return products.filter((product) => {
      const searchTarget = [
        product.name,
        product.brand,
        product.category,
        product.subcategory,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchTarget.includes(query);
    });
  }, [products, searchQuery]);

  const handleDeleteProduct = useCallback(
    async (id: string) => {
      const confirmed = window.confirm(
        "Are you sure you want to delete this product?",
      );

      if (!confirmed) {
        return;
      }

      try {
        await deleteProduct(id);
        toast.success("Product deleted successfully");
      } catch (error) {
        console.error("Failed to delete product", error);
        toast.error("Unable to delete product. Please try again.");
      }
    },
    [deleteProduct],
  );

  const handleSendInvite = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!can("team:manage")) {
        toast.error("Your role cannot send invites");
        return;
      }

      if (!inviteEmail.trim()) {
        toast.error("Enter an email to invite");
        return;
      }

      setInviteSubmitting(true);
      try {
        const invite = await api.createAdminInvite(
          inviteEmail.trim(),
          inviteRole,
        );
        setInvites((prev) => [invite, ...prev]);
        setInviteEmail("");
        toast.success(
          `Invite sent to ${invite.email} as ${ROLE_LABELS[inviteRole]}`,
        );
      } catch (error) {
        console.error("Failed to send invite", error);
        toast.error("Unable to send invite. Please try again.");
      } finally {
        setInviteSubmitting(false);
      }
    },
    [inviteEmail, inviteRole, can],
  );

  const handleCopyInviteLink = useCallback(async (url: string) => {
    try {
      await navigator.clipboard?.writeText(url);
      toast.success("Invite link copied");
    } catch (error) {
      console.error("Failed to copy invite link", error);
      toast.error("Unable to copy invite link");
    }
  }, []);

  const canManageAdmin = useCallback(
    (admin: AdminUserSummary) => {
      if (!can("team:manage")) return false;
      if (admin.id === user?.id) return false;
      if (admin.isSuperAdmin) return false;
      return true;
    },
    [user?.id, can],
  );

  const handleAdminStatusToggle = useCallback(
    async (admin: AdminUserSummary) => {
      if (!canManageAdmin(admin)) {
        toast.error("You cannot modify this admin");
        return;
      }

      const nextStatus = admin.isDisabled ? "active" : "disabled";
      if (
        nextStatus === "disabled" &&
        !window.confirm(`Disable admin access for ${admin.name}?`)
      ) {
        return;
      }

      setAdminStatusUpdatingId(admin.id);
      try {
        const updated = await api.updateAdminStatus(admin.id, nextStatus);
        setCustomers((prev) =>
          prev.map((customer) =>
            customer.id === updated.id ? { ...customer, ...updated } : customer,
          ),
        );
        toast.success(
          nextStatus === "disabled"
            ? `${admin.name} is now disabled`
            : `${admin.name} is active again`,
        );
      } catch (error) {
        console.error("Failed to update admin status", error);
        toast.error("Unable to update admin status. Please try again.");
      } finally {
        setAdminStatusUpdatingId(null);
      }
    },
    [canManageAdmin],
  );

  const handleRemoveAdmin = useCallback(
    async (admin: AdminUserSummary) => {
      if (!canManageAdmin(admin)) {
        toast.error("You cannot remove this admin");
        return;
      }

      const confirmed = window.confirm(
        `Remove admin access for ${admin.name}? This cannot be undone without sending a new invite.`,
      );
      if (!confirmed) {
        return;
      }

      setAdminDeletingId(admin.id);
      try {
        const updated = await api.removeAdmin(admin.id);
        setCustomers((prev) =>
          prev.map((customer) =>
            customer.id === updated.id ? { ...customer, ...updated } : customer,
          ),
        );
        toast.success(`${admin.name} no longer has admin access`);
      } catch (error) {
        console.error("Failed to delete admin", error);
        toast.error("Unable to delete admin. Please try again.");
      } finally {
        setAdminDeletingId(null);
      }
    },
    [canManageAdmin],
  );

  const handleModerateReview = useCallback(
    async (id: string, status: ReviewStatus) => {
      setReviewActionId(id);
      try {
        const updated = await api.updateReviewStatus(id, status);
        setReviews((prev) =>
          reviewStatusFilter === "all"
            ? prev.map((review) => (review.id === id ? updated : review))
            : prev.filter((review) => review.id !== id),
        );
        toast.success(
          status === "approved" ? "Review approved" : "Review rejected",
        );
      } catch (error) {
        console.error("Failed to moderate review", error);
        toast.error("Unable to update review. Please try again.");
      } finally {
        setReviewActionId(null);
      }
    },
    [reviewStatusFilter],
  );

  const fetchAdminData = useCallback(async () => {
    if (!user?.isAdmin) return;

    setIsSyncing(true);
    setDataError(null);
    setOrdersLoading(true);
    setStatsLoading(true);
    setCustomersLoading(true);
    setAuditLoading(true);
    setInvitesLoading(true);

    try {
      // Only request what this role may read. Firing every call regardless
      // would return 403s and surface an error banner for sections the admin
      // was never meant to see.
      const emptyPage = { data: [], total: 0, page: 1, pageSize: 0, totalPages: 0, hasMore: false };
      const ordersPromise = can("orders:manage")
        ? api.getOrders({ page: ordersPage, pageSize: ADMIN_PAGE_SIZE })
        : Promise.resolve(emptyPage);
      // Gated on analytics:view, not orders:manage — that is what the server
      // requires for /orders/stats. Support holds the latter but not the
      // former, so using it here 403'd and raised the error banner.
      const statsPromise = can("analytics:view")
        ? api.getOrderStats()
        : Promise.resolve(null);
      const customersPromise = can("customers:view")
        ? api.getUsers({ page: customersPage, pageSize: ADMIN_PAGE_SIZE })
        : Promise.resolve(emptyPage);
      const auditPromise = can("audit:view")
        ? api.getAuditLogs(ADMIN_PAGE_SIZE, auditCursors[auditCursors.length - 1])
        : Promise.resolve({ data: [], hasMore: false, nextCursor: null });
      const invitesPromise = can("team:manage")
        ? api.getAdminInvites({ page: invitesPage, pageSize: ADMIN_PAGE_SIZE })
        : Promise.resolve(null);

      const [ordersData, statsData, customersData, auditData, invitesData] =
        await Promise.all([
          ordersPromise,
          statsPromise,
          customersPromise,
          auditPromise,
          invitesPromise,
        ]);

      setOrders(ordersData.data);
      setOrdersMeta({
        total: ordersData.total,
        totalPages: ordersData.totalPages,
      });
      setOrderStats(statsData);
      setCustomers(customersData.data);
      setCustomersMeta({
        total: customersData.total,
        totalPages: customersData.totalPages,
      });
      setAuditLogs(auditData.data);
      setAuditHasMore(auditData.hasMore);
      setAuditNextCursor(auditData.nextCursor);
      setInvites(invitesData?.data ?? []);
      setInvitesMeta({
        total: invitesData?.total ?? 0,
        totalPages: invitesData?.totalPages ?? 0,
      });
    } catch (error) {
      console.error("Failed to load admin data:", error);
      setDataError("Unable to load admin data. Please try again.");
    } finally {
      setOrdersLoading(false);
      setStatsLoading(false);
      setCustomersLoading(false);
      setAuditLoading(false);
      setInvitesLoading(false);
      setIsSyncing(false);
    }
  }, [
    user?.isAdmin,
    can,
    ordersPage,
    customersPage,
    invitesPage,
    auditCursors,
  ]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const fetchReviews = useCallback(async () => {
    if (!can("reviews:moderate")) return;
    setReviewsLoading(true);
    try {
      const result = await api.getReviews(
        reviewStatusFilter === "all" ? undefined : reviewStatusFilter,
        { page: reviewsPage, pageSize: ADMIN_PAGE_SIZE },
      );
      setReviews(result.data);
      setReviewsMeta({ total: result.total, totalPages: result.totalPages });
    } catch (error) {
      console.error("Failed to load reviews", error);
    } finally {
      setReviewsLoading(false);
    }
  }, [can, reviewStatusFilter, reviewsPage]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    setSettingsLoading(true);
    api
      .getSettings()
      .then((s) => setStoreSettings(s))
      .catch(() => {})
      .finally(() => setSettingsLoading(false));
  }, []);

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const saved = await api.updateSettings({
        storeName: storeSettings.storeName,
        contactEmail: storeSettings.contactEmail,
        currency: storeSettings.currency,
      });
      setStoreSettings(saved);
      refetchSettings();
      toast.success("Settings saved");
    } catch (error) {
      console.error("Failed to save settings", error);
      toast.error("Unable to save settings. Please try again.");
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleRefreshData = () => {
    fetchAdminData();
    fetchReviews();
  };

  const formatCurrency = (value?: number | string) => {
    if (typeof value === "number") return formatCurrencyFromCtx(value);
    if (typeof value === "string") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return formatCurrencyFromCtx(parsed);
    }
    return "—";
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  /**
   * Revenue arrives split by currency and is deliberately not summed on the
   * server — naira and pounds are not addable. The tile shows the currency the
   * admin is currently viewing in, and names the others rather than hiding
   * them.
   */
  const revenueByCurrency = orderStats?.revenueByCurrency ?? {};
  const viewedRevenue = revenueByCurrency[currency];
  const otherCurrencies = Object.keys(revenueByCurrency).filter(
    (code) => code !== currency,
  );

  const statCards = [
    {
      label: `Revenue (${currency})`,
      value: formatCurrency(viewedRevenue?.revenue ?? 0),
      helper: otherCurrencies.length
        ? `Paid orders · also has ${otherCurrencies.join(", ")}`
        : "Paid orders only",
    },
    {
      label: "Total Orders",
      value: (orderStats?.totalOrders ?? 0).toString(),
      helper: `${orderStats?.paidOrders ?? 0} paid`,
    },
    {
      label: `Avg. Order Value (${currency})`,
      value: formatCurrency(viewedRevenue?.averageOrderValue ?? 0),
      helper: `Across ${viewedRevenue?.orders ?? 0} paid order(s)`,
    },
    {
      label: "Delivered Orders",
      value: (orderStats?.statusCounts?.Delivered ?? 0).toString(),
      helper: "Completed deliveries",
    },
  ];

  const recentOrders = orders.slice(0, 4);

  const customersById = useMemo(() => {
    const map = new Map<string, AdminUserSummary>();
    customers.forEach((customer) => map.set(customer.id, customer));
    return map;
  }, [customers]);

  const resolveCustomerName = (order: Order) => {
    if (order.guestName?.trim()) return order.guestName.trim();
    if (order.userId) {
      return customersById.get(order.userId)?.name || "Customer";
    }
    return order.shippingAddress?.recipientName || "Guest";
  };

  const openOrderDetails = async (orderId: string) => {
    setViewingOrderLoading(true);
    try {
      const order = await api.getOrder(orderId);
      setViewingOrder(order);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load order",
      );
    } finally {
      setViewingOrderLoading(false);
    }
  };

  const handleAdminDownloadInvoice = async (order: Order) => {
    setDownloadingInvoice(true);
    try {
      // Fresh fetch so guest contact + line items are present for the PDF.
      const full = await api.getOrder(order.id);
      await downloadInvoice(invoicePayloadFromOrder(full), "pdf");
      toast.success("Invoice downloaded");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not download invoice",
      );
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const adminTeamMembers = useMemo(
    () => customers.filter((customer) => customer.isAdmin),
    [customers],
  );

  const activeAdminCount = useMemo(
    () => adminTeamMembers.filter((admin) => !admin.isDisabled).length,
    [adminTeamMembers],
  );

  const disabledAdminCount = useMemo(
    () => adminTeamMembers.filter((admin) => admin.isDisabled).length,
    [adminTeamMembers],
  );

  const pendingInvites = useMemo(
    () => invites.filter((invite) => invite.status === "pending"),
    [invites],
  );

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      const casted = tab as AdminTab;
      if (tabIsAccessible(casted) && casted !== activeTab) {
        setActiveTab(casted);
      }
    }
  }, [searchParams, tabIsAccessible, activeTab]);

  useEffect(() => {
    // Wait for auth to resolve. While it is loading there is no user, so every
    // permission reads false and this would bounce the admin to the dashboard
    // before their real role is known — and, with no tab in the URL, never
    // send them back.
    if (isAuthLoading) return;

    if (!tabIsAccessible(activeTab)) {
      const fallback = tabIsAccessible(initialTab) ? initialTab : "dashboard";
      setActiveTab(fallback);
      setSearchParams({ tab: fallback });
    }
  }, [
    activeTab,
    tabIsAccessible,
    setSearchParams,
    initialTab,
    isAuthLoading,
  ]);

  const handleTabChange = (tab: AdminTab) => {
    if (!tabIsAccessible(tab)) {
      toast.error("Super admin access required");
      return;
    }
    setActiveTab(tab);
    setSearchParams({ tab });
    setSidebarOpen(false);
  };

  if (!isAuthenticated || !user?.isAdmin || user.isDisabled) {
    const isDisabledCopy = !!user?.isDisabled;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <h1 className="font-display text-2xl font-semibold mb-4">
            {isDisabledCopy
              ? "Admin Account Disabled"
              : "Admin Access Required"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {isDisabledCopy
              ? "This admin account has been disabled. Please contact a super admin to regain access."
              : "You need admin privileges to access this page."}
          </p>
          {!isDisabledCopy && (
            <Button onClick={() => navigate("/login")} className="btn-primary">
              Sign In as Admin
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        {/* Sidebar */}
        <Sidebar collapsible="icon" className="border-r border-sidebar-border">
          <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
            {/* Gold monogram tile anchors the panel and survives collapse. */}
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-display text-sm font-semibold shadow-sm">
              RA
            </span>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate font-display text-base font-semibold leading-tight text-sidebar-foreground">
                Royale Artelier
              </p>
              <p className="truncate text-xs text-sidebar-foreground/60">
                Admin console
              </p>
            </div>
            <SidebarTrigger className="group-data-[collapsible=icon]:hidden" />
          </div>

          <SidebarContent className="px-2 py-3">
            <SidebarGroup>
              <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {visibleMenuItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={isActive}
                          tooltip={item.label}
                          className={cn(
                            "group/nav relative h-10 rounded-lg font-medium transition-colors",
                            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            isActive &&
                              "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm",
                          )}
                          onClick={() => {
                            if (item.isLink && item.href) {
                              navigate(item.href);
                            } else {
                              handleTabChange(item.id as AdminTab);
                            }
                          }}>
                          {/* Gold rail marks the active item, including when
                              the sidebar is collapsed to icons. */}
                          <span
                            aria-hidden="true"
                            className={cn(
                              "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary transition-all duration-200",
                              isActive ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <item.icon
                            className={cn(
                              "transition-colors",
                              isActive
                                ? "text-sidebar-primary"
                                : "text-sidebar-foreground/70 group-hover/nav:text-sidebar-accent-foreground",
                            )}
                          />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="gap-3 border-t border-sidebar-border p-3 group-data-[collapsible=icon]:p-2">
            <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/50 px-2 py-2 group-data-[collapsible=icon]:hidden">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/15 text-xs font-semibold text-sidebar-primary">
                {user?.name?.trim().charAt(0).toUpperCase() ?? "A"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {user?.name}
                </p>
                <p className="truncate text-xs text-sidebar-foreground/60">
                  {ROLE_LABELS[role]}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full justify-center gap-2 bg-transparent group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-0"
              onClick={() => navigate("/")}>
              <ArrowUpRight size={18} />
              <span className="group-data-[collapsible=icon]:hidden">
                Back to Store
              </span>
            </Button>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        {/* Main Content */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-30 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 sm:px-6 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger className="lg:hidden" />
                <div className="min-w-0">
                  <h1 className="truncate font-display text-lg font-semibold capitalize leading-tight lg:text-2xl">
                    {activeTab}
                  </h1>
                  <p className="hidden truncate text-xs text-muted-foreground sm:block">
                    Welcome back, {user?.name}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <ThemeToggle />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefreshData}
                  disabled={isSyncing}
                  aria-label="Refresh data"
                  className="sm:hidden">
                  <RefreshCw
                    className={isSyncing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                  />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshData}
                  disabled={isSyncing}
                  className="hidden items-center gap-2 sm:flex">
                  <RefreshCw
                    className={isSyncing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                  />
                  Refresh
                </Button>
              </div>
            </div>
          </header>

          <div className="p-6 space-y-6">
            {dataError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {dataError}
              </div>
            )}
            {/* Dashboard Tab */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {statCards.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg border border-border bg-card p-6">
                      <p className="mb-1 text-sm text-muted-foreground">
                        {stat.label}
                      </p>
                      {statsLoading ? (
                        <Skeleton className="h-8 w-24" />
                      ) : (
                        <p className="mb-2 text-2xl font-semibold">
                          {stat.value}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {stat.helper}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Recent Orders */}
                <div className="bg-card rounded-lg border border-border">
                  <div className="p-6 border-b border-border flex justify-between items-center">
                    <h2 className="font-display text-lg font-semibold">
                      Recent Orders
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTabChange("orders")}>
                      View All
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordersLoading ? (
                        Array.from({ length: 4 }).map((_, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-32" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-20" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-6 w-16" />
                            </TableCell>
                            <TableCell className="text-right">
                              <Skeleton className="ml-auto h-4 w-12" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : recentOrders.length > 0 ? (
                        recentOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">
                              {order.orderNumber}
                            </TableCell>
                            <TableCell>
                              {resolveCustomerName(order)}
                            </TableCell>
                            <TableCell>{formatDate(order.createdAt)}</TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 text-xs font-medium ${
                                  statusStyleMap[order.status] ??
                                  statusTone.neutral
                                } rounded-full`}>
                                {order.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(order.total)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="py-6 text-center text-sm text-muted-foreground">
                            No orders yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Products Tab */}
            {activeTab === "products" && (
              <div className="space-y-6">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      size={18}
                    />
                    <Input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 input-elegant"
                    />
                  </div>
                  <Button
                    className="btn-primary"
                    onClick={() => navigate("/admin/products/add")}>
                    <Plus size={18} className="mr-2" />
                    Add Product
                  </Button>
                </div>

                {/* Products Table */}
                <div className="bg-card rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Image</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Sizes</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="w-12 h-12 rounded bg-muted overflow-hidden">
                              <img
                                src={product.images[0]}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {product.brand}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{product.category}</p>
                              <p className="text-sm text-muted-foreground">
                                {product.subcategory}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>
                                {formatCurrencyFromCtx(
                                  getProductPrice(product),
                                )}
                              </p>
                              {product.originalPrice && (
                                <p className="text-sm text-muted-foreground line-through">
                                  {formatCurrencyFromCtx(product.originalPrice)}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {product.sizes.join(", ")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full min-w-max text-xs font-medium ${
                                product.inStock
                                  ? statusTone.success
                                  : statusTone.danger
                              }`}>
                              {product.inStock ? "In Stock" : "Out of Stock"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  navigate(`/product/${product.id}`)
                                }>
                                <Eye size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  navigate(`/admin/products/edit/${product.id}`)
                                }>
                                <Edit size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => handleDeleteProduct(product.id)}>
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === "orders" && (
              <div className="bg-card rounded-lg border border-border">
                <div className="p-6 border-b border-border flex justify-between items-center">
                  <h2 className="font-display text-lg font-semibold">
                    All Orders
                  </h2>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Orders</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordersLoading ? (
                      Array.from({ length: 6 }).map((_, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-32" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-20" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-6 w-16" />
                          </TableCell>
                          <TableCell className="text-right">
                            <Skeleton className="ml-auto h-4 w-12" />
                          </TableCell>
                          <TableCell className="text-right">
                            <Skeleton className="ml-auto h-4 w-16" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : orders.length ? (
                      orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {order.orderNumber}
                          </TableCell>
                          <TableCell>
                            {resolveCustomerName(order)}
                          </TableCell>
                          <TableCell>{formatDate(order.createdAt)}</TableCell>
                          <TableCell>
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${
                                statusStyleMap[order.status] ??
                                statusTone.neutral
                              }`}>
                              {order.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatMoneyIn(order.total, order.currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={viewingOrderLoading}
                                onClick={() => void openOrderDetails(order.id)}>
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={downloadingInvoice}
                                onClick={() =>
                                  void handleAdminDownloadInvoice(order)
                                }
                                aria-label={`Download invoice for ${order.orderNumber}`}>
                                <Download size={14} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-6 text-center text-sm text-muted-foreground">
                          No orders yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <TablePagination
                  page={ordersPage}
                  pageSize={ADMIN_PAGE_SIZE}
                  total={ordersMeta.total}
                  totalPages={ordersMeta.totalPages}
                  onPageChange={setOrdersPage}
                  isLoading={ordersLoading}
                  label="order"
                />
              </div>
            )}

            {activeTab === "returns" && can("orders:manage") && (
              <AdminReturnsPanel />
            )}

            {/* Reviews tab paused — storefront has no reviews yet.
            {activeTab === "reviews" && (
              <div className="bg-card rounded-lg border border-border">
                ...reviews moderation UI...
              </div>
            )}
            */}

            {/* Customers Tab */}
            {activeTab === "customers" && (
              <div className="bg-card rounded-lg border border-border">
                <div className="p-6 border-b border-border">
                  <h2 className="font-display text-lg font-semibold">
                    Customer List
                  </h2>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customersLoading ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <TableRow key={idx}>
                          <TableCell colSpan={6}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : customers.length ? (
                      customers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">
                            {customer.name}
                          </TableCell>
                          <TableCell>{customer.email}</TableCell>
                          <TableCell>
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${
                                customer.isAdmin
                                  ? statusTone.progress
                                  : statusTone.neutral
                              }`}>
                              {customer.isAdmin ? "Admin" : "Customer"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${
                                customer.isDisabled
                                  ? statusTone.danger
                                  : statusTone.success
                              }`}>
                              {customer.isDisabled ? "Suspended" : "Active"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {formatDate(customer.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1"
                              onClick={() =>
                                navigate(`/admin/customers/${customer.id}`)
                              }>
                              <Eye size={16} />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-6 text-center text-sm text-muted-foreground">
                          No customers yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <TablePagination
                  page={customersPage}
                  pageSize={ADMIN_PAGE_SIZE}
                  total={customersMeta.total}
                  totalPages={customersMeta.totalPages}
                  onPageChange={setCustomersPage}
                  isLoading={customersLoading}
                  label="customer"
                />
              </div>
            )}

            {/* Team Tab */}
            {activeTab === "team" && can("team:manage") && (
              <div className="space-y-6">
                <div className="bg-card rounded-lg border border-border">
                  <div className="p-6 border-b border-border flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="font-display text-lg font-semibold">
                        Invite New Admins
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Pending invites: {pendingInvites.length} • Active
                        admins: {activeAdminCount} • Disabled admins:{" "}
                        {disabledAdminCount}
                      </p>
                    </div>
                    {pendingInvites[0] && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={() =>
                          handleCopyInviteLink(pendingInvites[0].acceptUrl)
                        }>
                        <Copy size={16} /> Copy latest invite link
                      </Button>
                    )}
                  </div>
                  <div className="p-6">
                    <form
                      onSubmit={handleSendInvite}
                      className="space-y-4">
                      <div className="flex flex-col gap-4 md:flex-row">
                        <Input
                          type="email"
                          placeholder="new.admin@royale.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="input-elegant md:flex-1"
                          required
                        />
                        <Select
                          value={inviteRole}
                          onValueChange={(value) =>
                            setInviteRole(value as AdminRole)
                          }>
                          <SelectTrigger className="md:w-52">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INVITABLE_ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="submit"
                          className="btn-primary"
                          disabled={inviteSubmitting}>
                          {inviteSubmitting ? "Sending..." : "Send Invite"}
                        </Button>
                      </div>
                      {/* Spell out what the chosen role can do, so access is a
                          deliberate choice rather than a guess at a label. */}
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {ROLE_LABELS[inviteRole]}:
                        </span>{" "}
                        {ROLE_DESCRIPTIONS[inviteRole]}
                      </p>
                    </form>
                    <p className="text-xs text-muted-foreground mt-3">
                      Invited admins receive an email with a secure link to set
                      their password and activate access.
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="bg-card rounded-lg border border-border">
                    <div className="p-6 border-b border-border">
                      <h2 className="font-display text-lg font-semibold">
                        Active Admins
                      </h2>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adminTeamMembers.length ? (
                          adminTeamMembers.map((admin) => (
                            <TableRow key={admin.id}>
                              <TableCell className="font-medium">
                                {admin.name}
                              </TableCell>
                              <TableCell>{admin.email}</TableCell>
                              <TableCell>
                                <span className="rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                                  {ROLE_LABELS[resolveRole(admin)]}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                                    admin.isDisabled
                                      ? statusTone.warning
                                      : statusTone.success
                                  }`}>
                                  {admin.isDisabled ? "Disabled" : "Active"}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {canManageAdmin(admin) ? (
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleAdminStatusToggle(admin)
                                      }
                                      disabled={
                                        adminStatusUpdatingId === admin.id ||
                                        adminDeletingId === admin.id
                                      }>
                                      {admin.isDisabled ? (
                                        <span className="flex items-center gap-2">
                                          <UserCheck size={14} /> Enable
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-2">
                                          <Ban size={14} /> Disable
                                        </span>
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive"
                                      onClick={() => handleRemoveAdmin(admin)}
                                      disabled={
                                        adminDeletingId === admin.id ||
                                        adminStatusUpdatingId === admin.id
                                      }>
                                      <span className="flex items-center gap-2">
                                        <UserX size={14} /> Remove
                                      </span>
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="py-6 text-center text-sm text-muted-foreground">
                              No admin accounts yet
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="bg-card rounded-lg border border-border">
                    <div className="p-6 border-b border-border">
                      <h2 className="font-display text-lg font-semibold">
                        Invitations
                      </h2>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitesLoading ? (
                          Array.from({ length: 4 }).map((_, idx) => (
                            <TableRow key={idx}>
                              <TableCell colSpan={5}>
                                <Skeleton className="h-4 w-full" />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : invites.length ? (
                          invites.map((invite) => (
                            <TableRow key={invite.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{invite.email}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Invited {formatDate(invite.createdAt)}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">
                                  {ROLE_LABELS[
                                    (invite.role as AdminRole) ?? "manager"
                                  ] ?? "Manager"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                                    inviteStatusStyleMap[invite.status] ||
                                    "bg-muted text-foreground"
                                  }`}>
                                  {invite.status.charAt(0).toUpperCase() +
                                    invite.status.slice(1)}
                                </span>
                              </TableCell>
                              <TableCell>
                                {formatDateTime(invite.expiresAt)}
                              </TableCell>
                              <TableCell className="text-right">
                                {invite.status === "pending" &&
                                  invite.acceptUrl && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleCopyInviteLink(invite.acceptUrl)
                                      }>
                                      <Copy size={14} className="mr-2" /> Copy
                                    </Button>
                                  )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="py-6 text-center text-sm text-muted-foreground">
                              No invites yet
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    <TablePagination
                      page={invitesPage}
                      pageSize={ADMIN_PAGE_SIZE}
                      total={invitesMeta.total}
                      totalPages={invitesMeta.totalPages}
                      onPageChange={setInvitesPage}
                      isLoading={invitesLoading}
                      label="invite"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Audit Logs Tab */}
            {activeTab === "audit" && (
              <div className="bg-card rounded-lg border border-border">
                <div className="p-6 border-b border-border flex justify-between items-center">
                  <div>
                    <h2 className="font-display text-lg font-semibold">
                      Recent Activity
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Latest administrative actions across the platform
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshData}
                    disabled={isSyncing}>
                    Refresh
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLoading ? (
                      Array.from({ length: 6 }).map((_, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Skeleton className="h-4 w-44" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-32" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-28" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-32" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : auditLogs.length ? (
                      auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {log.action.replace(/\./g, " • ")}
                              </p>
                              {log.description && (
                                <p className="text-xs text-muted-foreground">
                                  {log.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {log.actorName || "System"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {log.actorEmail || "—"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {log.entityType || "—"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {log.entityId || ""}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-6 text-center text-sm text-muted-foreground">
                          No audit logs yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Showing {auditLogs.length} entries
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={auditCursors.length <= 1 || auditLoading}
                      onClick={() =>
                        setAuditCursors((prev) =>
                          prev.length > 1 ? prev.slice(0, -1) : prev,
                        )
                      }>
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!auditHasMore || auditLoading}
                      onClick={() =>
                        setAuditCursors((prev) => [...prev, auditNextCursor])
                      }>
                      Older
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === "analytics" && (
              <div className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="font-semibold mb-4">Sales Overview</h3>
                    <div className="h-48 flex items-center justify-center bg-muted rounded-lg">
                      <p className="text-muted-foreground">Chart placeholder</p>
                    </div>
                  </div>
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="font-semibold mb-4">Top Products</h3>
                    <div className="space-y-4">
                      {products.slice(0, 5).map((product, index) => (
                        <div
                          key={product.id}
                          className="flex items-center gap-4">
                          <span className="text-muted-foreground w-6">
                            {index + 1}.
                          </span>
                          <div className="w-10 h-10 rounded bg-muted overflow-hidden">
                            <img
                              src={product.images[0]}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {product.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrencyFromCtx(getProductPrice(product))}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="max-w-2xl space-y-6">
                <div className="bg-card rounded-lg border border-border p-6">
                  <h3 className="font-semibold mb-4">Store Settings</h3>
                  {settingsLoading ? (
                    <p className="text-sm text-muted-foreground">
                      Loading settings...
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label>Store Name</Label>
                        <Input
                          className="mt-2"
                          value={storeSettings.storeName ?? ""}
                          onChange={(e) =>
                            setStoreSettings((prev) => ({
                              ...prev,
                              storeName: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Contact Email</Label>
                        <Input
                          className="mt-2"
                          type="email"
                          value={storeSettings.contactEmail ?? ""}
                          onChange={(e) =>
                            setStoreSettings((prev) => ({
                              ...prev,
                              contactEmail: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Currency</Label>
                        <Select
                          value={storeSettings.currency ?? "USD"}
                          onValueChange={(value) =>
                            setStoreSettings((prev) => ({
                              ...prev,
                              currency: value,
                            }))
                          }>
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NGN">NGN (₦)</SelectItem>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="GBP">GBP (£)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="JPY">JPY (¥)</SelectItem>
                            <SelectItem value="CAD">CAD (CA$)</SelectItem>
                            <SelectItem value="AUD">AUD (A$)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        className="btn-primary"
                        onClick={handleSaveSettings}
                        disabled={settingsSaving}>
                        {settingsSaving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <Dialog
        open={Boolean(viewingOrder) || viewingOrderLoading}
        onOpenChange={(open) => {
          if (!open) setViewingOrder(null);
        }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {viewingOrder?.orderNumber ?? "Order"}
            </DialogTitle>
            <DialogDescription>
              Order details recorded at checkout. Download the invoice to share
              or keep on file.
            </DialogDescription>
          </DialogHeader>

          {viewingOrderLoading || !viewingOrder ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <AdminOrderDetailBody
              order={viewingOrder}
              customerName={resolveCustomerName(viewingOrder)}
              customerEmail={
                viewingOrder.guestEmail ||
                customersById.get(viewingOrder.userId ?? "")?.email ||
                null
              }
              downloadingInvoice={downloadingInvoice}
              onDownload={() => void handleAdminDownloadInvoice(viewingOrder)}
            />
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default AdminDashboard;
