import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  Heart,
  Loader2,
  Mail,
  ShieldCheck,
  ShoppingBag,
  UserCheck,
} from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import TablePagination from "@/components/ui/table-pagination";
import { statusTone, statusPill } from "@/lib/status-styles";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, resolveRole } from "@/lib/roles";

const ORDERS_PAGE_SIZE = 10;

const orderTone = (status: string) => {
  switch (status) {
    case "Delivered":
      return statusTone.success;
    case "Shipped":
      return statusTone.info;
    case "Processing":
      return statusTone.progress;
    case "Pending":
      return statusTone.warning;
    case "Cancelled":
      return statusTone.danger;
    default:
      return statusTone.neutral;
  }
};

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

const AdminCustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, can } = useAuth();
  const { formatPrice } = useCurrency();

  const [ordersPage, setOrdersPage] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const {
    data: customer,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => api.getCustomer(id as string),
    enabled: Boolean(id),
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["customer-orders", id, ordersPage],
    queryFn: () =>
      api.getCustomerOrders(id as string, {
        page: ordersPage,
        pageSize: ORDERS_PAGE_SIZE,
      }),
    enabled: Boolean(id),
  });

  const { data: wishlist, isLoading: wishlistLoading } = useQuery({
    queryKey: ["customer-wishlist", id],
    queryFn: () => api.getCustomerWishlist(id as string),
    enabled: Boolean(id),
  });

  // Suspension is a Manager+ action; Support can view customers but not lock
  // them out. The server enforces the same rule, so this only hides a control
  // that would be refused anyway.
  const canSuspend = can("customers:suspend") && customer?.id !== user?.id;
  const isSuspended = Boolean(customer?.isDisabled);

  const handleToggleSuspension = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      const updated = await api.setCustomerSuspension(
        id,
        !isSuspended,
        reason.trim() || undefined,
      );
      queryClient.setQueryData(["customer", id], updated);
      // The customers table shows the same status, so refresh it too.
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      toast.success(
        updated.isDisabled
          ? `${updated.name} has been suspended`
          : `${updated.name} has been reinstated`,
      );
      setReason("");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update this account",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-5xl text-center py-20">
          <h1 className="font-display text-2xl font-semibold mb-4">
            Customer not found
          </h1>
          <Button onClick={() => navigate("/admin?tab=customers")}>
            Back to customers
          </Button>
        </div>
      </div>
    );
  }

  const totalSpent = (orders?.data ?? []).reduce(
    (sum, order) => sum + Number(order.total ?? 0),
    0,
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back to customers"
            onClick={() => navigate("/admin?tab=customers")}>
            <ArrowLeft size={20} />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl font-semibold lg:text-2xl">
              {customer.name}
            </h1>
            <p className="truncate text-sm text-muted-foreground">
              {customer.email}
            </p>
          </div>
          {isSuspended && (
            <span className={cn(statusPill, statusTone.danger)}>Suspended</span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        {isSuspended && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3">
            <Ban size={18} className="mt-0.5 shrink-0 text-destructive" />
            <p className="text-sm">
              This account is suspended{" "}
              {customer.disabledAt && `since ${formatDate(customer.disabledAt)}`}
              . They cannot sign in and are asked to contact support.
            </p>
          </div>
        )}

        {/* Summary */}
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Orders",
              value: orders?.total ?? 0,
              icon: ShoppingBag,
            },
            {
              label: "Saved items",
              value: wishlist?.length ?? 0,
              icon: Heart,
            },
            {
              label: "Customer since",
              value: formatDate(customer.createdAt),
              icon: UserCheck,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                <stat.icon size={16} />
                <span className="text-sm">{stat.label}</span>
              </div>
              <p className="font-display text-2xl font-semibold">
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        {/* Profile + actions */}
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">
            Account details
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Full name</dt>
              <dd className="font-medium">{customer.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Email</dt>
              <dd className="flex items-center gap-2 font-medium">
                <Mail size={14} className="text-muted-foreground" />
                <a
                  href={`mailto:${customer.email}`}
                  className="truncate hover:text-accent">
                  {customer.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Role</dt>
              <dd className="font-medium">
                {ROLE_LABELS[resolveRole(customer)]}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Status</dt>
              <dd>
                <span
                  className={cn(
                    statusPill,
                    isSuspended ? statusTone.danger : statusTone.success,
                  )}>
                  {isSuspended ? "Suspended" : "Active"}
                </span>
              </dd>
            </div>
          </dl>

          {canSuspend && !customer.isAdmin && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                {isSuspended
                  ? "Reinstating restores sign-in immediately."
                  : "Suspending signs them out and blocks future sign-ins."}
              </p>
              <Button
                variant={isSuspended ? "outline" : "destructive"}
                onClick={() => setConfirmOpen(true)}
                disabled={isSaving}
                className="gap-2">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isSuspended ? (
                  <ShieldCheck size={16} />
                ) : (
                  <Ban size={16} />
                )}
                {isSaving
                  ? "Updating..."
                  : isSuspended
                    ? "Reinstate account"
                    : "Suspend account"}
              </Button>
            </div>
          )}

          {customer.isAdmin && (
            <p className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
              This is an admin account. Manage its access from{" "}
              <Link to="/admin/manage" className="text-accent underline">
                Admin Team
              </Link>
              .
            </p>
          )}
        </section>

        {/* Orders */}
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="font-display text-lg font-semibold">Orders</h2>
            {(orders?.total ?? 0) > 0 && (
              <p className="text-sm text-muted-foreground">
                {formatPrice(totalSpent)} on this page
              </p>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersLoading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : orders?.data.length ? (
                orders.data.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.orderNumber ?? order.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                    <TableCell>
                      <span className={cn(statusPill, orderTone(order.status))}>
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(Number(order.total ?? 0))}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-6 text-center text-sm text-muted-foreground">
                    No orders yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            page={ordersPage}
            pageSize={ORDERS_PAGE_SIZE}
            total={orders?.total ?? 0}
            totalPages={orders?.totalPages ?? 0}
            onPageChange={setOrdersPage}
            isLoading={ordersLoading}
            label="order"
          />
        </section>

        {/* Wishlist */}
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">
            Saved items
          </h2>
          {wishlistLoading ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <Skeleton key={idx} className="h-20 w-full" />
              ))}
            </div>
          ) : wishlist?.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {wishlist.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/product/${item.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-accent">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-muted">
                      {item.image && (
                        <img
                          src={item.image}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(Number(item.price ?? 0))}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing saved yet.
            </p>
          )}
        </section>
      </main>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setReason("");
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isSuspended
                ? `Reinstate ${customer.name}?`
                : `Suspend ${customer.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isSuspended
                ? "They will be able to sign in again straight away."
                : "They will be signed out of any active session and cannot sign in again. They will be told to contact support."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {!isSuspended && (
            <div className="space-y-2">
              <Label htmlFor="suspend-reason">Reason (optional)</Label>
              <Input
                id="suspend-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Recorded in the audit log"
                maxLength={500}
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            {/* No preventDefault here: suppressing Radix's own close leaves the
                dialog mounted, and because its contents change as soon as the
                status flips, the exit animation never completes — which strands
                `pointer-events: none` on <body> and locks the whole page. Let
                it close, and report the outcome with a toast. */}
            <AlertDialogAction
              onClick={handleToggleSuspension}
              disabled={isSaving}
              className={cn(
                !isSuspended &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}>
              {isSuspended ? "Reinstate" : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCustomerDetail;
