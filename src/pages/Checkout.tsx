import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import Layout from "@/components/layout/Layout";
import PageBreadcrumbs from "@/components/layout/PageBreadcrumbs";
import AddressBook from "@/components/account/AddressBook";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import api, { Address, CurrencyCode, Order } from "@/services/api";
import BusinessOwnerFields from "@/components/checkout/BusinessOwnerFields";
import GuestDetailsForm from "@/components/checkout/GuestDetailsForm";
import PickupLocationPicker from "@/components/checkout/PickupLocationPicker";
import OrderSummaryModal from "@/components/checkout/OrderSummaryModal";
import {
  emptyGuestDetails,
  isGuestDetailsComplete,
  toGuestShippingFields,
  type GuestDetails,
} from "@/lib/guest-checkout";
import type { PickupLocation } from "@/lib/pickup-locations";
import {
  downloadInvoice,
  orderToInvoicePayload,
  type InvoiceFormat,
} from "@/lib/invoice";
import { useInvoiceShare } from "@/contexts/InvoiceShareContext";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { capitalizeName } from "@/lib/utils";

const NOTE_MAX = 500;

const buildOrderNote = (
  pickup: PickupLocation,
  note: string,
  businessName?: string,
) => {
  const parts = [
    `Pickup: ${pickup.label}`,
    `Pickup location: ${pickup.address}`,
  ];
  if (businessName?.trim()) {
    parts.push(`Business: ${businessName.trim()}`);
  }
  const trimmed = note.trim();
  if (trimmed) parts.push(trimmed);
  return parts.join("\n").slice(0, NOTE_MAX);
};

const Checkout = () => {
  const navigate = useNavigate();
  const { items, clearCart, removeItem, isLoading: cartLoading } = useCart();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { currency, formatPrice, getProductPrice } = useCurrency();
  const { offerInvoiceShare } = useInvoiceShare();

  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedPickup, setSelectedPickup] = useState<PickupLocation | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [guest, setGuest] = useState<GuestDetails>(emptyGuestDetails);
  const [businessName, setBusinessName] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: addresses = [] } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => api.getAddresses(),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (selectedAddress || addresses.length === 0) return;
    setSelectedAddress(
      addresses.find((address) => address.isDefault) ?? addresses[0],
    );
  }, [addresses, selectedAddress]);

  const getItemUnitPrice = (item: (typeof items)[number]) =>
    getProductPrice({
      price: Number(item.price ?? 0),
      priceUsd: item.priceUsd,
      priceNaira: item.priceNaira,
      priceGbp: item.priceGbp,
    } as Parameters<typeof getProductPrice>[0]);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + getItemUnitPrice(item) * item.quantity,
        0,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, currency],
  );

  // Shipping paused — pickup only for now.
  // const shipping = selectedZone ? rateFor(selectedZone, currency) : 0;
  const total = subtotal;

  const resolvedBusinessName = isAuthenticated
    ? businessName.trim()
    : guest.businessName.trim();

  const detailsReady = isAuthenticated
    ? Boolean(selectedAddress)
    : isGuestDetailsComplete(guest);

  const canContinue = detailsReady && Boolean(selectedPickup);

  const summaryCustomer = useMemo(() => {
    if (isAuthenticated && selectedAddress) {
      return {
        name: capitalizeName(
          selectedAddress.recipientName ||
            user?.name ||
            selectedAddress.label ||
            "Customer",
        ),
        email: user?.email,
        phone: selectedAddress.phone,
        businessName: resolvedBusinessName || undefined,
        addressLines: [
          `${selectedAddress.street}, ${selectedAddress.city}${
            selectedAddress.zipCode ? ` ${selectedAddress.zipCode}` : ""
          }, ${selectedAddress.country}`,
        ],
      };
    }

    return {
      name: capitalizeName(guest.name.trim()),
      email: guest.email.trim(),
      phone: guest.phone.trim(),
      businessName: resolvedBusinessName || undefined,
      addressLines: [
        `${guest.street.trim()}, ${guest.city.trim()}, ${guest.country.trim()}`,
      ],
    };
  }, [
    guest,
    isAuthenticated,
    resolvedBusinessName,
    selectedAddress,
    user?.email,
    user?.name,
  ]);

  const summaryItems = useMemo(
    () =>
      items.map((item) => ({
        key: `${item.id}-${item.size}-${item.color}`,
        name: item.name,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        lineTotal: getItemUnitPrice(item) * item.quantity,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, currency],
  );

  const createOrderRecord = (): {
    order: Order;
    customerEmail?: string;
  } => {
    if (!selectedPickup) {
      throw new Error("Choose a pickup location first");
    }

    const orderNote = buildOrderNote(
      selectedPickup,
      note,
      resolvedBusinessName,
    );
    const createdAt = new Date().toISOString();
    const dateStamp = createdAt.slice(0, 10).replace(/-/g, "");
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const shipping =
      isAuthenticated && selectedAddress
        ? selectedAddress
        : (() => {
            const guestShipping = toGuestShippingFields(guest);
            return {
              id: "guest",
              label: "Customer details",
              recipientName: guestShipping.name,
              phone: guestShipping.phone,
              street: guestShipping.street,
              city: guestShipping.city,
              state: guestShipping.state,
              zipCode: guestShipping.zipCode,
              country: guestShipping.country,
            };
          })();

    const order: Order = {
      id: crypto.randomUUID(),
      orderNumber: `RA-${dateStamp}-${suffix}`,
      status: "Pending",
      paymentStatus: "Pending",
      currency: currency as CurrencyCode,
      subtotal,
      shipping: 0,
      total,
      shippingAddress: shipping,
      items: items.map((item) => ({
        id: `${item.id}-${item.size}-${item.color}`,
        productId: item.id,
        name: item.name,
        price: getItemUnitPrice(item),
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        image: item.image,
      })),
      note: orderNote,
      createdAt,
    };

    return {
      order,
      customerEmail: isAuthenticated ? user?.email : guest.email.trim(),
    };
  };

  const handleGenerateInvoice = async (format: InvoiceFormat) => {
    if (!selectedPickup) {
      toast.error("Choose a pickup location first");
      return;
    }
    if (!detailsReady) {
      toast.error(
        isAuthenticated
          ? "Choose your details first"
          : "Fill in your details first",
      );
      return;
    }

    setIsGenerating(true);
    try {
      const { order, customerEmail } = await createOrderRecord();
      const payload = {
        ...orderToInvoicePayload(order, selectedPickup, formatPrice, {
          name: summaryCustomer.name,
          email: customerEmail ?? summaryCustomer.email,
          phone: summaryCustomer.phone,
          businessName: summaryCustomer.businessName,
        }),
        note: note.trim() || undefined,
      };

      const file = await downloadInvoice(payload, format);
      offerInvoiceShare({
        ...file,
        orderNumber: order.orderNumber,
      });
      await clearCart();
      setSummaryOpen(false);
      toast.success("Invoice downloaded. Your order has been recorded.");
      navigate("/products");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not generate invoice",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSummaryOpenChange = (open: boolean) => {
    setSummaryOpen(open);
  };

  if (authLoading || cartLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center">
          <Loader2 className="mx-auto animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <PageBreadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Shop", href: "/products" },
              { label: "Cart", href: "/cart" },
              { label: "Checkout" },
            ]}
          />
        </div>
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="mb-4 font-display text-3xl font-semibold">
            Cart Empty
          </h1>
          <p className="mb-8 text-muted-foreground">
            Add something from the collection to continue.
          </p>
          <Button
            onClick={() => navigate("/products")}
            size="lg"
            className="btn-primary">
            Browse Collection
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10">
        <PageBreadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Shop", href: "/products" },
            { label: "Cart", href: "/cart" },
            { label: "Checkout" },
          ]}
        />

        <div className="grid gap-10 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div>
              <h1 className="mb-2 font-display text-3xl font-semibold">
                Checkout
              </h1>
              <p className="text-sm text-muted-foreground">
                Add your details, choose a pickup location, then generate an
                invoice to complete payment offline.
              </p>
            </div>

            <div className="rounded-lg bg-card p-6">
              <h2 className="mb-4 font-display text-lg font-semibold">
                Your details
              </h2>
              {isAuthenticated ? (
                <div className="space-y-4">
                  <AddressBook
                    selectable
                    compact
                    selectedId={selectedAddress?.id ?? null}
                    onSelect={setSelectedAddress}
                  />
                  <BusinessOwnerFields
                    idPrefix="checkout-biz"
                    businessName={businessName}
                    onBusinessNameChange={setBusinessName}
                  />
                </div>
              ) : (
                <>
                  <GuestDetailsForm value={guest} onChange={setGuest} />
                  <p className="mt-4 text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link
                      to="/login?redirect=/checkout"
                      className="text-accent underline underline-offset-2">
                      Sign in
                    </Link>{" "}
                    to use your saved details.
                  </p>
                </>
              )}

              <div className="mt-6 border-t border-border pt-6">
                <h3 className="mb-1 font-medium">Pickup location</h3>
                <p className="mb-3 text-sm text-muted-foreground">
                  Choose where you will collect your order.
                </p>
                <PickupLocationPicker
                  selected={selectedPickup}
                  onSelect={setSelectedPickup}
                />
              </div>

              <div className="mt-6">
                <Label htmlFor="order-note">Note for us (optional)</Label>
                <Textarea
                  id="order-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={500}
                  placeholder="Preferred pickup day, colour preference, anything we should know…"
                  className="input-elegant mt-2 min-h-[80px]"
                />
              </div>

              <Button
                className="btn-primary mt-6 w-full"
                size="lg"
                disabled={!canContinue}
                onClick={() => setSummaryOpen(true)}>
                {!detailsReady
                  ? isAuthenticated
                    ? "Select your details to continue"
                    : "Fill in your details to continue"
                  : !selectedPickup
                    ? "Select a pickup location to continue"
                    : "Continue to order summary"}
              </Button>
            </div>
          </div>

          <div className="h-fit space-y-4 rounded-lg bg-card p-6 lg:sticky lg:top-32">
            <h2 className="font-display text-lg font-semibold">Summary</h2>

            <ul className="space-y-3">
              {items.map((item) => {
                const lineTotal =
                  getItemUnitPrice(item) * item.quantity;
                return (
                  <li
                    key={`${item.id}-${item.size}-${item.color}`}
                    className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="h-14 w-11 shrink-0 overflow-hidden rounded-md bg-muted">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Size {item.size} · {item.color} · Qty{" "}
                            {item.quantity}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${item.name}`}
                          onClick={() =>
                            removeItem(item.id, item.size, item.color)
                          }>
                          <X size={14} />
                        </Button>
                      </div>
                      <p className="mt-1 text-sm font-semibold">
                        {formatPrice(lineTotal)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <Separator />

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{formatPrice(subtotal)}</span>
            </div>
            {/* Shipping paused — pickup only.
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Shipping</span>
              <span className="text-sm font-medium">{formatPrice(shipping)}</span>
            </div>
            */}
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Charged in <span className="font-semibold">{currency}</span>
            </p>

            {selectedPickup && (
              <p className="text-xs text-muted-foreground">
                Pickup: {selectedPickup.label}. 
              </p>
            )}
          </div>
        </div>
      </div>

      <OrderSummaryModal
        open={summaryOpen}
        onOpenChange={handleSummaryOpenChange}
        customer={summaryCustomer}
        pickup={selectedPickup}
        items={summaryItems}
        total={total}
        note={note}
        formatPrice={formatPrice}
        isGenerating={isGenerating}
        onGenerate={handleGenerateInvoice}
      />
    </Layout>
  );
};

export default Checkout;
