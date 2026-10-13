import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck,
  Truck,
  PackageCheck,
  BadgeCheck,
  XCircle,
  Loader2,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import PageBreadcrumbs from "@/components/layout/PageBreadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import api, { ReturnStatus } from "@/services/api";
import { formatMoneyIn } from "@/lib/money";

const STEPS: Array<{
  status: ReturnStatus;
  label: string;
  icon: typeof ClipboardCheck;
}> = [
  { status: "Requested", label: "Requested", icon: ClipboardCheck },
  { status: "Approved", label: "Approved", icon: BadgeCheck },
  { status: "In transit", label: "On its way back", icon: Truck },
  { status: "Received", label: "Received", icon: PackageCheck },
  { status: "Refunded", label: "Refunded", icon: BadgeCheck },
];

/** Statuses the customer can still withdraw from. */
const WITHDRAWABLE: ReturnStatus[] = ["Requested", "Approved"];

const ReturnDetail = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [shipOpen, setShipOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");

  const {
    data: returnRequest,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["return", id],
    queryFn: () => api.getReturn(id as string),
    enabled: Boolean(id),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["return", id] });
    await queryClient.invalidateQueries({ queryKey: ["returns"] });
  };

  const shipMutation = useMutation({
    mutationFn: () =>
      api.markReturnShipped(id as string, {
        trackingNumber: trackingNumber.trim() || undefined,
        carrier: carrier.trim() || undefined,
      }),
    onSuccess: async () => {
      await invalidate();
      setShipOpen(false);
      toast.success("Thanks — we'll look out for it");
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelReturn(id as string, "Withdrawn by customer"),
    onSuccess: async () => {
      await invalidate();
      setConfirmCancel(false);
      toast.success("Return withdrawn");
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

  if (isError || !returnRequest) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-semibold mb-3">
            Return not found
          </h1>
          <p className="text-muted-foreground mb-8">
            {(error as Error)?.message ??
              "We could not find that return on your account."}
          </p>
          <Button className="btn-primary" asChild>
            <Link to="/profile?tab=returns">Back to your returns</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const isClosed =
    returnRequest.status === "Rejected" ||
    returnRequest.status === "Cancelled";
  const currentStepIndex = STEPS.findIndex(
    (step) => step.status === returnRequest.status,
  );
  const canWithdraw = WITHDRAWABLE.includes(returnRequest.status);
  const canMarkShipped = returnRequest.status === "Approved";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <PageBreadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "My Account", href: "/profile" },
            { label: "Returns", href: "/profile?tab=returns" },
            { label: returnRequest.returnNumber },
          ]}
        />

        <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-semibold">
              {returnRequest.returnNumber}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Requested on{" "}
              {new Date(returnRequest.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {returnRequest.order && (
                <>
                  {" · "}
                  <Link
                    to={`/orders/${returnRequest.orderId}`}
                    className="hover:underline">
                    {returnRequest.order.orderNumber}
                  </Link>
                </>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold">
              {formatMoneyIn(
                returnRequest.refundAmount,
                returnRequest.currency,
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {returnRequest.refundStatus === "Processed"
                ? "Refunded"
                : returnRequest.refundStatus === "Pending"
                  ? "Refund on its way"
                  : "Estimated refund"}
            </p>
          </div>
        </div>

        {isClosed ? (
          <div className="bg-card rounded-lg p-6 mb-8 flex gap-3">
            <XCircle className="text-destructive shrink-0" size={20} />
            <div>
              <p className="font-medium">
                {returnRequest.status === "Rejected"
                  ? "This return was not accepted"
                  : "You withdrew this return"}
              </p>
              {returnRequest.adminNote && (
                <p className="text-sm text-muted-foreground mt-1">
                  {returnRequest.adminNote}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-lg p-6 mb-8">
            <ol className="grid grid-cols-3 sm:grid-cols-5 gap-4">
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
                        reached ? "font-medium" : "text-muted-foreground"
                      }`}>
                      {step.label}
                    </p>
                  </li>
                );
              })}
            </ol>

            {returnRequest.adminNote && (
              <>
                <Separator className="my-5" />
                <p className="text-sm">
                  <span className="text-muted-foreground">
                    Note from our team:{" "}
                  </span>
                  {returnRequest.adminNote}
                </p>
              </>
            )}

            {returnRequest.returnTrackingNumber && (
              <>
                <Separator className="my-5" />
                <p className="text-sm">
                  <span className="text-muted-foreground">
                    {returnRequest.returnCarrier ?? "Tracking"} number:{" "}
                  </span>
                  <span className="font-medium">
                    {returnRequest.returnTrackingNumber}
                  </span>
                </p>
              </>
            )}
          </div>
        )}

        <div className="bg-card rounded-lg p-6 mb-6">
          <h2 className="font-display text-lg font-semibold mb-4">
            Items you are returning
          </h2>
          <div className="space-y-4">
            {returnRequest.items.map((item) => (
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
                  {formatMoneyIn(item.lineTotal, returnRequest.currency)}
                </p>
              </div>
            ))}
          </div>

          <Separator className="my-5" />

          <div className="flex justify-between font-semibold">
            <span>Refund total</span>
            <span>
              {formatMoneyIn(
                returnRequest.refundAmount,
                returnRequest.currency,
              )}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Delivery charges are not refunded.
          </p>
        </div>

        <div className="bg-card rounded-lg p-6 mb-6">
          <h2 className="font-display text-lg font-semibold mb-3">
            Your reason
          </h2>
          <p className="text-sm">{returnRequest.reason}</p>
          {returnRequest.customerNote && (
            <p className="text-sm text-muted-foreground mt-2">
              {returnRequest.customerNote}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {canMarkShipped && (
            <Button className="btn-primary" onClick={() => setShipOpen(true)}>
              I&apos;ve sent it back
            </Button>
          )}
          {canWithdraw && (
            <Button variant="outline" onClick={() => setConfirmCancel(true)}>
              Withdraw this return
            </Button>
          )}
        </div>

        <Dialog open={shipOpen} onOpenChange={setShipOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">
                Let us know it&apos;s on its way
              </DialogTitle>
              <DialogDescription>
                Add the tracking details if you have them — it helps us match
                your parcel when it arrives.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="carrier">
                  Courier{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="carrier"
                  value={carrier}
                  onChange={(event) => setCarrier(event.target.value)}
                  placeholder="GIG Logistics, DHL…"
                />
              </div>
              <div>
                <Label htmlFor="tracking">
                  Tracking number{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="tracking"
                  value={trackingNumber}
                  onChange={(event) => setTrackingNumber(event.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  className="btn-primary"
                  onClick={() => shipMutation.mutate()}
                  disabled={shipMutation.isPending}>
                  {shipMutation.isPending ? "Saving…" : "Confirm"}
                </Button>
                <Button variant="ghost" onClick={() => setShipOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Withdraw this return?</AlertDialogTitle>
              <AlertDialogDescription>
                {returnRequest.returnNumber} will be closed and the items will
                stay yours. You can start a new return later if the window is
                still open.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it open</AlertDialogCancel>
              <AlertDialogAction onClick={() => cancelMutation.mutate()}>
                Withdraw
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default ReturnDetail;
