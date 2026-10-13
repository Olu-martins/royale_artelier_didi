import { useState } from "react";
import { FileImage, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import type { InvoiceFormat } from "@/lib/invoice";
import type { PickupLocation } from "@/lib/pickup-locations";
import { capitalizeName } from "@/lib/utils";

export interface SummaryLineItem {
  key: string;
  name: string;
  size: string;
  color: string;
  quantity: number;
  lineTotal: number;
}

export interface SummaryCustomer {
  name: string;
  email?: string;
  phone?: string;
  businessName?: string;
  addressLines: string[];
}

interface OrderSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: SummaryCustomer;
  pickup: PickupLocation | null;
  items: SummaryLineItem[];
  total: number;
  note?: string;
  formatPrice: (amount: number) => string;
  isGenerating: boolean;
  onGenerate: (format: InvoiceFormat) => void;
}

const OrderSummaryModal = ({
  open,
  onOpenChange,
  customer,
  pickup,
  items,
  total,
  note,
  formatPrice,
  isGenerating,
  onGenerate,
}: OrderSummaryModalProps) => {
  const [format, setFormat] = useState<InvoiceFormat>("pdf");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90dvh,900px)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 space-y-1.5 border-b border-border px-6 py-5 pr-12 text-left">
          <DialogTitle className="font-display text-2xl">
            Order summary
          </DialogTitle>
          <DialogDescription>
            Review your details, then generate an invoice to proceed.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          <div className="space-y-5 text-sm">
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Personal details
              </h3>
              <dl className="space-y-1.5">
                <div className="flex gap-1.5">
                  <dt className="shrink-0 text-muted-foreground">Name:</dt>
                  <dd className="min-w-0 font-medium break-words">
                    {capitalizeName(customer.name)}
                  </dd>
                </div>
                {customer.businessName?.trim() && (
                  <div className="flex gap-1.5">
                    <dt className="shrink-0 text-muted-foreground">Business:</dt>
                    <dd className="min-w-0 break-words">
                      {customer.businessName.trim()}
                    </dd>
                  </div>
                )}
                <div className="flex gap-1.5">
                  <dt className="shrink-0 text-muted-foreground">Address:</dt>
                  <dd className="min-w-0 break-words">
                    {customer.addressLines.filter(Boolean).join(", ") || "—"}
                  </dd>
                </div>
                {customer.phone && (
                  <div className="flex gap-1.5">
                    <dt className="shrink-0 text-muted-foreground">Phone:</dt>
                    <dd className="min-w-0 break-words">{customer.phone}</dd>
                  </div>
                )}
                {customer.email && (
                  <div className="flex gap-1.5">
                    <dt className="shrink-0 text-muted-foreground">Email:</dt>
                    <dd className="min-w-0 break-words">{customer.email}</dd>
                  </div>
                )}
              </dl>
            </section>

            {pickup && (
              <section>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Pickup location
                </h3>
                <p className="font-medium">{pickup.label}</p>
                <p className="text-muted-foreground">{pickup.address}</p>
              </section>
            )}

            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Items
              </h3>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.key} className="flex justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-muted-foreground">
                        Size {item.size} · {item.color} · Qty {item.quantity}
                      </p>
                    </div>
                    <p className="whitespace-nowrap font-semibold">
                      {formatPrice(item.lineTotal)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {note?.trim() && (
              <section>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Note
                </h3>
                <p className="text-muted-foreground">{note.trim()}</p>
              </section>
            )}

            <Separator />

            <div className="flex items-center justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>

            <section className="space-y-3 rounded-lg border border-border p-4">
              <Label className="text-sm font-medium">Invoice format</Label>
              <RadioGroup
                value={format}
                onValueChange={(value) => setFormat(value as InvoiceFormat)}
                className="grid gap-2">
                <label
                  htmlFor="invoice-pdf"
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 has-[:checked]:border-accent">
                  <RadioGroupItem value="pdf" id="invoice-pdf" />
                  <FileText size={16} className="text-muted-foreground" />
                  <span>PDF document</span>
                </label>
                <label
                  htmlFor="invoice-image"
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 has-[:checked]:border-accent">
                  <RadioGroupItem value="image" id="invoice-image" />
                  <FileImage size={16} className="text-muted-foreground" />
                  <span>Image (PNG)</span>
                </label>
              </RadioGroup>
            </section>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border px-6 py-4 sm:gap-2">
          <Button
            className="btn-primary w-full gap-2"
            size="lg"
            disabled={isGenerating || !pickup}
            onClick={() => onGenerate(format)}>
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating invoice…
              </>
            ) : (
              <>Generate {format === "pdf" ? "PDF" : "image"} invoice</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrderSummaryModal;
