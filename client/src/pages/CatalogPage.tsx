import { useEffect, useState, useMemo } from "react";
import { useProductStore } from "../stores/productStore";
import ProductGrid from "../components/products/ProductGrid";
import TagFilter from "../components/products/TagFilter";
import Spinner from "../components/ui/Spinner";

export default function CatalogPage() {
  const { products, tags, isLoading, fetchProducts, fetchTags } =
    useProductStore();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (products.length === 0) fetchProducts();
    if (tags.length === 0) fetchTags();
  }, [products.length, tags.length, fetchProducts, fetchTags]);

  const filteredProducts = useMemo(() => {
    if (selectedTags.length === 0) return products;
    return products.filter((p) =>
      selectedTags.some((tag) => p.tags.includes(tag)),
    );
  }, [products, selectedTags]);

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

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

      <TagFilter
        tags={tags}
        selectedTags={selectedTags}
        onToggleTag={handleToggleTag}
      />

      <ProductGrid products={filteredProducts} />
    </div>
  );
}
