export interface PickupLocation {
  id: string;
  label: string;
  address: string;
  country: string;
}

export const PICKUP_LOCATIONS: PickupLocation[] = [
  {
    id: "lagos-ikotun",
    label: "Lagos, Nigeria",
    address:
      "1, Madarikan Street, Alake Bus stop, Ikotun Idimu road. Lagos Nigeria",
    country: "Nigeria",
  },
  {
    id: "accra-nmai",
    label: "Accra, Ghana",
    address: "21A Ataa Avenue, Avenue Nmai Dzorn, Accra Ghana",
    country: "Ghana",
  },
  {
    id: "hull-uk",
    label: "Hull, United Kingdom",
    address: "10, Ash grove, De La Pole Avenue, Hull, HU3 6RR, United Kingdom.",
    country: "United Kingdom",
  },
];

export const findPickupLocation = (id: string | null | undefined) =>
  PICKUP_LOCATIONS.find((location) => location.id === id) ?? null;
