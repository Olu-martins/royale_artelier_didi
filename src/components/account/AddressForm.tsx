import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import CountryField from "@/components/checkout/CountryField";
import type { Address, AddressInput } from "@/services/api";
import {
  addressFormSchema,
  emptyAddressValues,
  toAddressInput,
  type AddressFormValues,
} from "@/lib/address-schema";
import { cn } from "@/lib/utils";

interface AddressFormProps {
  initial?: Address;
  submitLabel?: string;
  isSubmitting?: boolean;
  onSubmit: (values: AddressInput) => void;
  onCancel?: () => void;
}

const AddressForm = ({
  initial,
  submitLabel = "Save address",
  isSubmitting,
  onSubmit,
  onCancel,
}: AddressFormProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    trigger,
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: initial
      ? {
          label: initial.label,
          recipientName: initial.recipientName ?? "",
          phone: initial.phone ?? "",
          street: initial.street,
          city: initial.city,
          zipCode: initial.zipCode,
          country: initial.country,
          isDefault: initial.isDefault ?? false,
        }
      : emptyAddressValues,
    mode: "onBlur",
  });

  const country = watch("country");
  const isDefault = watch("isDefault");

  const fieldError = (name: keyof AddressFormValues) =>
    errors[name]?.message as string | undefined;

  const onValid = (values: AddressFormValues) => {
    onSubmit(toAddressInput(values));
  };

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="address-label" className="text-sm">
            Address name
          </Label>
          <Input
            id="address-label"
            placeholder="Home, Office…"
            className={cn(fieldError("label") && "border-destructive")}
            {...register("label")}
          />
          {fieldError("label") && (
            <p className="mt-1 text-xs text-destructive">{fieldError("label")}</p>
          )}
        </div>
        <div>
          <Label htmlFor="address-recipientName" className="text-sm">
            Recipient
            <span className="font-normal text-muted-foreground"> (optional)</span>
          </Label>
          <Input
            id="address-recipientName"
            placeholder="Alex Morgan"
            className={cn(fieldError("recipientName") && "border-destructive")}
            {...register("recipientName")}
          />
          {fieldError("recipientName") && (
            <p className="mt-1 text-xs text-destructive">
              {fieldError("recipientName")}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="address-phone" className="text-sm">
          Phone number
          <span className="font-normal text-muted-foreground"> (optional)</span>
        </Label>
        <Input
          id="address-phone"
          placeholder="+1 (555) 123-4567"
          className={cn(fieldError("phone") && "border-destructive")}
          {...register("phone")}
        />
        {fieldError("phone") && (
          <p className="mt-1 text-xs text-destructive">{fieldError("phone")}</p>
        )}
      </div>

      <div>
        <Label htmlFor="address-street" className="text-sm">
          Street address
        </Label>
        <Input
          id="address-street"
          placeholder="221B Baker Street"
          className={cn(fieldError("street") && "border-destructive")}
          {...register("street")}
        />
        {fieldError("street") && (
          <p className="mt-1 text-xs text-destructive">{fieldError("street")}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="address-city" className="text-sm">
            City
          </Label>
          <Input
            id="address-city"
            placeholder="New York"
            className={cn(fieldError("city") && "border-destructive")}
            {...register("city")}
          />
          {fieldError("city") && (
            <p className="mt-1 text-xs text-destructive">{fieldError("city")}</p>
          )}
        </div>
        <div>
          <Label htmlFor="address-zipCode" className="text-sm">
            Postcode / ZIP
          </Label>
          <Input
            id="address-zipCode"
            placeholder="10001"
            className={cn(fieldError("zipCode") && "border-destructive")}
            {...register("zipCode")}
          />
          {fieldError("zipCode") && (
            <p className="mt-1 text-xs text-destructive">
              {fieldError("zipCode")}
            </p>
          )}
        </div>
      </div>

      <CountryField
        idPrefix="address"
        country={country ?? ""}
        countryError={fieldError("country")}
        onCountryChange={(next) => {
          setValue("country", next, { shouldValidate: true, shouldDirty: true });
          void trigger("country");
        }}
      />

      <label className="flex cursor-pointer items-center gap-2">
        <Checkbox
          checked={Boolean(isDefault)}
          onCheckedChange={(checked) =>
            setValue("isDefault", Boolean(checked), { shouldDirty: true })
          }
        />
        <span className="text-sm">Use as my default address</span>
      </label>

      <div className="flex gap-3 pt-2">
        <Button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};

export default AddressForm;
