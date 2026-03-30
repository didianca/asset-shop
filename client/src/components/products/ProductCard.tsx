import { Link } from "react-router-dom";
import type { ProductResponse } from "../../types/api";
import { formatPrice, calculateEffectivePrice } from "../../lib/utils";
import Badge from "../ui/Badge";
import Card from "../ui/Card";

interface ProductCardProps {
  product: ProductResponse;
}

export default function ProductCard({ product }: ProductCardProps) {
  const effectivePrice = calculateEffectivePrice(
    product.price,
    product.discountPercent,
  );
  const hasDiscount = product.discountPercent && product.discountPercent > 0;

  return (
    <Link to={`/products/${product.slug}`}>
      <Card className="group overflow-hidden transition-shadow hover:shadow-md">
        <div className="aspect-square overflow-hidden bg-gray-100">
          <img
            src={product.previewUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">
            {product.name}
          </h3>

          <div className="mt-1 flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(effectivePrice)}
            </span>
            {hasDiscount && (
              <>
                <span className="text-sm text-gray-400 line-through">
                  {formatPrice(product.price)}
                </span>
                <Badge className="bg-green-100 text-green-800">
                  -{product.discountPercent}%
                </Badge>
              </>
            )}
          </div>

          {product.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {product.tags.slice(0, 3).map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
              {product.tags.length > 3 && (
                <Badge>+{product.tags.length - 3}</Badge>
              )}
            </div>
          )}

        </div>
      </Card>
    </Link>
  );
}
