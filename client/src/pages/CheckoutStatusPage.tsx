import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { ROUTES } from "../lib/constants";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";

const stripePromise = import.meta.env.VITE_STRIPE_PK
  ? loadStripe(import.meta.env.VITE_STRIPE_PK)
  : null;

type PaymentResult = "succeeded" | "processing" | "failed" | "loading";

export default function CheckoutStatusPage() {
  const [searchParams] = useSearchParams();
  const clientSecret = searchParams.get("payment_intent_client_secret");
  const [result, setResult] = useState<PaymentResult>("loading");

  useEffect(() => {
    if (!clientSecret || !stripePromise) {
      setResult("failed");
      return;
    }

    stripePromise.then((stripe) => {
      if (!stripe) {
        setResult("failed");
        return;
      }
      stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
        switch (paymentIntent?.status) {
          case "succeeded":
            setResult("succeeded");
            break;
          case "processing":
            setResult("processing");
            break;
          default:
            setResult("failed");
        }
      });
    });
  }, [clientSecret]);

  return (
    <div className="flex justify-center pt-10">
      <Card className="w-full max-w-md p-6 text-center">
        {result === "loading" && (
          <div className="flex justify-center py-8">
            <Spinner className="h-8 w-8" />
          </div>
        )}

        {result === "succeeded" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Payment Successful!
            </h1>
            <p className="text-gray-600">
              Your order has been placed. You can track it from your dashboard.
            </p>
            <Link to={ROUTES.DASHBOARD}>
              <Button>View My Orders</Button>
            </Link>
          </div>
        )}

        {result === "processing" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Payment Processing
            </h1>
            <p className="text-gray-600">
              Your payment is being processed. We&apos;ll update your order
              status shortly.
            </p>
            <Link to={ROUTES.DASHBOARD}>
              <Button variant="outline">View My Orders</Button>
            </Link>
          </div>
        )}

        {result === "failed" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Payment Failed
            </h1>
            <p className="text-gray-600">
              Something went wrong with your payment. Please try again.
            </p>
            <Link to={ROUTES.CART}>
              <Button>Back to Cart</Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
