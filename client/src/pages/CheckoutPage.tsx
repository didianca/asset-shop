import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useCartStore } from "../stores/cartStore";
import { useUiStore } from "../stores/uiStore";
import * as ordersApi from "../api/orders.api";
import * as paymentsApi from "../api/payments.api";
import { ROUTES } from "../lib/constants";
import { formatPrice } from "../lib/utils";
import CheckoutForm from "../components/checkout/CheckoutForm";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import Card from "../components/ui/Card";
import type { ApiError } from "../types/api";
import { AxiosError } from "axios";

const stripePromise = import.meta.env.VITE_STRIPE_PK
  ? loadStripe(import.meta.env.VITE_STRIPE_PK)
  : null;

export default function CheckoutPage() {
  const { items, total, fetchCart } = useCartStore();
  const addToast = useUiStore((s) => s.addToast);
  const navigate = useNavigate();

  const [step, setStep] = useState<"review" | "payment" | "error">("review");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handlePlaceOrder = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const { data: order } = await ordersApi.createOrder();
      const { data: payment } = await paymentsApi.createPayment(order.id);
      setClientSecret(payment.clientSecret);
      setStep("payment");
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      const message =
        axiosError.response?.data?.message ?? "Failed to create order";
      setError(message);
      setStep("error");
      addToast(message, "error");
    } finally {
      setIsCreating(false);
    }
  };

  if (items.length === 0 && step === "review") {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Your cart is empty.</p>
        <Button className="mt-4" onClick={() => navigate(ROUTES.CATALOG)}>
          Browse Catalog
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Checkout</h1>

      {step === "review" && (
        <Card className="space-y-4 p-6">
          <h2 className="font-semibold text-gray-900">Order Summary</h2>
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex justify-between text-sm text-gray-600"
            >
              <span>{item.name}</span>
              <span>{formatPrice(item.price)}</span>
            </div>
          ))}
          <div className="border-t border-gray-200 pt-2">
            <div className="flex justify-between font-semibold text-gray-900">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
          <Button
            size="lg"
            className="w-full"
            onClick={handlePlaceOrder}
            isLoading={isCreating}
          >
            Place Order & Pay
          </Button>
        </Card>
      )}

      {step === "payment" && clientSecret && stripePromise && (
        <Card className="p-6">
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm />
          </Elements>
        </Card>
      )}

      {step === "payment" && !stripePromise && (
        <Card className="p-6 text-center">
          <p className="text-red-600">
            Stripe is not configured. Set VITE_STRIPE_PK in your environment.
          </p>
        </Card>
      )}

      {step === "error" && (
        <Card className="space-y-4 p-6 text-center">
          <p className="text-red-600">{error}</p>
          <Button variant="outline" onClick={() => setStep("review")}>
            Try Again
          </Button>
        </Card>
      )}

      {isCreating && (
        <div className="flex justify-center py-8">
          <Spinner className="h-8 w-8" />
        </div>
      )}
    </div>
  );
}
