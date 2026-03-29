import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useCartStore } from "../stores/cartStore";
import { ROUTES } from "../lib/constants";
import CartItem from "../components/cart/CartItem";
import CartSummary from "../components/cart/CartSummary";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";

export default function CartPage() {
  const { items, isLoading, fetchCart } = useCartStore();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
        <p className="mt-4 text-gray-500">Your cart is empty.</p>
        <Link to={ROUTES.CATALOG} className="mt-6 inline-block">
          <Button>Browse Catalog</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Your Cart</h1>
        <div>
          {items.map((item) => (
            <CartItem key={item.productId} item={item} />
          ))}
        </div>
      </div>
      <div>
        <CartSummary />
        <Link to={ROUTES.CHECKOUT} className="mt-4 block">
          <Button size="lg" className="w-full">
            Proceed to Checkout
          </Button>
        </Link>
      </div>
    </div>
  );
}
