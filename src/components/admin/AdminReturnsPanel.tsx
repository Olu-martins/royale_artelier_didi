import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { Loader2, Undo2, AlertCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import TablePagination from "@/components/ui/table-pagination";
import { toast } from "sonner";
import api, { ReturnRequest, ReturnStatus } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatMoneyIn } from "@/lib/money";
import { statusTone, returnStatusTone } from "@/lib/status-styles";

const PAGE_SIZE = 25;

const FILTERS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All returns" },
  { value: "Requested", label: "Awaiting decision" },
  { value: "Approved", label: "Approved" },
  { value: "In transit", label: "On its way back" },
  { value: "Received", label: "Received — ready to refund" },
  { value: "Refunded", label: "Refunded" },
  { value: "Rejected", label: "Rejected" },
  { value: "Cancelled", label: "Withdrawn" },
];

const AdminReturnsPanel = () => {
  const queryClient = useQueryClient();
  const { can } = useAuth();

  // Support can take a return all the way to Received; only sending the money
  // back needs a manager. Hiding the button is presentation — the server
  // enforces refunds:issue on the endpoint regardless.
  const canRefund = can("refunds:issue");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<string>("all");
  const [rejecting, setRejecting] = useState<ReturnRequest | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [refunding, setRefunding] = useState<ReturnRequest | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-returns", filter, page],
    queryFn: () =>
      api.getReturns(
        filter === "all" ? undefined : (filter as ReturnStatus),
        { page, pageSize: PAGE_SIZE },
      ),
    placeholderData: keepPreviousData,
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-return-stats"],
    queryFn: () => api.getReturnStats(),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-returns"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-return-stats"] });
  };

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      adminNote,
    }: {
      id: string;
      status: ReturnStatus;
      adminNote?: string;
    }) => api.updateReturnStatus(id, status, adminNote),
    onSuccess: async (updated) => {
      await refresh();
      setRejecting(null);
      setRejectNote("");
      toast.success(`${updated.returnNumber} is now ${updated.status}`);
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  const refundMutation = useMutation({
    mutationFn: (id: string) => api.refundReturn(id),
    onSuccess: async (updated) => {
      await refresh();
      setRefunding(null);
      toast.success(
        updated.refundStatus === "Processed"
          ? `Refunded ${formatMoneyIn(updated.refundAmount, updated.currency)}`
          : "Refund sent to the payment provider",
      );
    },
    onError: (mutationError: Error) => {
      setRefunding(null);
      toast.error(mutationError.message);
    },
  });

  const returns = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Returns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {stats?.pendingAction
              ? `${stats.pendingAction} return${stats.pendingAction === 1 ? "" : "s"} waiting on you`
              : "Nothing waiting on you right now"}
          </p>
        </div>

        <Select
          value={filter}
          onValueChange={(value) => {
            setFilter(value);
            setPage(1);
          }}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
                {stats?.statusCounts?.[option.value]
                  ? ` (${stats.statusCounts[option.value]})`
                  : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive py-8 text-center">
          {(error as Error)?.message ?? "Could not load returns."}
        </p>
      ) : returns.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <Undo2 size={40} className="mx-auto text-muted-foreground mb-4" />
          <p className="font-medium mb-1">No returns here</p>
          <p className="text-sm text-muted-foreground">
            {filter === "all"
              ? "Nothing has been sent back yet."
              : "Nothing matches this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {returns.map((returnRequest) => {
            const isBusy =
              statusMutation.isPending || refundMutation.isPending;

            return (
              <div
                key={returnRequest.id}
                className="bg-card rounded-lg border border-border p-5">
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">
                        {returnRequest.returnNumber}
                      </p>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statusTone[returnStatusTone(returnRequest.status)]
                        }`}>
                        {returnRequest.status}
                      </span>
                      {returnRequest.refundStatus === "Pending" && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                          Refund pending
                        </span>
                      )}
                      {returnRequest.refundStatus === "Failed" && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300">
                          Refund failed
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {returnRequest.reason} ·{" "}
                      {new Date(returnRequest.createdAt).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </p>
                  </div>

                  <p className="text-lg font-semibold whitespace-nowrap">
                    {formatMoneyIn(
                      returnRequest.refundAmount,
                      returnRequest.currency,
                    )}
                  </p>
                </div>

                <div className="mt-4 space-y-1">
                  {returnRequest.items.map((item) => (
                    <p key={item.id} className="text-sm">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {item.size} / {item.color} · Qty {item.quantity}
                      </span>
                    </p>
                  ))}
                </div>

                {returnRequest.customerNote && (
                  <p className="text-sm text-muted-foreground mt-3 italic">
                    &ldquo;{returnRequest.customerNote}&rdquo;
                  </p>
                )}

                {returnRequest.returnTrackingNumber && (
                  <p className="text-sm text-muted-foreground mt-3">
                    {returnRequest.returnCarrier ?? "Tracking"}:{" "}
                    {returnRequest.returnTrackingNumber}
                  </p>
                )}

                {returnRequest.refundFailureReason && (
                  <p className="text-sm text-destructive mt-3 inline-flex items-start gap-1.5">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    {returnRequest.refundFailureReason}
                  </p>
                )}

                {returnRequest.adminNote && (
                  <p className="text-sm text-muted-foreground mt-3">
                    Note: {returnRequest.adminNote}
                  </p>
                )}

                <Separator className="my-4" />

                <div className="flex flex-wrap gap-2">
                  {returnRequest.status === "Requested" && (
                    <>
                      <Button
                        size="sm"
                        className="btn-primary"
                        disabled={isBusy}
                        onClick={() =>
                          statusMutation.mutate({
                            id: returnRequest.id,
                            status: "Approved",
                          })
                        }>
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => setRejecting(returnRequest)}>
                        Reject
                      </Button>
                    </>
                  )}

                  {(returnRequest.status === "Approved" ||
                    returnRequest.status === "In transit") && (
                    <Button
                      size="sm"
                      className="btn-primary"
                      disabled={isBusy}
                      onClick={() =>
                        statusMutation.mutate({
                          id: returnRequest.id,
                          status: "Received",
                        })
                      }>
                      Mark received
                    </Button>
                  )}

                  {returnRequest.status === "Received" &&
                    returnRequest.refundStatus !== "Pending" &&
                    (canRefund ? (
                      <Button
                        size="sm"
                        className="btn-primary"
                        disabled={isBusy}
                        onClick={() => setRefunding(returnRequest)}>
                        {returnRequest.refundStatus === "Failed"
                          ? "Retry refund"
                          : `Refund ${formatMoneyIn(returnRequest.refundAmount, returnRequest.currency)}`}
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2 inline-flex items-center gap-1.5">
                        <Lock size={13} />
                        {formatMoneyIn(
                          returnRequest.refundAmount,
                          returnRequest.currency,
                        )}{" "}
                        ready to refund — needs a manager
                      </p>
                    ))}

                  {returnRequest.status === "Received" &&
                    returnRequest.refundStatus === "Pending" && (
                      <p className="text-sm text-muted-foreground py-2">
                        Waiting for the provider to confirm the refund.
                      </p>
                    )}

                  {returnRequest.handledByName && (
                    <span className="text-xs text-muted-foreground self-center ml-auto">
                      Last handled by {returnRequest.handledByName}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          <TablePagination
            page={page}
            totalPages={data?.totalPages ?? 1}
            total={data?.total ?? 0}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            label="return"
          />
        </div>
      )}

      <Dialog
        open={Boolean(rejecting)}
        onOpenChange={(open) => {
          if (!open) {
            setRejecting(null);
            setRejectNote("");
          }
        }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Reject this return</DialogTitle>
            <DialogDescription>
              The customer is told why, so make it something you are happy for
              them to read.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-note">Reason</Label>
              <Textarea
                id="reject-note"
                rows={3}
                value={rejectNote}
                onChange={(event) => setRejectNote(event.target.value)}
                placeholder="Outside the return window for made-to-order pieces."
              />
            </div>
            <div className="flex gap-3">
              <Button
                className="btn-primary"
                disabled={statusMutation.isPending || !rejectNote.trim()}
                onClick={() =>
                  rejecting &&
                  statusMutation.mutate({
                    id: rejecting.id,
                    status: "Rejected",
                    adminNote: rejectNote.trim(),
                  })
                }>
                {statusMutation.isPending ? "Rejecting…" : "Reject return"}
              </Button>
              <Button variant="ghost" onClick={() => setRejecting(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(refunding)}
        onOpenChange={(open) => !open && setRefunding(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Refund{" "}
              {refunding &&
                formatMoneyIn(refunding.refundAmount, refunding.currency)}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This sends the money back to the card that paid for{" "}
              {refunding?.returnNumber}. Delivery charges are not included.
              Refunds cannot be undone from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => refunding && refundMutation.mutate(refunding.id)}>
              Issue refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminReturnsPanel;
