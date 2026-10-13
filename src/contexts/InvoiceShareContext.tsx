/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { Mail, MessageSquare, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { shareInvoiceFile } from "@/lib/invoice";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface SharedInvoiceFile {
  blob: Blob;
  filename: string;
  mimeType: string;
  orderNumber: string;
}

interface InvoiceShareContextType {
  offerInvoiceShare: (file: SharedInvoiceFile) => void;
}

const InvoiceShareContext = createContext<InvoiceShareContextType | undefined>(
  undefined,
);

const shareMessage = (orderNumber: string) =>
  `Royale Artelier invoice ${orderNumber}. Please find the invoice file (already downloaded on my device) to complete payment.`;

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="currentColor"
      d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
    />
  </svg>
);

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="currentColor"
      d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
    />
  </svg>
);

type PlatformId = "whatsapp" | "telegram" | "email" | "sms" | "more";

const PLATFORMS: Array<{
  id: PlatformId;
  label: string;
  className: string;
  icon: ReactNode;
}> = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    className: "bg-[#25D366] text-white hover:bg-[#1ebe57]",
    icon: <WhatsAppIcon className="h-5 w-5" />,
  },
  {
    id: "telegram",
    label: "Telegram",
    className: "bg-[#26A5E4] text-white hover:bg-[#1f93cc]",
    icon: <TelegramIcon className="h-5 w-5" />,
  },
  {
    id: "email",
    label: "Email",
    className: "bg-foreground text-background hover:opacity-90",
    icon: <Mail className="h-5 w-5" />,
  },
  {
    id: "sms",
    label: "Messages",
    className: "bg-emerald-700 text-white hover:bg-emerald-800",
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    id: "more",
    label: "More",
    className: "bg-muted text-foreground hover:bg-muted/80 border border-border",
    icon: <Share2 className="h-5 w-5" />,
  },
];

const openExternal = (url: string) => {
  window.open(url, "_blank", "noopener,noreferrer");
};

const shareInvoiceToPlatform = async (
  file: SharedInvoiceFile,
  platform: PlatformId,
) => {
  const text = shareMessage(file.orderNumber);
  const shareFile = new File([file.blob], file.filename, {
    type: file.mimeType,
  });
  const fileShare: ShareData = {
    files: [shareFile],
    title: `Royale Artelier invoice ${file.orderNumber}`,
    text,
  };

  const canShareFile =
    typeof navigator.share === "function" &&
    (typeof navigator.canShare !== "function" || navigator.canShare(fileShare));

  if (platform === "more") {
    if (!canShareFile) {
      toast.message(
        "Sharing isn’t available on this device. Your invoice is already downloaded — attach it from your files app.",
      );
      return;
    }
    const result = await shareInvoiceFile(file);
    if (result === "shared") toast.success("Invoice shared");
    if (result === "unsupported") {
      toast.message(
        "Sharing isn’t available on this device. Your invoice is already downloaded.",
      );
    }
    return;
  }

  if (canShareFile && (platform === "whatsapp" || platform === "sms")) {
    try {
      await navigator.share(fileShare);
      toast.success("Share sheet opened — pick your app to send the invoice");
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  if (platform === "whatsapp") {
    openExternal(`https://wa.me/?text=${encodeURIComponent(text)}`);
    toast.message(
      "WhatsApp opened. Attach the downloaded invoice file from your device.",
    );
    return;
  }

  if (platform === "telegram") {
    const siteUrl =
      import.meta.env.VITE_SITE_URL?.trim() || "https://royaleartelier.com";
    openExternal(
      `https://t.me/share/url?url=${encodeURIComponent(siteUrl)}&text=${encodeURIComponent(text)}`,
    );
    toast.message(
      "Telegram opened. Attach the downloaded invoice file from your device.",
    );
    return;
  }

  if (platform === "email") {
    openExternal(
      `mailto:?subject=${encodeURIComponent(`Royale Artelier invoice ${file.orderNumber}`)}&body=${encodeURIComponent(`${text}\n\n(Attach the downloaded file: ${file.filename})`)}`,
    );
    return;
  }

  if (platform === "sms") {
    openExternal(`sms:?body=${encodeURIComponent(text)}`);
    toast.message(
      "Messages opened. Attach the downloaded invoice file if your device allows it.",
    );
  }
};

const ShareInvoiceDialog = ({
  file,
  open,
  onOpenChange,
}: {
  file: SharedInvoiceFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [busyPlatform, setBusyPlatform] = useState<PlatformId | null>(null);

  const handlePlatform = async (platform: PlatformId) => {
    if (!file || busyPlatform) return;
    setBusyPlatform(platform);
    try {
      await shareInvoiceToPlatform(file, platform);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not open share",
      );
    } finally {
      setBusyPlatform(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="sr-only">Share invoice</DialogTitle>

        {file && (
          <section className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <p className="font-medium">Invoice downloaded</p>
            <p className="mt-1 break-all text-muted-foreground">
              {file.filename}
            </p>
            <p className="mt-2 text-muted-foreground">
              Want to share invoice to a platform?
            </p>
          </section>
        )}

        <DialogFooter className="sm:justify-center">
          <div className="flex w-full flex-wrap items-center justify-center gap-3">
            {PLATFORMS.map((platform) => (
              <button
                key={platform.id}
                type="button"
                disabled={!file || busyPlatform !== null}
                aria-label={`Share via ${platform.label}`}
                title={platform.label}
                onClick={() => void handlePlatform(platform.id)}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full transition-opacity disabled:opacity-50",
                  platform.className,
                )}>
                {platform.icon}
              </button>
            ))}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const InvoiceShareProvider = ({ children }: { children: ReactNode }) => {
  const [file, setFile] = useState<SharedInvoiceFile | null>(null);
  const [open, setOpen] = useState(false);

  const offerInvoiceShare = useCallback((next: SharedInvoiceFile) => {
    setFile(next);
    setOpen(true);
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setFile(null);
  };

  return (
    <InvoiceShareContext.Provider value={{ offerInvoiceShare }}>
      {children}
      <ShareInvoiceDialog
        file={file}
        open={open}
        onOpenChange={handleOpenChange}
      />
    </InvoiceShareContext.Provider>
  );
};

export const useInvoiceShare = () => {
  const ctx = useContext(InvoiceShareContext);
  if (!ctx) {
    throw new Error("useInvoiceShare must be used within InvoiceShareProvider");
  }
  return ctx;
};
