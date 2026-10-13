import { useMemo } from "react";
import { X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Category } from "@/services/api";
import {
  colorOptions as defaultColors,
  sizeOptions as defaultSizes,
} from "@/data/filterOptions";
import { useCurrency } from "@/contexts/CurrencyContext";

export interface FilterState {
  category: string[];
  subcategory: string[];
  brand: string[];
  size: string[];
  color: string[];
  priceRange: [number, number];
  isNew: boolean;
  isSale: boolean;
}

interface ProductFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  categories: Category[];
  brandOptions: string[];
  sizeOptions?: string[];
  colorOptions?: { name: string; hex: string }[];
  isMobile?: boolean;
  onClose?: () => void;
  maxPrice?: number;
}

// Filter options are derived from product data, where the same value can appear
// on many products (and colours may repeat a name under a different hex). React
// keys must be unique, and a repeated option is a duplicated control in the UI.
const uniqueStrings = (values: string[]) => Array.from(new Set(values));

const uniqueColors = (colors: { name: string; hex: string }[]) => {
  const seen = new Set<string>();
  return colors.filter((color) => {
    if (seen.has(color.name)) return false;
    seen.add(color.name);
    return true;
  });
};

const ProductFilters = ({
  filters,
  onFilterChange,
  onClearFilters,
  categories,
  brandOptions,
  sizeOptions,
  colorOptions,
  isMobile,
  onClose,
  maxPrice = 500,
}: ProductFiltersProps) => {
  const { currencySymbol } = useCurrency();
  const toggleArrayFilter = (key: keyof FilterState, value: string) => {
    const current = filters[key] as string[];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFilterChange({ ...filters, [key]: updated });
  };

  const sizesToRender = useMemo(
    () => uniqueStrings(sizeOptions ?? defaultSizes),
    [sizeOptions]
  );
  const colorsToRender = useMemo(
    () => uniqueColors(colorOptions ?? defaultColors),
    [colorOptions]
  );
  const brandsToRender = useMemo(
    () => uniqueStrings(brandOptions),
    [brandOptions]
  );
  const categoriesToRender = useMemo(() => {
    const seen = new Set<string>();
    return categories
      .filter((cat) => {
        if (seen.has(cat.name)) return false;
        seen.add(cat.name);
        return true;
      })
      .map((cat) => ({
        ...cat,
        subcategories: uniqueStrings(cat.subcategories),
      }));
  }, [categories]);

  const activeFiltersCount =
    filters.category.length +
    filters.subcategory.length +
    filters.brand.length +
    filters.size.length +
    filters.color.length +
    (filters.isNew ? 1 : 0) +
    (filters.isSale ? 1 : 0) +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice ? 1 : 0);

  return (
    <div className="bg-background">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
        <h2 className="font-display text-lg font-semibold">Filters</h2>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-sm">
              Clear All ({activeFiltersCount})
            </Button>
          )}
          {isMobile && onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X size={20} />
            </Button>
          )}
        </div>
      </div>

      <Accordion
        type="multiple"
        defaultValue={["category", "price", "size", "color"]}
        className="space-y-2">
        {/* Category */}
        <AccordionItem value="category" className="border-none">
          <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
            Category
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3">
              {categoriesToRender.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No categories available.
                </p>
              ) : (
                categoriesToRender.map((cat) => (
                  <div key={cat.name} className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filters.category.includes(cat.name)}
                        onCheckedChange={() =>
                          toggleArrayFilter("category", cat.name)
                        }
                      />
                      <span className="text-sm">{cat.name}</span>
                    </label>
                    {filters.category.includes(cat.name) && (
                      <div className="pl-6 space-y-2">
                        {cat.subcategories.map((sub) => (
                          <label
                            key={sub}
                            className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={filters.subcategory.includes(sub)}
                              onCheckedChange={() =>
                                toggleArrayFilter("subcategory", sub)
                              }
                            />
                            <span className="text-sm text-muted-foreground">
                              {sub}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Price Range */}
        <AccordionItem value="price" className="border-none">
          <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
            Price Range
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="px-1 py-1.5">
              <Slider
                value={filters.priceRange}
                onValueChange={(value) =>
                  onFilterChange({
                    ...filters,
                    priceRange: value as [number, number],
                  })
                }
                min={0}
                max={maxPrice}
                step={Math.max(1, Math.floor(maxPrice / 50))}
                className="mb-4"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {currencySymbol}
                  {filters.priceRange[0]}
                </span>
                <span>
                  {currencySymbol}
                  {filters.priceRange[1]}
                </span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Size */}
        <AccordionItem value="size" className="border-none">
          <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
            Size
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="flex flex-wrap gap-2">
              {sizesToRender.map((size) => (
                <button
                  key={size}
                  onClick={() => toggleArrayFilter("size", size)}
                  className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                    filters.size.includes(size)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-foreground"
                  }`}>
                  {size}
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Color */}
        <AccordionItem value="color" className="border-none">
          <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
            Color
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="flex flex-wrap gap-2">
              {colorsToRender.map((color) => (
                <button
                  key={`${color.name}-${color.hex}`}
                  onClick={() => toggleArrayFilter("color", color.name)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    filters.color.includes(color.name)
                      ? "ring-2 ring-offset-2 ring-accent"
                      : "border-border"
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Brand */}
        <AccordionItem value="brand" className="border-none">
          <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
            Brand
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {brandsToRender.map((brand) => (
                <label
                  key={brand}
                  className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.brand.includes(brand)}
                    onCheckedChange={() => toggleArrayFilter("brand", brand)}
                  />
                  <span className="text-sm">{brand}</span>
                </label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Availability */}
        <AccordionItem value="availability" className="border-none">
          <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
            Availability
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filters.isNew}
                  onCheckedChange={(checked) =>
                    onFilterChange({ ...filters, isNew: checked as boolean })
                  }
                />
                <span className="text-sm">New Arrivals</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filters.isSale}
                  onCheckedChange={(checked) =>
                    onFilterChange({ ...filters, isSale: checked as boolean })
                  }
                />
                <span className="text-sm">On Sale</span>
              </label>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default ProductFilters;
