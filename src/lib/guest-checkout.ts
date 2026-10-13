import { z } from "zod";
import { STATE_NOT_APPLICABLE, ZIP_NOT_APPLICABLE } from "@/lib/location";
import { capitalizeName } from "@/lib/utils";

export interface GuestDetails {
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  country: string;
  businessName: string;
}

export const emptyGuestDetails: GuestDetails = {
  name: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  country: "",
  businessName: "",
};

export const guestDetailsSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(32, "Phone number is too long"),
  street: z.string().trim().min(3, "Enter your street address"),
  city: z.string().trim().min(2, "Enter your city"),
  country: z.string().trim().min(2, "Select a country"),
  businessName: z.string().trim().optional(),
});

export type GuestDetailsInput = z.infer<typeof guestDetailsSchema>;

export const isGuestDetailsComplete = (details: GuestDetails) =>
  guestDetailsSchema.safeParse(details).success;

/** Normalise for the API (state / zip still required server-side). */
export const toGuestShippingFields = (details: GuestDetails) => {
  const parsed = guestDetailsSchema.parse(details);
  return {
    name: capitalizeName(parsed.name),
    email: parsed.email,
    phone: parsed.phone,
    street: parsed.street,
    city: parsed.city,
    country: parsed.country,
    state: STATE_NOT_APPLICABLE,
    zipCode: ZIP_NOT_APPLICABLE,
    businessName: parsed.businessName?.trim() || undefined,
  };
};
