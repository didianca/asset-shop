import * as ordersApi from "../../api/orders.api";
import type { OrderStatus, ApiError } from "../../types/api";
import { formatPrice } from "../../lib/utils";
import { useUiStore } from "../../stores/uiStore";
import { useOrders } from "../../hooks/useOrders";
import StatusBadge from "../orders/StatusBadge";
import OrderDetail from "../orders/OrderDetail";
import Pagination from "../ui/Pagination";
import Button from "../ui/Button";
import Spinner from "../ui/Spinner";
import { useState } from "react";
import { AxiosError } from "axios";

const NEXT_STATUS: Partial<
  Record<OrderStatus, "paid" | "fulfilled" | "refunded">
> = {
  pending: "paid",
  paid: "fulfilled",
  fulfilled: "refunded",
};

export default function OrderManagement() {
  const {
    orders,
    total,
    page,
    setPage,
    isLoading,
    selectedOrder,
    selectOrder,
    clearSelection,
    fetchOrders,
    limit,
  } = useOrders({ limit: 20 });

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const addToast = useUiStore((s) => s.addToast);

  const handleTransition = async (order: { id: string; status: OrderStatus }) => {
    const nextStatus = NEXT_STATUS[order.status];
    if (!nextStatus) return;

    setUpdatingId(order.id);
    try {
      await ordersApi.updateOrderStatus(order.id, { status: nextStatus });
      addToast(`Order updated to ${nextStatus}`, "success");
      await fetchOrders();
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      addToast(
        axiosError.response?.data?.message ?? "Failed to update order",
        "error",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (selectedOrder) {
    return (
      <OrderDetail
        order={selectedOrder}
        onBack={() => {
          clearSelection();
          fetchOrders();
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-gray-500">
            <tr>
              <th className="pb-3 font-medium">Order</th>
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">Items</th>
              <th className="pb-3 font-medium">Total</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const nextStatus = NEXT_STATUS[order.status];
              return (
                <tr key={order.id} className="border-b border-gray-100">
                  <td
                    className="cursor-pointer py-3 font-mono text-xs text-indigo-600 hover:underline"
                    onClick={() => selectOrder(order.id)}
                  >
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
                  <td className="py-3">
                    {nextStatus && (
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={updatingId === order.id}
                        onClick={() => handleTransition(order)}
                      >
                        Mark {nextStatus}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        total={total}
        limit={limit}
        onPageChange={setPage}
      />
    </div>
  );
}
