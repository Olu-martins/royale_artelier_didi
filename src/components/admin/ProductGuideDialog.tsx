import { useState } from "react";
import {
  HelpCircle,
  Info,
  ImageIcon,
  Ruler,
  Palette,
  FileText,
  RotateCcw,
  ToggleRight,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type GuideSection = {
  id: string;
  title: string;
  icon: LucideIcon;
  required: boolean;
  summary: string;
  steps: string[];
  tip?: string;
};

/**
 * Walkthrough content for the add/edit product form. Each entry mirrors a
 * section of the real form, so the copy has to be kept in step with it — the
 * limits quoted here (5MB, 10 files, accepted types) are the ones the upload
 * handler actually enforces.
 */
const sections: GuideSection[] = [
  {
    id: "basics",
    title: "Basic Information",
    icon: Info,
    required: true,
    summary:
      "Names the product, prices it in every currency you sell in, and files it under a category.",
    steps: [
      "Product Name — what shoppers see on the card, the product page and in search results. Be specific: “Premium Wool Blend Overcoat” beats “Overcoat”.",
      "Price (NGN), Price (USD) and Price (GBP) are all required. Each is stored separately — nothing is auto-converted — so a shopper viewing in Naira sees exactly the NGN figure you type here.",
      "Original Price is optional. Fill it only for a discounted item: it renders struck through beside the current price, and the difference becomes the “% OFF” badge.",
      "Category is required and drives where the product appears in the shop. Subcategory is optional and its options change with the category you pick.",
      "Brand is required and is shown above the product name.",
      "Description is optional but worth writing — it fills the product page and becomes the page's search-engine description.",
    ],
    tip: "Changing the category clears the subcategory, so pick the category first.",
  },
  {
    id: "images",
    title: "Product Images",
    icon: ImageIcon,
    required: true,
    summary: "At least one image. The first one represents the product everywhere.",
    steps: [
      "Choose Files uploads from your computer — JPG, PNG, WebP or GIF, up to 5MB each and 10 files at a time.",
      "Or paste a direct image URL into the field and press Add (or hit Enter).",
      "The first image is tagged “Main”. It is what shows on shop listings, in the cart, on social shares and in Google results — put your strongest shot first.",
      "Hover any thumbnail and click the × to remove it.",
    ],
    tip: "Wait for uploads to finish before saving — the form blocks submission while an upload is in flight.",
  },
  {
    id: "sizes",
    title: "Available Sizes",
    icon: Ruler,
    required: true,
    summary: "Pick every size you can actually fulfil. At least one is required.",
    steps: [
      "Click a size to select it; click again to remove it. Selected sizes are filled in dark.",
      "Shoppers must choose one of these before they can add the product to their cart, so only enable sizes you hold stock for.",
    ],
  },
  {
    id: "colors",
    title: "Available Colors",
    icon: Palette,
    required: true,
    summary: "Pick every colourway this product comes in. At least one is required.",
    steps: [
      "Click a swatch to select or deselect it. Selected swatches are outlined.",
      "The first colour you select is pre-selected for the shopper on the product page.",
    ],
    tip: "Colours come from a shared palette, so the same name always renders the same swatch across the shop.",
  },
  {
    id: "details",
    title: "Product Details",
    icon: FileText,
    required: false,
    summary: "Optional fabric and care copy that fills the product page tabs.",
    steps: [
      "Material — e.g. “100% Cotton” or “70% Wool 30% Polyester”. It appears under the Details tab and in the product's structured data.",
      "Care Instructions — type one instruction and press Enter (or Add). Each becomes a chip; click its × to remove. They are listed under the Care tab.",
    ],
  },
  {
    id: "returns",
    title: "Returns & Size Guide",
    icon: RotateCcw,
    required: false,
    summary: "Sets this product's return window and its own sizing chart.",
    steps: [
      "Return window (days) — how long a customer has to return this item. Enter 0 to mark it final sale; the product page then shows “Final Sale” instead of a returns promise.",
      "Size guide image — upload a chart specific to this product (JPG, PNG, WebP or GIF, up to 5MB). When present, the product page opens it in a dialog instead of linking to the generic site-wide size guide.",
    ],
  },
  {
    id: "status",
    title: "Status & Badges",
    icon: ToggleRight,
    required: false,
    summary: "Controls availability and the badges shown on the product card.",
    steps: [
      "In Stock — turn off and the product stays visible but can no longer be purchased.",
      "New Arrival — shows the “New” badge and includes the product in the New Arrivals collection.",
      "On Sale — shows the “Sale” badge and includes it in the Sale collection. Set Original Price in Basic Information too, or there will be no strike-through price to compare against.",
    ],
  },
];

const requiredChecklist = [
  "Product name",
  "All three prices (NGN, USD, GBP)",
  "Category and brand",
  "At least one image",
  "At least one size",
  "At least one colour",
];

const ProductGuideDialog = () => {
  const [activeId, setActiveId] = useState(sections[0].id);
  const active = sections.find((s) => s.id === activeId) ?? sections[0];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <HelpCircle size={16} />
          How it works
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="border-b border-border px-6 py-4 text-left">
          <DialogTitle className="font-display text-xl">
            How to add a product
          </DialogTitle>
          <DialogDescription>
            Pick any section below to see exactly what it does and what to enter.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[65vh] grid-cols-1 md:grid-cols-[220px_1fr]">
          {/* Section list */}
          <nav
            aria-label="Product form sections"
            className="border-b border-border md:border-b-0 md:border-r">
            <ScrollArea className="max-h-40 md:max-h-[65vh]">
              <ul className="p-2">
                {sections.map((section, index) => {
                  const isActive = section.id === activeId;
                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(section.id)}
                        aria-current={isActive ? "true" : undefined}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                          isActive
                            ? "bg-accent/15 font-medium text-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}>
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                            isActive
                              ? "bg-accent text-accent-foreground"
                              : "bg-muted text-muted-foreground",
                          )}>
                          {index + 1}
                        </span>
                        <span className="flex-1 truncate">{section.title}</span>
                        {section.required && (
                          <span
                            className="text-accent"
                            title="Required"
                            aria-label="Required">
                            *
                          </span>
                        )}
                        <ChevronRight
                          size={14}
                          className={cn(
                            "shrink-0 transition-opacity",
                            isActive ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </nav>

          {/* Detail pane */}
          <ScrollArea className="max-h-[45vh] md:max-h-[65vh]">
            <div className="space-y-4 p-6">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <active.icon size={18} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-semibold leading-tight">
                    {active.title}
                    {active.required && (
                      <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 align-middle text-[11px] font-medium text-accent">
                        Required
                      </span>
                    )}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {active.summary}
                  </p>
                </div>
              </div>

              <ol className="space-y-3">
                {active.steps.map((step, index) => (
                  <li key={index} className="flex gap-3 text-sm leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span className="text-foreground/90">{step}</span>
                  </li>
                ))}
              </ol>

              {active.tip && (
                <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground/90">
                  <span className="font-medium">Tip: </span>
                  {active.tip}
                </p>
              )}

              {active.id === sections[sections.length - 1].id && (
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <CheckCircle2 size={16} className="text-accent" />
                    Before you save
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {requiredChecklist.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductGuideDialog;
