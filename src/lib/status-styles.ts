/**
 * Shared status pill styling.
 *
 * The admin, profile and category pages each hardcoded the same
 * `bg-<hue>-100 text-<hue>-800` pairs. Those are fixed light-mode values: on a
 * dark page they render as bright pastel chips that glare against the surface.
 * Each tone here pairs the light values with a dark variant (deep translucent
 * fill + light text) so a pill stays legible and calm in both themes.
 */
export type StatusTone =
  | "neutral"
  | "info"
  | "progress"
  | "success"
  | "warning"
  | "danger";

export const statusTone: Record<StatusTone, string> = {
  neutral:
    "bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground",
  info: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300",
  progress: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  success:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  danger: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
};

/** Base pill shape, so every status chip across the app matches. */
export const statusPill =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

export const toneFor = (tone: StatusTone) => `${statusPill} ${statusTone[tone]}`;

/** Tone for an order's fulfilment status. */
export const orderStatusTone = (status: string): StatusTone => {
  switch (status) {
    case "Delivered":
      return "success";
    case "Shipped":
      return "info";
    case "Processing":
      return "warning";
    case "Cancelled":
      return "danger";
    default:
      return "neutral";
  }
};

/**
 * Tone for a return's status.
 *
 * Kept separate from the order map: the two share no vocabulary, and running
 * return statuses through the order version rendered every one of them as an
 * undifferentiated neutral chip.
 */
export const returnStatusTone = (status: string): StatusTone => {
  switch (status) {
    case "Refunded":
      return "success";
    case "Received":
      return "info";
    case "In transit":
      return "progress";
    case "Approved":
      return "warning";
    case "Rejected":
    case "Cancelled":
      return "danger";
    default:
      return "neutral";
  }
};
