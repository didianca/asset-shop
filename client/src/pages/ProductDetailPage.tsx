import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useProductStore } from "../stores/productStore";
import { useCartStore } from "../stores/cartStore";
import { useAuthStore } from "../stores/authStore";
import { useUiStore } from "../stores/uiStore";
import { formatPrice, calculateEffectivePrice } from "../lib/utils";
import { ROUTES } from "../lib/constants";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import type { ApiError } from "../types/api";
import { AxiosError } from "axios";

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { products, isLoading, fetchProducts, getBySlug } = useProductStore();
  const { items, addItems } = useCartStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addToast = useUiStore((s) => s.addToast);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (products.length === 0) fetchProducts();
  }, [products.length, fetchProducts]);

  const product = slug ? getBySlug(slug) : undefined;
  const isInCart = product
    ? items.some((i) => i.productId === product.id)
    : false;

  const handleAddToCart = async () => {
    if (!product) return;
    setIsAdding(true);
    try {
      await addItems([product.id]);
      addToast("Added to cart", "success");
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      addToast(axiosError.response?.data?.message ?? "Failed to add to cart", "error");
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Product not found.</p>
        <Link
          to={ROUTES.CATALOG}
          className="mt-4 inline-block text-sm font-medium text-indigo-600"
        >
          Back to Catalog
        </Link>
      </div>
    );
  }

  const effectivePrice = calculateEffectivePrice(
    product.price,
    product.discountPercent,
  );
  const hasDiscount = (product.discountPercent ?? 0) > 0;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="overflow-hidden rounded-xl bg-gray-100">
        <img
          src={product.previewUrl}
          alt={product.name}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold text-gray-900">
            {formatPrice(effectivePrice)}
          </span>
          {hasDiscount && (
            <>
              <span className="text-xl text-gray-400 line-through">
                {formatPrice(product.price)}
              </span>
              <Badge className="bg-green-100 text-green-800">
                -{product.discountPercent}%
              </Badge>
            </>
          )}
        </div>

        {product.description && (
          <p className="text-gray-600">{product.description}</p>
        )}

        {product.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {product.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        )}

        {isAuthenticated ? (
          isInCart ? (
            <Link to={ROUTES.CART}>
              <Button variant="secondary" size="lg" className="w-full">
                Already in Cart — View Cart
              </Button>
            </Link>
          ) : (
            <Button
              size="lg"
              className="w-full"
              isLoading={isAdding}
              onClick={handleAddToCart}
            >
              Add to Cart
            </Button>
          )
        ) : (
          <Link to={ROUTES.LOGIN}>
            <Button size="lg" className="w-full">
              Login to Purchase
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
