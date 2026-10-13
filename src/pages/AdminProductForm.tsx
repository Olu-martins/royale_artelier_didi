import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, X, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminProducts } from "@/contexts/AdminProductsContext";
import {
  sizeOptions as sizes,
  colorOptions as allColors,
  brandSuggestions,
} from "@/data/filterOptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useCategories } from "@/contexts/CategoriesContext";
import api, { type Product } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import ProductGuideDialog from "@/components/admin/ProductGuideDialog";

interface ProductFormData {
  name: string;
  priceNaira: string;
  priceUsd: string;
  priceGbp: string;
  originalPrice: string;
  description: string;
  images: string[];
  category: string;
  subcategory: string;
  sizes: string[];
  colors: { name: string; hex: string }[];
  brand: string;
  inStock: boolean;
  isNew: boolean;
  isSale: boolean;
  material: string;
  careInstructions: string[];
  returnDays: string;
  sizeGuideImage: string;
}

const initialFormData: ProductFormData = {
  name: "",
  priceNaira: "",
  priceUsd: "",
  priceGbp: "",
  originalPrice: "",
  description: "",
  images: [],
  category: "Women",
  subcategory: "",
  sizes: [],
  colors: [],
  brand: "",
  inStock: true,
  isNew: false,
  isSale: false,
  material: "",
  careInstructions: [],
  returnDays: "2",
  sizeGuideImage: "",
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const AdminProductForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const {
    addProduct,
    updateProduct,
    getProduct,
    products: adminProducts,
  } = useAdminProducts();
  const { categories } = useCategories();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newCareInstruction, setNewCareInstruction] = useState("");
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isUploadingSizeGuide, setIsUploadingSizeGuide] = useState(false);

  /**
   * Stock per size+colour, keyed "size|colour".
   *
   * Held separately from formData because variants live in their own table and
   * are saved with their own request after the product itself exists.
   */
  const [stockLevels, setStockLevels] = useState<Record<string, string>>({});

  const stockKey = (size: string, color: string) => `${size}|${color}`;

  const brandOptions = useMemo(() => {
    const unique = new Set<string>(brandSuggestions);
    adminProducts.forEach((product) => unique.add(product.brand));
    return Array.from(unique).sort();
  }, [adminProducts]);

  const { data: existingVariants } = useQuery({
    queryKey: ["variants", id],
    queryFn: () => api.getProductVariants(id as string),
    enabled: Boolean(isEditing && id),
  });

  useEffect(() => {
    if (!existingVariants) return;
    const next: Record<string, string> = {};
    for (const variant of existingVariants) {
      next[`${variant.size}|${variant.color}`] = String(variant.stockQuantity);
    }
    setStockLevels(next);
  }, [existingVariants]);

  const subcategoryOptions = useMemo(() => {
    const category = categories.find((cat) => cat.name === formData.category);
    return category?.subcategories || [];
  }, [categories, formData.category]);

  useEffect(() => {
    if (isEditing && id) {
      const product = getProduct(id);
      if (product) {
        setFormData({
          name: product.name,
          priceNaira: (product.priceNaira ?? product.price * 1550).toString(),
          priceUsd: (product.priceUsd ?? product.price).toString(),
          priceGbp: (product.priceGbp ?? product.price * 0.79).toString(),
          originalPrice: product.originalPrice?.toString() || "",
          description: product.description,
          images: product.images,
          category: product.category,
          subcategory: product.subcategory,
          sizes: product.sizes,
          colors: product.colors,
          brand: product.brand,
          inStock: product.inStock,
          isNew: product.isNew || false,
          isSale: product.isSale || false,
          material: product.material || "",
          careInstructions: product.careInstructions || [],
          returnDays: (product.returnDays ?? 2).toString(),
          sizeGuideImage: product.sizeGuideImage || "",
        });
      }
    }
  }, [id, isEditing, getProduct]);

  if (!isAuthenticated || !user?.isAdmin || user.isDisabled) {
    const isDisabledCopy = !!user?.isDisabled;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <h1 className="font-display text-2xl font-semibold mb-4">
            {isDisabledCopy
              ? "Admin Account Disabled"
              : "Admin Access Required"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {isDisabledCopy
              ? "This admin account has been disabled. Contact a super admin for access."
              : "You need admin privileges to access this page."}
          </p>
          {!isDisabledCopy && (
            <Button onClick={() => navigate("/login")} className="btn-primary">
              Sign In as Admin
            </Button>
          )}
        </div>
      </div>
    );
  }

  const handleAddImage = () => {
    if (newImageUrl.trim()) {
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, newImageUrl.trim()],
      }));
      setNewImageUrl("");
    }
  };

  const handleUploadImages = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    if (selectedFiles.length > 10) {
      toast.error("You can upload up to 10 images at a time");
      event.target.value = "";
      return;
    }

    const invalidTypeFile = selectedFiles.find(
      (file) => !ALLOWED_IMAGE_TYPES.has(file.type),
    );

    if (invalidTypeFile) {
      toast.error(
        `${invalidTypeFile.name} is not a supported image type. Use JPG, PNG, WebP, or GIF.`,
      );
      event.target.value = "";
      return;
    }

    const oversizedFile = selectedFiles.find(
      (file) => file.size > MAX_IMAGE_SIZE_BYTES,
    );

    if (oversizedFile) {
      toast.error(`${oversizedFile.name} exceeds the 5MB limit.`);
      event.target.value = "";
      return;
    }

    setIsUploadingImages(true);

    try {
      const { urls } = await api.uploadProductImages(selectedFiles);

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...urls],
      }));

      toast.success(
        `${urls.length} image${urls.length === 1 ? "" : "s"} uploaded`,
      );
    } catch (error) {
      console.error("Failed to upload images", error);
      toast.error("Unable to upload images. Please try again.");
    } finally {
      event.target.value = "";
      setIsUploadingImages(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleUploadSizeGuide = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      toast.error("Use a JPG, PNG, WebP, or GIF image for the size guide.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error("Size guide image exceeds the 5MB limit.");
      event.target.value = "";
      return;
    }

    setIsUploadingSizeGuide(true);

    try {
      const { url } = await api.uploadImage(file);
      setFormData((prev) => ({ ...prev, sizeGuideImage: url }));
      toast.success("Size guide image uploaded");
    } catch (error) {
      console.error("Failed to upload size guide", error);
      toast.error("Unable to upload size guide image. Please try again.");
    } finally {
      event.target.value = "";
      setIsUploadingSizeGuide(false);
    }
  };

  const handleSizeToggle = (size: string) => {
    setFormData((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter((s) => s !== size)
        : [...prev.sizes, size],
    }));
  };

  const handleColorToggle = (color: { name: string; hex: string }) => {
    setFormData((prev) => ({
      ...prev,
      colors: prev.colors.find((c) => c.name === color.name)
        ? prev.colors.filter((c) => c.name !== color.name)
        : [...prev.colors, color],
    }));
  };

  const handleAddCareInstruction = () => {
    if (newCareInstruction.trim()) {
      setFormData((prev) => ({
        ...prev,
        careInstructions: [...prev.careInstructions, newCareInstruction.trim()],
      }));
      setNewCareInstruction("");
    }
  };

  const handleRemoveCareInstruction = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      careInstructions: prev.careInstructions.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isUploadingImages || isUploadingSizeGuide) {
      toast.error("Please wait for image uploads to finish");
      return;
    }

    if (
      !formData.name ||
      !formData.priceNaira ||
      !formData.priceUsd ||
      !formData.priceGbp ||
      !formData.category ||
      !formData.brand
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.images.length === 0) {
      toast.error("Please add at least one product image");
      return;
    }

    if (formData.sizes.length === 0) {
      toast.error("Please select at least one size");
      return;
    }

    if (formData.colors.length === 0) {
      toast.error("Please select at least one color");
      return;
    }

    const productData = {
      name: formData.name,
      priceNaira: parseFloat(formData.priceNaira),
      priceUsd: parseFloat(formData.priceUsd),
      priceGbp: parseFloat(formData.priceGbp),
      // Keep legacy price field aligned with USD for backward compatibility.
      price: parseFloat(formData.priceUsd),
      originalPrice: formData.originalPrice
        ? parseFloat(formData.originalPrice)
        : undefined,
      description: formData.description,
      images: formData.images,
      category: formData.category,
      subcategory: formData.subcategory || "General",
      sizes: formData.sizes,
      colors: formData.colors,
      brand: formData.brand,
      inStock: formData.inStock,
      isNew: formData.isNew,
      isSale: formData.isSale,
      material: formData.material || undefined,
      careInstructions:
        formData.careInstructions.length > 0
          ? formData.careInstructions
          : undefined,
      returnDays: formData.returnDays ? parseInt(formData.returnDays, 10) : 2,
      sizeGuideImage: formData.sizeGuideImage || undefined,
    } satisfies Omit<
      Product,
      "id" | "rating" | "reviews" | "createdAt" | "updatedAt"
    >;

    // One row per size/colour combination the product offers. Blank inputs
    // become 0 rather than being skipped, so a combination the admin left
    // empty reads as "none in stock" instead of silently untracked.
    const variants = formData.sizes.flatMap((size) =>
      formData.colors.map((color) => ({
        size,
        color: color.name,
        stockQuantity: Math.max(
          0,
          parseInt(stockLevels[stockKey(size, color.name)] || "0", 10) || 0,
        ),
      })),
    );

    try {
      let productId = id;

      if (isEditing && id) {
        await updateProduct(id, productData);
      } else {
        const created = await addProduct(productData);
        productId = created.id;
      }

      if (productId) {
        // Saved separately from the product; a stock failure should not make
        // the product itself look unsaved.
        try {
          await api.replaceProductVariants(productId, variants);
        } catch (stockError) {
          console.error("Failed to save stock levels", stockError);
          toast.error(
            "Product saved, but stock levels could not be updated. Please try again from the product list.",
          );
          navigate("/admin?tab=products");
          return;
        }
      }

      toast.success(
        isEditing ? "Product updated successfully" : "Product added successfully",
      );

      navigate("/admin?tab=products");
    } catch (error) {
      console.error("Failed to save product", error);
      toast.error("Unable to save product. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin?tab=products")}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="min-w-0 flex-1 truncate font-display text-xl lg:text-2xl font-semibold">
            {isEditing ? "Edit Product" : "Add New Product"}
          </h1>
          <ProductGuideDialog />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <section className="bg-card rounded-lg border border-border p-6">
            <h2 className="font-display text-lg font-semibold mb-6">
              Basic Information
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="mt-2 input-elegant"
                  placeholder="e.g., Premium Wool Blend Overcoat"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="priceNaira">Price (NGN) *</Label>
                  <Input
                    id="priceNaira"
                    type="number"
                    step="0.01"
                    value={formData.priceNaira}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        priceNaira: e.target.value,
                      }))
                    }
                    className="mt-2 input-elegant"
                    placeholder="150000"
                  />
                </div>
                <div>
                  <Label htmlFor="priceUsd">Price (USD) *</Label>
                  <Input
                    id="priceUsd"
                    type="number"
                    step="0.01"
                    value={formData.priceUsd}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        priceUsd: e.target.value,
                      }))
                    }
                    className="mt-2 input-elegant"
                    placeholder="99.99"
                  />
                </div>
                <div>
                  <Label htmlFor="priceGbp">Price (GBP) *</Label>
                  <Input
                    id="priceGbp"
                    type="number"
                    step="0.01"
                    value={formData.priceGbp}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        priceGbp: e.target.value,
                      }))
                    }
                    className="mt-2 input-elegant"
                    placeholder="79.99"
                  />
                </div>
                <div>
                  <Label htmlFor="originalPrice">Original Price ($)</Label>
                  <Input
                    id="originalPrice"
                    type="number"
                    step="0.01"
                    value={formData.originalPrice}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        originalPrice: e.target.value,
                      }))
                    }
                    className="mt-2 input-elegant"
                    placeholder="149.99 (for sale items)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        category: value,
                        subcategory: "", // Reset subcategory when category changes
                      }))
                    }>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.name} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subcategory</Label>
                  <Select
                    value={formData.subcategory}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, subcategory: value }))
                    }>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategoryOptions.map((sub) => (
                        <SelectItem key={sub} value={sub}>
                          {sub}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Brand *</Label>
                <Select
                  value={formData.brand}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, brand: value }))
                  }>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brandOptions.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="mt-2 input-elegant min-h-[100px]"
                  placeholder="Describe your product..."
                />
              </div>
            </div>
          </section>

          {/* Product Images */}
          <section className="bg-card rounded-lg border border-border p-6">
            <h2 className="font-display text-lg font-semibold mb-6">
              Product Images *
            </h2>

            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">Upload image files</p>
                    <p className="text-sm text-muted-foreground">
                      JPG, PNG, WebP, or GIF up to 5MB each
                    </p>
                  </div>
                  <Label
                    htmlFor="product-images"
                    className="inline-flex cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
                    <Upload size={18} className="mr-2" />
                    {isUploadingImages ? "Uploading..." : "Choose Files"}
                  </Label>
                </div>
                <Input
                  id="product-images"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handleUploadImages}
                  className="hidden"
                  disabled={isUploadingImages}
                />
              </div>

              <div className="flex gap-2">
                <Input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Paste image URL..."
                  className="input-elegant flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddImage();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleAddImage}
                  variant="outline">
                  <Plus size={18} className="mr-2" />
                  Add
                </Button>
              </div>

              {formData.images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {formData.images.map((url, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
                      <img
                        src={url}
                        alt={`Product ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={14} />
                      </button>
                      {index === 0 && (
                        <span className="absolute bottom-2 left-2 px-2 py-1 bg-primary text-primary-foreground text-xs rounded">
                          Main
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {formData.images.length === 0 && (
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload
                    className="mx-auto text-muted-foreground mb-2"
                    size={32}
                  />
                  <p className="text-sm text-muted-foreground">
                    Upload image files or add image URLs to display product
                    photos
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Sizes */}
          <section className="bg-card rounded-lg border border-border p-6">
            <h2 className="font-display text-lg font-semibold mb-6">
              Available Sizes *
            </h2>

            <div className="flex flex-wrap gap-3">
              {sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleSizeToggle(size)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    formData.sizes.includes(size)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:border-primary"
                  }`}>
                  {size}
                </button>
              ))}
            </div>
          </section>

          {/* Colors */}
          <section className="bg-card rounded-lg border border-border p-6">
            <h2 className="font-display text-lg font-semibold mb-6">
              Available Colors *
            </h2>

            <div className="flex flex-wrap gap-3">
              {allColors.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => handleColorToggle(color)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    formData.colors.find((c) => c.name === color.name)
                      ? "bg-primary/10 border-primary"
                      : "bg-background border-border hover:border-primary"
                  }`}>
                  <span
                    className="w-4 h-4 rounded-full border border-border"
                    style={{ backgroundColor: color.hex }}
                  />
                  {color.name}
                </button>
              ))}
            </div>
          </section>

          {/* Stock */}
          <section className="bg-card rounded-lg border border-border p-6">
            <div className="mb-6">
              <h2 className="font-display text-lg font-semibold">Stock</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Stock is tracked per size and colour, so running out of one
                combination does not take the whole piece off sale.
              </p>
            </div>

            {formData.sizes.length === 0 || formData.colors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Choose at least one size and one colour above to enter stock.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left font-medium pb-3 pr-4">Colour</th>
                      {formData.sizes.map((size) => (
                        <th
                          key={size}
                          className="text-center font-medium pb-3 px-2 min-w-[72px]">
                          {size}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {formData.colors.map((color) => (
                      <tr key={color.name} className="border-t border-border">
                        <td className="py-3 pr-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="w-4 h-4 rounded-full border border-border shrink-0"
                              style={{ backgroundColor: color.hex }}
                            />
                            {color.name}
                          </span>
                        </td>
                        {formData.sizes.map((size) => {
                          const key = stockKey(size, color.name);
                          return (
                            <td key={key} className="py-2 px-2">
                              <Input
                                type="number"
                                min={0}
                                inputMode="numeric"
                                aria-label={`Stock for ${size} ${color.name}`}
                                value={stockLevels[key] ?? ""}
                                placeholder="0"
                                onChange={(event) =>
                                  setStockLevels((prev) => ({
                                    ...prev,
                                    [key]: event.target.value,
                                  }))
                                }
                                className="text-center"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Product Details */}
          <section className="bg-card rounded-lg border border-border p-6">
            <h2 className="font-display text-lg font-semibold mb-6">
              Product Details
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="material">Material</Label>
                <Input
                  id="material"
                  value={formData.material}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      material: e.target.value,
                    }))
                  }
                  className="mt-2 input-elegant"
                  placeholder="e.g., 100% Cotton, 70% Wool 30% Polyester"
                />
              </div>

              <div>
                <Label>Care Instructions</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newCareInstruction}
                    onChange={(e) => setNewCareInstruction(e.target.value)}
                    placeholder="e.g., Machine wash cold"
                    className="input-elegant flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCareInstruction();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleAddCareInstruction}
                    variant="outline">
                    Add
                  </Button>
                </div>

                {formData.careInstructions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.careInstructions.map((instruction, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-secondary rounded-full text-sm">
                        {instruction}
                        <button
                          type="button"
                          onClick={() => handleRemoveCareInstruction(index)}
                          className="text-muted-foreground hover:text-foreground">
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Returns & Size Guide */}
          <section className="bg-card rounded-lg border border-border p-6">
            <h2 className="font-display text-lg font-semibold mb-6">
              Returns & Size Guide
            </h2>

            <div className="space-y-6">
              <div className="max-w-xs">
                <Label htmlFor="returnDays">Return window (days)</Label>
                <Input
                  id="returnDays"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.returnDays}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      returnDays: e.target.value,
                    }))
                  }
                  className="mt-2 input-elegant"
                  placeholder="2"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  Days customers have to return this product. Use 0 for final
                  sale (no returns).
                </p>
              </div>

              <div>
                <Label>Size guide image</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Shown in a popup from the product page. JPG, PNG, WebP, or GIF
                  up to 5MB.
                </p>

                {formData.sizeGuideImage ? (
                  <div className="relative inline-block">
                    <img
                      src={formData.sizeGuideImage}
                      alt="Size guide"
                      className="max-h-64 rounded-lg border border-border object-contain"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          sizeGuideImage: "",
                        }))
                      }
                      className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <Label
                    htmlFor="size-guide-image"
                    className="inline-flex cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
                    <Upload size={18} className="mr-2" />
                    {isUploadingSizeGuide
                      ? "Uploading..."
                      : "Upload size guide"}
                  </Label>
                )}
                <Input
                  id="size-guide-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleUploadSizeGuide}
                  className="hidden"
                  disabled={isUploadingSizeGuide}
                />
              </div>
            </div>
          </section>

          {/* Status & Flags */}
          <section className="bg-card rounded-lg border border-border p-6">
            <h2 className="font-display text-lg font-semibold mb-6">
              Status & Badges
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>In Stock</Label>
                  <p className="text-sm text-muted-foreground">
                    Is this product currently available?
                  </p>
                </div>
                <Switch
                  checked={formData.inStock}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, inStock: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>New Arrival</Label>
                  <p className="text-sm text-muted-foreground">
                    Display "New" badge on product
                  </p>
                </div>
                <Switch
                  checked={formData.isNew}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isNew: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>On Sale</Label>
                  <p className="text-sm text-muted-foreground">
                    Display "Sale" badge (set original price above)
                  </p>
                </div>
                <Switch
                  checked={formData.isSale}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isSale: checked }))
                  }
                />
              </div>
            </div>
          </section>

          {/* Submit Buttons */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/admin?tab=products")}
              disabled={isUploadingImages}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="btn-primary"
              disabled={isUploadingImages}>
              {isEditing ? "Update Product" : "Add Product"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default AdminProductForm;
