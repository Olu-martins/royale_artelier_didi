import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCountryOptions } from "@/lib/location";
import { cn } from "@/lib/utils";

interface CountryFieldProps {
  country: string;
  onCountryChange: (country: string) => void;
  countryError?: string;
  idPrefix?: string;
  className?: string;
}

const CountryField = ({
  country,
  onCountryChange,
  countryError,
  idPrefix = "location",
  className,
}: CountryFieldProps) => {
  const countries = useMemo(() => getCountryOptions(), []);

  return (
    <div className={cn(className)}>
      <Label htmlFor={`${idPrefix}-country`}>Country</Label>
      <Select
        value={country || undefined}
        onValueChange={onCountryChange}>
        <SelectTrigger
          id={`${idPrefix}-country`}
          className={cn(
            "mt-2 w-full input-elegant",
            countryError && "border-destructive",
          )}
          aria-invalid={Boolean(countryError)}>
          <SelectValue placeholder="Select country" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {countries.map((option) => (
            <SelectItem key={option.isoCode} value={option.name}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {countryError && (
        <p className="mt-1 text-xs text-destructive">{countryError}</p>
      )}
    </div>
  );
};

export default CountryField;
