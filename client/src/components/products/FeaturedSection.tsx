import type { ProductResponse } from "../../types/api";
import ProductGrid from "./ProductGrid";

interface FeaturedSectionProps {
  title: string;
  products: ProductResponse[];
}

export default function FeaturedSection({
  title,
  products,
}: FeaturedSectionProps) {
  if (products.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-gray-900">{title}</h2>
      <ProductGrid products={products} />
    </section>
  );
}
