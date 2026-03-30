import { useState, useEffect, type FormEvent } from "react";
import type {
  BundleResponse,
  CreateBundleBody,
  UpdateBundleBody,
  ProductResponse,
  ApiError,
} from "../../types/api";
import * as bundlesApi from "../../api/bundles.api";
import * as productsApi from "../../api/products.api";
import { useUiStore } from "../../stores/uiStore";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { AxiosError } from "axios";

interface BundleFormProps {
  bundle?: BundleResponse;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function BundleForm({
  bundle,
  onSuccess,
  onCancel,
}: BundleFormProps) {
  const isEdit = !!bundle;
  const addToast = useUiStore((s) => s.addToast);

  const [name, setName] = useState(bundle?.name ?? "");
  const [slug, setSlug] = useState(bundle?.slug ?? "");
  const [description, setDescription] = useState(bundle?.description ?? "");
  const [discountPercent, setDiscountPercent] = useState(
    bundle?.discountPercent ? bundle.discountPercent.toString() : "",
  );
  const [isActive, setIsActive] = useState(bundle?.isActive ?? true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(bundle?.products.map((p) => p.id) ?? []),
  );

  const [allProducts, setAllProducts] = useState<ProductResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    productsApi.getProducts().then((res) => {
      setAllProducts(res.data.filter((p) => !p.bundle || p.bundle.id === bundle?.id));
    });
  }, [bundle?.id]);

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

  const toggleProduct = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsLoading(true);

    const productIds = Array.from(selectedIds);

    try {
      if (isEdit && bundle) {
        const body: UpdateBundleBody = {
          name,
          slug,
          description: description || null,
          discountPercent: discountPercent ? parseInt(discountPercent, 10) : null,
          isActive,
          productIds,
        };
        await bundlesApi.updateBundle(bundle.id, body);
        addToast("Bundle updated", "success");
      } else {
        const body: CreateBundleBody = {
          name,
          slug,
          description: description || undefined,
          discountPercent: discountPercent ? parseInt(discountPercent, 10) : undefined,
          productIds: productIds.length > 0 ? productIds : undefined,
        };
        await bundlesApi.createBundle(body);
        addToast("Bundle created", "success");
      }
      onSuccess();
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      const data = axiosError.response?.data;
      setError(data?.message ?? "Failed to save bundle");
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

      <div>
        <span className="mb-2 block text-sm font-medium text-gray-700">
          Products
        </span>
        {allProducts.length === 0 ? (
          <p className="text-sm text-gray-400">No available products.</p>
        ) : (
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
            {allProducts.map((product) => (
              <label
                key={product.id}
                className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(product.id)}
                  onChange={() => toggleProduct(product.id)}
                  className="rounded border-gray-300"
                />
                <img
                  src={product.previewUrl}
                  alt={product.name}
                  className="h-8 w-8 rounded object-cover"
                />
                <span className="text-sm text-gray-800">{product.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

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
          {isEdit ? "Update Bundle" : "Create Bundle"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
