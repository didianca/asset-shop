import { useEffect, useState, useMemo, useCallback } from "react";
import { useProductStore } from "../stores/productStore";
import ProductGrid from "../components/products/ProductGrid";
import TagFilter from "../components/products/TagFilter";
import CatalogToolbar, {
  type CatalogFilters,
} from "../components/products/CatalogToolbar";
import Spinner from "../components/ui/Spinner";
import { calculateEffectivePrice } from "../lib/utils";

const defaultFilters: CatalogFilters = {
  search: "",
  sort: "newest",
  onSale: false,
  minPrice: "",
  maxPrice: "",
};

export default function CatalogPage() {
  const { products, tags, isLoading, fetchProducts, fetchTags } =
    useProductStore();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filters, setFilters] = useState<CatalogFilters>(defaultFilters);

  useEffect(() => {
    fetchProducts();
    fetchTags();
  }, [fetchProducts, fetchTags]);

  const handleFilterChange = useCallback(
    <K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleClearFilters = useCallback(() => {
    setFilters(defaultFilters);
    setSelectedTags([]);
  }, []);

  const hasActiveFilters =
    selectedTags.length > 0 ||
    filters.search !== "" ||
    filters.sort !== "newest" ||
    filters.onSale ||
    filters.minPrice !== "" ||
    filters.maxPrice !== "";

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const filteredProducts = useMemo(() => {
    const searchLower = filters.search.toLowerCase();
    const min = filters.minPrice ? parseFloat(filters.minPrice) : null;
    const max = filters.maxPrice ? parseFloat(filters.maxPrice) : null;

    const filtered = products.filter((p) => {
      if (
        searchLower &&
        !p.name.toLowerCase().includes(searchLower) &&
        !(p.description ?? "").toLowerCase().includes(searchLower)
      ) {
        return false;
      }

      if (
        selectedTags.length > 0 &&
        !selectedTags.some((tag) => p.tags.includes(tag))
      ) {
        return false;
      }

      const effective = calculateEffectivePrice(p.price, p.discountPercent);
      if (min !== null && !isNaN(min) && effective < min) return false;
      if (max !== null && !isNaN(max) && effective > max) return false;

      return !(filters.onSale && !(p.discountPercent && p.discountPercent > 0));


    });

    const sorted = [...filtered];
    switch (filters.sort) {
      case "price-asc":
        sorted.sort(
          (a, b) =>
            calculateEffectivePrice(a.price, a.discountPercent) -
            calculateEffectivePrice(b.price, b.discountPercent),
        );
        break;
      case "price-desc":
        sorted.sort(
          (a, b) =>
            calculateEffectivePrice(b.price, b.discountPercent) -
            calculateEffectivePrice(a.price, a.discountPercent),
        );
        break;
      case "name-asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      // "newest" — default API order (createdAt desc), no re-sort needed
    }

    return sorted;
  }, [products, selectedTags, filters]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
        <span className="text-sm text-gray-500">
          {filteredProducts.length} product
          {filteredProducts.length !== 1 ? "s" : ""}
        </span>
      </div>

      <CatalogToolbar
        filters={filters}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      >
        <TagFilter
          tags={tags}
          selectedTags={selectedTags}
          onToggleTag={handleToggleTag}
        />
      </CatalogToolbar>

      <ProductGrid products={filteredProducts} />
    </div>
  );
}
