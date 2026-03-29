import type { OrderResponse } from "../../types/api";
import { formatPrice } from "../../lib/utils";
import StatusBadge from "./StatusBadge";

interface OrderListProps {
  orders: OrderResponse[];
  onSelectOrder: (id: string) => void;
}

export default function OrderList({ orders, onSelectOrder }: OrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">No orders yet.</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 text-gray-500">
          <tr>
            <th className="pb-3 font-medium">Order</th>
            <th className="pb-3 font-medium">Date</th>
            <th className="pb-3 font-medium">Items</th>
            <th className="pb-3 font-medium">Total</th>
            <th className="pb-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              onClick={() => onSelectOrder(order.id)}
              className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
            >
              <td className="py-3 font-mono text-xs text-gray-500">
                {order.id.slice(0, 8)}...
              </td>
              <td className="py-3 text-gray-600">
                {new Date(order.createdAt).toLocaleDateString()}
              </td>
              <td className="py-3 text-gray-600">{order.items.length}</td>
              <td className="py-3 font-medium text-gray-900">
                {formatPrice(order.totalAmount)}
              </td>
              <td className="py-3">
                <StatusBadge status={order.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
