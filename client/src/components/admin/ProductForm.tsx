import { useState, type FormEvent } from "react";
import type {
  ProductResponse,
  CreateProductBody,
  UpdateProductBody,
  ApiError,
} from "../../types/api";
import * as productsApi from "../../api/products.api";
import * as uploadApi from "../../api/upload.api";
import { useUiStore } from "../../stores/uiStore";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { AxiosError } from "axios";

interface ProductFormProps {
  product?: ProductResponse;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ProductForm({
  product,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const isEdit = !!product;
  const addToast = useUiStore((s) => s.addToast);

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const [discountPercent, setDiscountPercent] = useState(
    product?.discountPercent ? product.discountPercent.toString() : "",
  );
  const [tags, setTags] = useState(product?.tags?.join(", ") ?? "");
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleNameChange = (value: string) => {
    setName(value);
    if (!isEdit) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      );
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsLoading(true);

    const parsedTags = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (!isEdit && !file) {
        setError("Please select an asset file to upload");
        setIsLoading(false);
        return;
      }

      if (!isEdit && file) {
        await uploadApi.uploadAsset(slug, file);
      }

      if (isEdit && product) {
        const body: UpdateProductBody = {
          name,
          slug,
          description: description || null,
          price: parseFloat(price),
          discountPercent: parseFloat(discountPercent) || null,
          tags: parsedTags,
          isActive,
        };
        await productsApi.updateProduct(product.id, body);
        addToast("Product updated", "success");
      } else {
        const body: CreateProductBody = {
          name,
          slug,
          description: description || undefined,
          price: parseFloat(price),
          discountPercent: parseFloat(discountPercent) || undefined,
          tags: parsedTags.length > 0 ? parsedTags : undefined,
        };
        await productsApi.createProduct(body);
        addToast("Product created", "success");
      }
      onSuccess();
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      const data = axiosError.response?.data;
      setError(data?.message ?? "Failed to save product");
      if (data?.errors) setFieldErrors(data.errors);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Input
        id="name"
        label="Name"
        value={name}
        onChange={(e) => handleNameChange(e.target.value)}
        error={fieldErrors.name?.[0]}
        required
      />

      <Input
        id="slug"
        label="Slug"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        error={fieldErrors.slug?.[0]}
        required
      />

      <div>
        <label
          htmlFor="description"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="price"
          label="Price"
          type="number"
          step="0.01"
          min="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          error={fieldErrors.price?.[0]}
          required
        />
        <Input
          id="discountPercent"
          label="Discount %"
          type="number"
          min="0"
          max="100"
          value={discountPercent}
          onChange={(e) => setDiscountPercent(e.target.value)}
          error={fieldErrors.discountPercent?.[0]}
        />
      </div>

      <Input
        id="tags"
        label="Tags (comma-separated)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="dark, minimalist, 4K"
      />

      {!isEdit && (
        <div>
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Asset file <span className="text-red-500">*</span>
          </span>
          <label
            htmlFor="file"
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center transition hover:border-indigo-400 hover:bg-indigo-50"
          >
            <svg
              className="mb-2 h-8 w-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            {file ? (
              <span className="text-sm font-medium text-indigo-600">
                {file.name}
              </span>
            ) : (
              <>
                <span className="text-sm font-medium text-gray-700">
                  Click to upload
                </span>
                <span className="mt-0.5 text-xs text-gray-400">
                  PNG, JPG, or WebP
                </span>
              </>
            )}
            <input
              id="file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="sr-only"
              required
            />
          </label>
        </div>
      )}

      {isEdit && (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-gray-300"
          />
          Active
        </label>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" isLoading={isLoading}>
          {isEdit ? "Update Product" : "Create Product"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
