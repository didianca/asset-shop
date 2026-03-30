import { useState } from "react";
import type { CartItemResponse } from "../../types/api";
import { formatPrice, calculateEffectivePrice } from "../../lib/utils";
import { useCartStore } from "../../stores/cartStore";
import { useUiStore } from "../../stores/uiStore";
import Button from "../ui/Button";

interface CartItemProps {
  item: CartItemResponse;
}

export default function CartItem({ item }: CartItemProps) {
  const removeItem = useCartStore((s) => s.removeItem);
  const addToast = useUiStore((s) => s.addToast);
  const [isRemoving, setIsRemoving] = useState(false);

  const effectivePrice = calculateEffectivePrice(
    item.price,
    item.discountPercent,
  );
  const hasDiscount = (item.discountPercent ?? 0) > 0;

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await removeItem(item.productId);
      addToast("Item removed from cart", "info");
    } catch {
      addToast("Failed to remove item", "error");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="flex items-center gap-4 border-b border-gray-100 py-4">
      <img
        src={item.previewUrl}
        alt={item.name}
        className="h-16 w-16 rounded-lg object-cover"
      />
      <div className="flex-1">
        <h3 className="font-medium text-gray-900">{item.name}</h3>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">
            {formatPrice(effectivePrice)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(item.price)}
            </span>
          )}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRemove}
        isLoading={isRemoving}
      >
        Remove
      </Button>
    </div>
  );
}
