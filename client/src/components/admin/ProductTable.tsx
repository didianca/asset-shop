import type { ProductResponse } from "../../types/api";
import { formatPrice, calculateEffectivePrice } from "../../lib/utils";
import Badge from "../ui/Badge";
import Button from "../ui/Button";

interface ProductTableProps {
  products: ProductResponse[];
  onEdit: (product: ProductResponse) => void;
}

export default function ProductTable({ products, onEdit }: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">No products yet.</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 text-gray-500">
          <tr>
            <th className="pb-3 font-medium">Product</th>
            <th className="pb-3 font-medium">Price</th>
            <th className="pb-3 font-medium">Discount</th>
            <th className="pb-3 font-medium">Tags</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr
              key={product.id}
              className="border-b border-gray-100"
            >
              <td className="py-3">
                <div className="flex items-center gap-3">
                  <img
                    src={product.previewUrl}
                    alt={product.name}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-400">{product.slug}</p>
                  </div>
                </div>
              </td>
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {formatPrice(calculateEffectivePrice(product.price, product.discountPercent))}
                  </span>
                  {product.discountPercent ? (
                    <span className="text-xs text-gray-400 line-through">
                      {formatPrice(product.price)}
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="py-3">
                {product.discountPercent ? (
                  <Badge className="bg-green-100 text-green-800">
                    -{product.discountPercent}%
                  </Badge>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="py-3">
                <div className="flex flex-wrap gap-1">
                  {product.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                  {product.tags.length > 2 && (
                    <Badge>+{product.tags.length - 2}</Badge>
                  )}
                </div>
              </td>
              <td className="py-3">
                <Badge
                  className={
                    product.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }
                >
                  {product.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="py-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(product)}
                >
                  Edit
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
