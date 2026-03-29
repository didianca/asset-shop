import type { ProductResponse } from "../../types/api";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  products: ProductResponse[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">No products found.</div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
