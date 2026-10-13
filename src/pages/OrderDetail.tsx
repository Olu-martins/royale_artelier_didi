import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import PageBreadcrumbs from "@/components/layout/PageBreadcrumbs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import { toast } from "sonner";
import api, { OrderStatus } from "@/services/api";
import { formatMoneyIn } from "@/lib/money";
import ReturnRequestDialog from "@/components/returns/ReturnRequestDialog";

const STEPS: Array<{ status: OrderStatus; label: string; icon: typeof Clock }> = [
  { status: "Pending", label: "Order placed", icon: Clock },
  { status: "Processing", label: "Being prepared", icon: Package },
  { status: "Shipped", label: "On its way", icon: Truck },
  { status: "Delivered", label: "Delivered", icon: CheckCircle2 },
];

const CANCELLABLE: OrderStatus[] = ["Pending", "Processing"];

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);

  const {
    data: order,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.getOrder(id as string),
    enabled: Boolean(id),
  });

  // Drives whether a Return button appears, and explains its absence when
  // the order is delivered but nothing is returnable.
  const { data: returnEligibility } = useQuery({
    queryKey: ["return-eligibility", id],
    queryFn: () => api.getReturnEligibility(id as string),
    enabled: Boolean(id),
  });

  const { data: existingReturns } = useQuery({
    queryKey: ["returns", "mine"],
    queryFn: () => api.getReturns(undefined, { pageSize: 50 }),
    enabled: Boolean(id),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => api.cancelOrder(id as string, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["order", id] });
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      setConfirmCancel(false);
      toast.success("Your order has been cancelled");
    },
    onError: (mutationError: Error) => {
      setConfirmCancel(false);
      toast.error(mutationError.message);
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center">
          <Loader2 className="animate-spin mx-auto text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (isError || !order) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-semibold mb-3">
            Order not found
          </h1>
          <p className="text-muted-foreground mb-8">
            {(error as Error)?.message ??
              "We could not find that order on your account."}
          </p>
          <Button className="btn-primary" asChild>
            <Link to="/profile?tab=orders">Back to your orders</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const isCancelled = order.status === "Cancelled";
  const currentStepIndex = STEPS.findIndex(
    (step) => step.status === order.status,
  );
  const canCancel = CANCELLABLE.includes(order.status);
  const canReturn = Boolean(returnEligibility?.eligible);

  const ordersReturns = (existingReturns?.data ?? []).filter(
    (returnRequest) => returnRequest.orderId === order.id,
  );

  const returnWindowNote =
    order.status === "Delivered" && !canReturn && returnEligibility?.reason
      ? returnEligibility.reason
      : null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <PageBreadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "My Account", href: "/profile" },
            { label: "Orders", href: "/profile?tab=orders" },
            { label: order.orderNumber },
          ]}
        />

        <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-semibold">
              {order.orderNumber}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Placed on{" "}
              {new Date(order.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold">
              {formatMoneyIn(order.total, order.currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              {order.paymentStatus === "Paid"
                ? "Paid"
                : `Payment ${order.paymentStatus.toLowerCase()}`}
            </p>
          </div>
        </div>

        {isCancelled ? (
          <div className="bg-card rounded-lg p-6 mb-8 flex gap-3">
            <XCircle className="text-destructive shrink-0" size={20} />
            <div>
              <p className="font-medium">This order was cancelled</p>
              {order.cancellationReason && (
                <p className="text-sm text-muted-foreground mt-1">
                  {order.cancellationReason}
                </p>
              )}
              {order.paymentStatus === "Paid" && (
                <p className="text-sm text-muted-foreground mt-1">
                  Any payment taken will be refunded to your original payment
                  method.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-lg p-6 mb-8">
            <ol className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {STEPS.map((step, index) => {
                const reached = index <= currentStepIndex;
                const Icon = step.icon;
                return (
                  <li key={step.status} className="text-center">
                    <div
                      className={`w-10 h-10 rounded-full mx-auto flex items-center justify-center mb-2 ${
                        reached
                          ? "bg-accent/15 text-accent"
                          : "bg-muted text-muted-foreground"
                      }`}>
                      <Icon size={18} />
                    </div>
                    <p
                      className={`text-xs ${
                        reached
                          ? "font-medium"
                          : "text-muted-foreground"
                      }`}>
                      {step.label}
                    </p>
                  </li>
                );
              })}
            </ol>

            {order.trackingNumber && (
              <>
                <Separator className="my-5" />
                <p className="text-sm">
                  <span className="text-muted-foreground">
                    {order.carrier ?? "Tracking"} number:{" "}
                  </span>
                  <span className="font-medium">{order.trackingNumber}</span>
                </p>
              </>
            )}
          </div>
        )}

        <div className="bg-card rounded-lg p-6 mb-6">
          <h2 className="font-display text-lg font-semibold mb-4">Items</h2>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-20 object-cover rounded bg-muted shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/product/${item.productId}`}
                    className="font-medium hover:underline">
                    {item.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    Size {item.size} · {item.color} · Qty {item.quantity}
                  </p>
                </div>
                <p className="font-semibold whitespace-nowrap">
                  {formatMoneyIn(
                    Number(item.price) * item.quantity,
                    order.currency,
                  )}
                </p>
              </div>
            ))}
          </div>

          <Separator className="my-5" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoneyIn(order.subtotal, order.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>
                {Number(order.shipping) === 0
                  ? "Free"
                  : formatMoneyIn(order.shipping, order.currency)}
              </span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-2">
              <span>Total</span>
              <span>{formatMoneyIn(order.total, order.currency)}</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 mb-6">
          <h2 className="font-display text-lg font-semibold mb-3">
            Delivery address
          </h2>
          <div className="text-sm">
            {order.shippingAddress.recipientName && (
              <p>{order.shippingAddress.recipientName}</p>
            )}
            <p className="text-muted-foreground">
              {order.shippingAddress.street}, {order.shippingAddress.city},{" "}
              {order.shippingAddress.state} {order.shippingAddress.zipCode},{" "}
              {order.shippingAddress.country}
            </p>
            {order.shippingAddress.phone && (
              <p className="text-muted-foreground">
                {order.shippingAddress.phone}
              </p>
            )}
          </div>
        </div>

        {order.statusEvents && order.statusEvents.length > 0 && (
          <div className="bg-card rounded-lg p-6 mb-6">
            <h2 className="font-display text-lg font-semibold mb-4">History</h2>
            <ol className="space-y-3">
              {order.statusEvents.map((event) => (
                <li key={event.id} className="flex gap-3 text-sm">
                  <span className="text-muted-foreground whitespace-nowrap">
                    {new Date(event.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span>
                    <span className="font-medium">{event.status}</span>
                    {event.note && (
                      <span className="text-muted-foreground"> — {event.note}</span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {ordersReturns.length > 0 && (
          <div className="bg-card rounded-lg p-6 mb-6">
            <h2 className="font-display text-lg font-semibold mb-4">Returns</h2>
            <div className="space-y-2">
              {ordersReturns.map((returnRequest) => (
                <Link
                  key={returnRequest.id}
                  to={`/returns/${returnRequest.id}`}
                  className="flex justify-between items-center text-sm border border-border rounded-lg px-4 py-3 hover:border-foreground transition-colors">
                  <span>
                    <span className="font-medium">
                      {returnRequest.returnNumber}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {returnRequest.items.length}{" "}
                      {returnRequest.items.length === 1 ? "item" : "items"}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    {returnRequest.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {canReturn && (
            <Button variant="outline" onClick={() => setReturnDialogOpen(true)}>
              Return items
            </Button>
          )}

          {canCancel && (
            <Button
              variant="outline"
              onClick={() => setConfirmCancel(true)}
              disabled={cancelMutation.isPending}>
              Cancel this order
            </Button>
          )}
        </div>

        {returnWindowNote && (
          <p className="text-xs text-muted-foreground mt-3">
            {returnWindowNote}
          </p>
        )}

        <ReturnRequestDialog
          orderId={order.id}
          open={returnDialogOpen}
          onOpenChange={setReturnDialogOpen}
        />

        <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
              <AlertDialogDescription>
                {order.orderNumber} will be cancelled and the items returned to
                stock.
                {order.paymentStatus === "Paid" &&
                  " Your payment will be refunded to the original payment method."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep my order</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => cancelMutation.mutate("Cancelled by customer")}>
                Cancel order
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default OrderDetail;
