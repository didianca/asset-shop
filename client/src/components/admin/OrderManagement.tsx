import * as ordersApi from "../../api/orders.api";
import type { OrderStatus, OrderResponse, ApiError } from "../../types/api";
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
  Record<OrderStatus, "paid" | "fulfilled">
> = {
  pending: "paid",
  paid: "fulfilled",
};

const REFUNDABLE_STATUSES: OrderStatus[] = ["paid", "fulfilled"];

function previousStatus(order: OrderResponse): "paid" | "fulfilled" {
  const history = order.statusHistory;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].status === "paid" || history[i].status === "fulfilled") {
      return history[i].status as "paid" | "fulfilled";
    }
  }
  return "paid";
}

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
  const [refundTarget, setRefundTarget] = useState<OrderResponse | null>(null);
  const [refundNote, setRefundNote] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);
  const [denyTarget, setDenyTarget] = useState<OrderResponse | null>(null);
  const [denyNote, setDenyNote] = useState("");
  const [isDenying, setIsDenying] = useState(false);
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

  const handleRefund = async () => {
    if (!refundTarget || !refundNote.trim()) return;

    setIsRefunding(true);
    try {
      await ordersApi.updateOrderStatus(refundTarget.id, {
        status: "refunded",
        note: refundNote.trim(),
      });
      addToast("Order refunded", "success");
      setRefundTarget(null);
      setRefundNote("");
      await fetchOrders();
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      addToast(
        axiosError.response?.data?.message ?? "Failed to refund order",
        "error",
      );
    } finally {
      setIsRefunding(false);
    }
  };

  const handleApproveRefund = async (order: OrderResponse) => {
    setUpdatingId(order.id);
    try {
      await ordersApi.updateOrderStatus(order.id, { status: "refunded" });
      addToast("Refund approved", "success");
      await fetchOrders();
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      addToast(
        axiosError.response?.data?.message ?? "Failed to approve refund",
        "error",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDenyRefund = async () => {
    if (!denyTarget) return;

    setIsDenying(true);
    try {
      await ordersApi.updateOrderStatus(denyTarget.id, {
        status: previousStatus(denyTarget),
        note: denyNote.trim() || undefined,
      });
      addToast("Refund denied", "success");
      setDenyTarget(null);
      setDenyNote("");
      await fetchOrders();
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      addToast(
        axiosError.response?.data?.message ?? "Failed to deny refund",
        "error",
      );
    } finally {
      setIsDenying(false);
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
        onRefund={
          REFUNDABLE_STATUSES.includes(selectedOrder.status)
            ? async (note) => {
                await ordersApi.updateOrderStatus(selectedOrder.id, {
                  status: "refunded",
                  note,
                });
                addToast("Order refunded", "success");
                clearSelection();
                await fetchOrders();
              }
            : undefined
        }
        onApproveRefund={
          selectedOrder.status === "refund_pending"
            ? async () => {
                await ordersApi.updateOrderStatus(selectedOrder.id, {
                  status: "refunded",
                });
                addToast("Refund approved", "success");
                clearSelection();
                await fetchOrders();
              }
            : undefined
        }
        onDenyRefund={
          selectedOrder.status === "refund_pending"
            ? async (note) => {
                await ordersApi.updateOrderStatus(selectedOrder.id, {
                  status: previousStatus(selectedOrder),
                  note: note || undefined,
                });
                addToast("Refund denied", "success");
                clearSelection();
                await fetchOrders();
              }
            : undefined
        }
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
              <th className="pb-3 font-medium">Customer</th>
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
              const canRefund = REFUNDABLE_STATUSES.includes(order.status);
              return (
                <tr key={order.id} className="border-b border-gray-100">
                  <td
                    className="cursor-pointer py-3 font-mono text-xs text-indigo-600 hover:underline"
                    onClick={() => selectOrder(order.id)}
                  >
                    {order.id.slice(0, 8)}...
                  </td>
                  <td className="py-3 text-gray-600">
                    {order.user ? (
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {order.user.firstName} {order.user.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{order.user.email}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
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
                    <div className="flex gap-2">
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
                      {canRefund && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setRefundTarget(order)}
                        >
                          Refund
                        </Button>
                      )}
                      {order.status === "refund_pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            isLoading={updatingId === order.id}
                            onClick={() => handleApproveRefund(order)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setDenyTarget(order)}
                          >
                            Deny
                          </Button>
                        </>
                      )}
                    </div>
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

      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Refund Order
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              Order {refundTarget.id.slice(0, 8)}... &mdash;{" "}
              {formatPrice(refundTarget.totalAmount)}
              {refundTarget.user && (
                <span>
                  {" "}for {refundTarget.user.firstName} {refundTarget.user.lastName}
                </span>
              )}
            </p>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Reason for refund
            </label>
            <textarea
              className="mb-4 w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={3}
              placeholder="Enter reason for refund..."
              value={refundNote}
              onChange={(e) => setRefundNote(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRefundTarget(null);
                  setRefundNote("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isRefunding}
                disabled={!refundNote.trim()}
                onClick={handleRefund}
              >
                Confirm Refund
              </Button>
            </div>
          </div>
        </div>
      )}

      {denyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Deny Refund
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              Order {denyTarget.id.slice(0, 8)}... &mdash;{" "}
              {formatPrice(denyTarget.totalAmount)}
              {denyTarget.user && (
                <span>
                  {" "}for {denyTarget.user.firstName} {denyTarget.user.lastName}
                </span>
              )}
            </p>
            {(() => {
              const customerNote = denyTarget.statusHistory
                .find((h) => h.status === "refund_pending")?.note;
              return customerNote ? (
                <div className="mb-4 rounded-lg bg-orange-50 p-3">
                  <p className="mb-1 text-xs font-medium text-orange-800">
                    Customer&apos;s reason
                  </p>
                  <p className="text-sm text-orange-900">{customerNote}</p>
                </div>
              ) : null;
            })()}
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Reason for denial (optional)
            </label>
            <textarea
              className="mb-4 w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={3}
              placeholder="Enter reason for denial..."
              value={denyNote}
              onChange={(e) => setDenyNote(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDenyTarget(null);
                  setDenyNote("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isDenying}
                onClick={handleDenyRefund}
              >
                Confirm Denial
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
