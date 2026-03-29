import type { OrderResponse } from "../../types/api";
import { formatPrice } from "../../lib/utils";
import StatusBadge from "./StatusBadge";
import StatusTimeline from "./StatusTimeline";
import Card from "../ui/Card";
import Button from "../ui/Button";

interface OrderDetailProps {
  order: OrderResponse;
  onBack: () => void;
}

export default function OrderDetail({ order, onBack }: OrderDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          &larr; Back
        </Button>
        <h2 className="text-lg font-semibold text-gray-900">
          Order {order.id.slice(0, 8)}...
        </h2>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-4 font-semibold text-gray-900">Items</h3>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-3"
              >
                <img
                  src={item.previewUrl}
                  alt={item.name}
                  className="h-12 w-12 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {item.name}
                  </p>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatPrice(item.unitPrice)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="flex justify-between font-semibold text-gray-900">
              <span>Total</span>
              <span>{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 font-semibold text-gray-900">Status History</h3>
          <StatusTimeline history={order.statusHistory} />
        </Card>
      </div>

      {order.payment && (
        <Card className="p-6">
          <h3 className="mb-2 font-semibold text-gray-900">Payment</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Amount: {formatPrice(order.payment.amount)}</p>
            <p>Status: {order.payment.status}</p>
            <p>Provider: {order.payment.provider}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
