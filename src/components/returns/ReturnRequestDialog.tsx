import { useMemo, useState, FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2, PackageOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import api, {
  RETURN_REASONS,
  ReturnReason,
  CurrencyCode,
} from "@/services/api";
import { formatMoneyIn } from "@/lib/money";

interface ReturnRequestDialogProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ReturnRequestDialog = ({
  orderId,
  open,
  onOpenChange,
}: ReturnRequestDialogProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<ReturnReason | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: eligibility, isLoading } = useQuery({
    queryKey: ["return-eligibility", orderId],
    queryFn: () => api.getReturnEligibility(orderId),
    enabled: open,
  });

  const currency = (eligibility?.currency ?? "NGN") as CurrencyCode;

  const selectedTotal = useMemo(() => {
    if (!eligibility) return 0;
    return eligibility.lines.reduce((sum, line) => {
      const quantity = quantities[line.orderItemId] ?? 0;
      return sum + line.unitPrice * quantity;
    }, 0);
  }, [eligibility, quantities]);

  const selectedCount = Object.values(quantities).reduce(
    (sum, quantity) => sum + quantity,
    0,
  );

  const createMutation = useMutation({
    mutationFn: () =>
      api.createReturn(orderId, {
        items: Object.entries(quantities)
          .filter(([, quantity]) => quantity > 0)
          .map(([orderItemId, quantity]) => ({ orderItemId, quantity })),
        reason: reason as ReturnReason,
        customerNote: note.trim() || undefined,
      }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["returns"] });
      await queryClient.invalidateQueries({
        queryKey: ["return-eligibility", orderId],
      });
      toast.success("Return requested");
      onOpenChange(false);
      navigate(`/returns/${created.id}`);
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (selectedCount === 0) {
      setError("Choose at least one item to send back");
      return;
    }

    if (!reason) {
      setError("Let us know why you are returning it");
      return;
    }

    createMutation.mutate();
  };

  const setQuantity = (orderItemId: string, quantity: number) => {
    setQuantities((prev) => ({ ...prev, [orderItemId]: quantity }));
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Return items</DialogTitle>
          <DialogDescription>
            Choose what you would like to send back. Delivery charges are not
            refunded.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-10 text-center">
            <Loader2 className="animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : !eligibility?.eligible ? (
          <div className="py-8 text-center">
            <PackageOpen
              size={36}
              className="mx-auto text-muted-foreground mb-4"
            />
            <p className="text-sm text-muted-foreground">
              {eligibility?.reason ??
                "This order cannot be returned at the moment."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-3">
              {eligibility.lines.map((line) => {
                const selectable = line.returnableQuantity > 0;
                const selected = quantities[line.orderItemId] ?? 0;

                return (
                  <div
                    key={line.orderItemId}
                    className={`border rounded-lg p-4 ${
                      selectable ? "border-border" : "border-border opacity-60"
                    }`}>
                    <div className="flex gap-3">
                      {line.image && (
                        <img
                          src={line.image}
                          alt={line.name}
                          className="w-12 h-16 object-cover rounded bg-muted shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{line.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {line.size} · {line.color} ·{" "}
                          {formatMoneyIn(line.unitPrice, currency)} each
                        </p>

                        {selectable ? (
                          <div className="flex items-center gap-2 mt-3">
                            <Label
                              htmlFor={`qty-${line.orderItemId}`}
                              className="text-xs text-muted-foreground">
                              Return
                            </Label>
                            <Select
                              value={String(selected)}
                              onValueChange={(value) =>
                                setQuantity(line.orderItemId, Number(value))
                              }>
                              <SelectTrigger
                                id={`qty-${line.orderItemId}`}
                                className="h-8 w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from(
                                  { length: line.returnableQuantity + 1 },
                                  (_, index) => index,
                                ).map((quantity) => (
                                  <SelectItem
                                    key={quantity}
                                    value={String(quantity)}>
                                    {quantity}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-xs text-muted-foreground">
                              of {line.returnableQuantity}
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-2">
                            {line.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <Label htmlFor="return-reason">Reason</Label>
              <Select
                value={reason}
                onValueChange={(value) => {
                  setReason(value as ReturnReason);
                  setError(null);
                }}>
                <SelectTrigger id="return-reason">
                  <SelectValue placeholder="Why are you returning this?" />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="return-note">
                Anything else?{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="return-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Tell us a little more, so we can put it right."
              />
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Estimated refund
              </span>
              <span className="font-semibold">
                {formatMoneyIn(selectedTotal, currency)}
              </span>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3">
              <Button
                type="submit"
                className="btn-primary"
                disabled={createMutation.isPending}>
                {createMutation.isPending
                  ? "Submitting…"
                  : "Request return"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReturnRequestDialog;
