import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useCurrency, CURRENCY_META } from "@/contexts/CurrencyContext";
import type { CurrencyCode } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

interface CurrencySelectProps {
  className?: string;
}

/**
 * Currency picker for the header.
 *
 * Shows the ISO code rather than the symbol: "$" is ambiguous across a dozen
 * currencies, and "₦" renders as a bare N in several common fonts, so the
 * code is the only form that reads unambiguously at this size.
 *
 * One instance, restyled by breakpoint rather than two rendered in parallel —
 * the trigger says the same thing either way, so only its chrome changes:
 * a bare tappable code on phones, a bordered select from md up. That is the
 * same breakpoint the header's search bar switches on.
 */
const CurrencySelect = ({ className }: CurrencySelectProps) => {
  const { currency, availableCurrencies, setCurrency, isCurrencyLocked } =
    useCurrency();

  return (
    <Select
      value={currency}
      onValueChange={(value) => setCurrency(value as CurrencyCode)}
      disabled={isCurrencyLocked}>
      <SelectTrigger
        aria-label={`Currency: ${CURRENCY_META[currency].label}`}
        className={cn(
          "h-9 text-xs font-medium",
          "w-auto min-w-[44px] justify-center border-0 bg-transparent px-1.5",
          "hover:bg-secondary [&>svg]:hidden",
          "md:w-[88px] md:justify-between md:border md:border-input",
          "md:bg-background md:px-2.5 md:hover:bg-background md:[&>svg]:block",
          className,
        )}>
        <span className="truncate">{currency}</span>
      </SelectTrigger>

      <SelectContent align="end" className="min-w-[200px]">
        {availableCurrencies.map((code) => (
          <SelectItem key={code} value={code}>
            <span className="flex items-center gap-3">
              <span className="w-9 text-xs font-medium text-muted-foreground">
                {code}
              </span>
              <span>{CURRENCY_META[code].label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CurrencySelect;
