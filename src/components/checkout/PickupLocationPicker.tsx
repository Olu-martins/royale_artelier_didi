import { Check, MapPin } from "lucide-react";
import {
  PICKUP_LOCATIONS,
  type PickupLocation,
} from "@/lib/pickup-locations";
import { cn } from "@/lib/utils";

interface PickupLocationPickerProps {
  selected: PickupLocation | null;
  onSelect: (location: PickupLocation) => void;
}

const PickupLocationPicker = ({
  selected,
  onSelect,
}: PickupLocationPickerProps) => {
  return (
    <ul className="space-y-2" role="listbox" aria-label="Pickup locations">
      {PICKUP_LOCATIONS.map((location) => {
        const isSelected = selected?.id === location.id;
        return (
          <li key={location.id}>
            <button
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelect(location)}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                isSelected
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-foreground/30",
              )}>
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  isSelected
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-muted-foreground/40",
                )}>
                {isSelected ? <Check size={12} strokeWidth={3} /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin size={14} className="shrink-0 text-muted-foreground" />
                  {location.label}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {location.address}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default PickupLocationPicker;
