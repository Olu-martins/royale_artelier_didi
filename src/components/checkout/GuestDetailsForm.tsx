import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BusinessOwnerFields from "@/components/checkout/BusinessOwnerFields";
import CountryField from "@/components/checkout/CountryField";
import {
  emptyGuestDetails,
  guestDetailsSchema,
  type GuestDetails,
  type GuestDetailsInput,
} from "@/lib/guest-checkout";
import { cn } from "@/lib/utils";

interface GuestDetailsFormProps {
  value: GuestDetails;
  onChange: (value: GuestDetails) => void;
}

const GuestDetailsForm = ({ value, onChange }: GuestDetailsFormProps) => {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
    trigger,
  } = useForm<GuestDetailsInput>({
    resolver: zodResolver(guestDetailsSchema),
    defaultValues: value.name || value.email ? value : emptyGuestDetails,
    mode: "onChange",
  });

  const country = watch("country");
  const businessName = watch("businessName") ?? "";
  const watched = watch();

  useEffect(() => {
    onChange({
      name: watched.name ?? "",
      email: watched.email ?? "",
      phone: watched.phone ?? "",
      street: watched.street ?? "",
      city: watched.city ?? "",
      country: watched.country ?? "",
      businessName: watched.businessName ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    watched.name,
    watched.email,
    watched.phone,
    watched.street,
    watched.city,
    watched.country,
    watched.businessName,
  ]);

  const fieldError = (name: keyof GuestDetailsInput) =>
    errors[name]?.message as string | undefined;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="guest-name">Full name</Label>
          <Input
            id="guest-name"
            placeholder="Alex Morgan"
            autoComplete="name"
            className={cn(
              "mt-2 input-elegant",
              fieldError("name") && "border-destructive",
            )}
            {...register("name")}
          />
          {fieldError("name") && (
            <p className="mt-1 text-xs text-destructive">{fieldError("name")}</p>
          )}
        </div>
        <div>
          <Label htmlFor="guest-phone">Phone number</Label>
          <Input
            id="guest-phone"
            placeholder="+44 7700 900123"
            type="tel"
            autoComplete="tel"
            className={cn(
              "mt-2 input-elegant",
              fieldError("phone") && "border-destructive",
            )}
            {...register("phone")}
          />
          {fieldError("phone") && (
            <p className="mt-1 text-xs text-destructive">{fieldError("phone")}</p>
          )}
        </div>
      </div>

      <BusinessOwnerFields
        idPrefix="guest-biz"
        businessName={businessName}
        onBusinessNameChange={(next) => {
          setValue("businessName", next, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }}
      />

      <div>
        <Label htmlFor="guest-email">Email</Label>
        <Input
          id="guest-email"
          placeholder="you@example.com"
          type="email"
          autoComplete="email"
          className={cn(
            "mt-2 input-elegant",
            fieldError("email") && "border-destructive",
          )}
          {...register("email")}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Ensure to enter a valid email address.
        </p>
        {fieldError("email") && (
          <p className="mt-1 text-xs text-destructive">{fieldError("email")}</p>
        )}
      </div>

      <div>
        <Label htmlFor="guest-street">Street address</Label>
        <Input
          id="guest-street"
          placeholder="10 Downing Street"
          autoComplete="street-address"
          className={cn(
            "mt-2 input-elegant",
            fieldError("street") && "border-destructive",
          )}
          {...register("street")}
        />
        {fieldError("street") && (
          <p className="mt-1 text-xs text-destructive">{fieldError("street")}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="guest-city">City</Label>
          <Input
            id="guest-city"
            placeholder="London"
            autoComplete="address-level2"
            className={cn(
              "mt-2 input-elegant",
              fieldError("city") && "border-destructive",
            )}
            {...register("city")}
          />
          {fieldError("city") && (
            <p className="mt-1 text-xs text-destructive">{fieldError("city")}</p>
          )}
        </div>

        <CountryField
          idPrefix="guest"
          country={country ?? ""}
          countryError={fieldError("country")}
          onCountryChange={(next) => {
            setValue("country", next, {
              shouldValidate: true,
              shouldDirty: true,
            });
            void trigger("country");
          }}
        />
      </div>
    </div>
  );
};

export default GuestDetailsForm;
