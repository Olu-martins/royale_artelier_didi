import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Full-width banner toasts anchored to the top of the viewport.
 *
 * Each variant carries its own colour so the outcome reads before the text
 * does: green for a 2xx-style success, red for a failed request, amber for a
 * warning, and the brand accent for neutral information. Colours are tuned per
 * theme — the pale tints that work on the light palette wash out on the dark
 * one, so dark mode uses a translucent fill over a saturated border instead.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      expand
      closeButton
      duration={4500}
      // Flush against the top edge. Use sonner's own offset prop rather than
      // overriding its --offset variable, which it also factors into the
      // stacking transform (setting it by hand lifts the banner off-screen).
      offset={0}
      mobileOffset={0}
      // The banner spans the viewport, so the stack must be full-width too.
      className="toaster group w-full max-w-none"
      style={{ "--width": "100%" } as React.CSSProperties}
      icons={{
        success: <CheckCircle2 className="h-5 w-5" />,
        error: <XCircle className="h-5 w-5" />,
        warning: <AlertTriangle className="h-5 w-5" />,
        info: <Info className="h-5 w-5" />,
        close: <X className="h-4 w-4" />,
      }}
      toastOptions={{
        classNames: {
          toast: [
            "group toast w-full rounded-none border-0 border-b-2 px-4 py-4 shadow-lg",
            "sm:px-6 gap-3 items-start",
            // Opaque fills, not tints: the banner spans the viewport, so a
            // translucent background visibly changes shade wherever the page
            // behind it does.
            "data-[type=success]:bg-emerald-50 data-[type=success]:text-emerald-900 data-[type=success]:border-emerald-600",
            "dark:data-[type=success]:bg-emerald-950 dark:data-[type=success]:text-emerald-50 dark:data-[type=success]:border-emerald-400",
            "data-[type=error]:bg-red-50 data-[type=error]:text-red-900 data-[type=error]:border-red-600",
            "dark:data-[type=error]:bg-red-950 dark:data-[type=error]:text-red-50 dark:data-[type=error]:border-red-400",
            "data-[type=warning]:bg-amber-50 data-[type=warning]:text-amber-900 data-[type=warning]:border-amber-600",
            "dark:data-[type=warning]:bg-amber-950 dark:data-[type=warning]:text-amber-50 dark:data-[type=warning]:border-amber-400",
            "data-[type=info]:bg-secondary data-[type=info]:text-foreground data-[type=info]:border-accent",
            "bg-background text-foreground border-border",
          ].join(" "),
          title: "text-sm font-semibold",
          description: "text-sm opacity-90",
          icon: "shrink-0",
          closeButton: [
            "border-0 bg-transparent text-current opacity-60 hover:opacity-100",
            // Sonner pins the close button to the top-left corner by default,
            // which reads as a stray control on a full-width banner.
            "left-auto right-3 top-1/2 -translate-y-1/2",
          ].join(" "),
          actionButton: "bg-foreground text-background",
          cancelButton: "bg-muted text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
