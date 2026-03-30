import type { ReactNode } from "react";
import Input from "../ui/Input";
import { cn } from "../../lib/utils";

export type SortOption =
  | "newest"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "name-desc";

export interface CatalogFilters {
  search: string;
  sort: SortOption;
  onSale: boolean;
  inBundle: boolean;
  bundleId: string;
  minPrice: string;
  maxPrice: string;
}

interface CatalogToolbarProps {
  filters: CatalogFilters;
  bundles: { id: string; name: string }[];
  onChange: <K extends keyof CatalogFilters>(
    key: K,
    value: CatalogFilters[K],
  ) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  children?: ReactNode;
}

export default function CatalogToolbar({
  filters,
  bundles,
  onChange,
  onClear,
  hasActiveFilters,
  children,
}: CatalogToolbarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-64">
          <Input
            id="search"
            label="Search"
            placeholder="Search products..."
            value={filters.search}
            onChange={(e) => onChange("search", e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="sort"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Sort by
          </label>
          <select
            id="sort"
            value={filters.sort}
            onChange={(e) => onChange("sort", e.target.value as SortOption)}
            className="block rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="newest">Newest</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name-asc">Name: A–Z</option>
            <option value="name-desc">Name: Z–A</option>
          </select>
        </div>

        {bundles.length > 0 && (
          <div>
            <label
              htmlFor="bundle"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Bundle
            </label>
            <select
              id="bundle"
              value={filters.bundleId}
              onChange={(e) => onChange("bundleId", e.target.value)}
              className="block rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All bundles</option>
              {bundles.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {children}

        <div className="flex items-end gap-2">
          <div className="w-24">
            <Input
              id="min-price"
              label="Min price"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={filters.minPrice}
              onChange={(e) => onChange("minPrice", e.target.value)}
            />
          </div>
          <span className="pb-2 text-gray-400">–</span>
          <div className="w-24">
            <Input
              id="max-price"
              label="Max price"
              type="number"
              min="0"
              step="0.01"
              placeholder="Any"
              value={filters.maxPrice}
              onChange={(e) => onChange("maxPrice", e.target.value)}
            />
          </div>
        </div>

        <label
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors",
            filters.onSale
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200",
          )}
        >
          <input
            type="checkbox"
            className="sr-only"
            checked={filters.onSale}
            onChange={(e) => onChange("onSale", e.target.checked)}
          />
          On Sale
        </label>

        <label
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors",
            filters.inBundle
              ? "bg-indigo-100 text-indigo-800"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200",
          )}
        >
          <input
            type="checkbox"
            className="sr-only"
            checked={filters.inBundle}
            onChange={(e) => onChange("inBundle", e.target.checked)}
          />
          In Bundle
        </label>

        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="rounded-full px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
