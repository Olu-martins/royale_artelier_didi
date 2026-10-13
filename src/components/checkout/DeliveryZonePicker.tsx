import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, MapPin, Search, Truck } from "lucide-react";
import api, { DeliveryZone } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { formatEstimate, rateFor } from "@/lib/delivery";

interface DeliveryZonePickerProps {
  selected: DeliveryZone | null;
  onSelect: (zone: DeliveryZone) => void;
}

const DeliveryZonePicker = ({
  selected,
  onSelect,
}: DeliveryZonePickerProps) => {
  const { currency, formatPrice } = useCurrency();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ["delivery-zones", "active"],
    queryFn: () => api.getDeliveryZones(),
    staleTime: 1000 * 60 * 5,
  });

  // Filter in the browser so typing is instant. The active list is small, and
  // the server exposes the same search for stores with many more zones.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return zones;
    return zones.filter(
      (zone) =>
        zone.name.toLowerCase().includes(term) ||
        (zone.areas ?? []).some((area) => area.toLowerCase().includes(term)),
    );
  }, [zones, search]);

  const choose = (zone: DeliveryZone) => {
    onSelect(zone);
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Clear the search when opening, never when closing: changing the
        // dialog's contents mid-exit stops Radix finishing the animation, and
        // that leaves pointer-events:none stranded on <body>.
        if (next) setSearch("");
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-auto w-full justify-between gap-3 py-4 text-left"
        >
          <span className="flex min-w-0 items-center gap-3">
            <Truck size={18} className="shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              {selected ? (
                <>
                  <span className="block truncate font-medium">
                    {selected.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {formatEstimate(selected)}
                  </span>
                </>
              ) : (
                <>
                  <span className="block font-medium">
                    Select a delivery area
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Rates and timing vary by area
                  </span>
                </>
              )}
            </span>
          </span>
          <span className="shrink-0 font-semibold">
            {selected ? formatPrice(rateFor(selected, currency)) : "Choose"}
          </span>
        </Button>
      </DialogTrigger>

      {/* Rendered only while open. Selecting a zone re-renders this component,
          which resurrects Radix's exit transition: the dialog then never
          unmounts, leaving a ghost panel over the page and a stranded
          `pointer-events: none` on <body>. Unmounting outright trades the
          close animation for a dialog that reliably goes away. */}
      {open && (
        <DialogContent className="max-h-[80vh] gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border px-6 py-4 text-left">
            <DialogTitle>Where are we delivering?</DialogTitle>
            <DialogDescription>
              Search for your area — not every neighbourhood is in the zone
              name.
            </DialogDescription>
          </DialogHeader>

          <div className="border-b border-border p-4">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Try London, Manhattan, Accra…"
                className="pl-9"
                aria-label="Search delivery areas"
              />
            </div>
          </div>

          <div className="max-h-[50vh] overflow-y-auto p-2">
            {isLoading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  {zones.length === 0
                    ? "No delivery areas are available right now. Please contact us to arrange delivery."
                    : `We don't have "${search.trim()}" listed yet.`}
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {filtered.map((zone) => {
                  const isSelected = selected?.id === zone.id;
                  return (
                    <li key={zone.id}>
                      <button
                        type="button"
                        onClick={() => choose(zone)}
                        aria-pressed={isSelected}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors",
                          isSelected
                            ? "bg-accent/15 ring-1 ring-accent"
                            : "hover:bg-muted",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                            isSelected
                              ? "border-accent bg-accent text-accent-foreground"
                              : "border-border",
                          )}
                        >
                          {isSelected && <Check size={12} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{zone.name}</span>
                          {zone.areas?.length > 0 && (
                            <span className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
                              <MapPin size={11} className="mt-0.5 shrink-0" />
                              <span className="line-clamp-2">
                                {zone.areas.join(", ")}
                              </span>
                            </span>
                          )}
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {formatEstimate(zone)}
                          </span>
                        </span>
                        <span className="shrink-0 whitespace-nowrap font-semibold">
                          {formatPrice(rateFor(zone, currency))}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
};

export default DeliveryZonePicker;
