import { z } from "zod";
import { STATE_NOT_APPLICABLE } from "@/lib/location";
import type { AddressInput } from "@/services/api";

export const addressFormSchema = z.object({
  label: z.string().trim().min(1, "Enter an address name").max(60),
  recipientName: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  street: z.string().trim().min(3, "Enter a street address"),
  city: z.string().trim().min(2, "Enter a city"),
  zipCode: z.string().trim().min(2, "Enter a postcode / ZIP"),
  country: z.string().trim().min(2, "Select a country"),
  isDefault: z.boolean().optional(),
});

export type AddressFormValues = z.infer<typeof addressFormSchema>;

export const emptyAddressValues: AddressFormValues = {
  label: "",
  recipientName: "",
  phone: "",
  street: "",
  city: "",
  zipCode: "",
  country: "",
  isDefault: false,
};

export const toAddressInput = (values: AddressFormValues): AddressInput => {
  const parsed = addressFormSchema.parse(values);
  return {
    label: parsed.label,
    recipientName: parsed.recipientName?.trim() || undefined,
    phone: parsed.phone?.trim() || undefined,
    street: parsed.street,
    city: parsed.city,
    state: STATE_NOT_APPLICABLE,
    zipCode: parsed.zipCode,
    country: parsed.country,
    isDefault: parsed.isDefault ?? false,
  };
};
