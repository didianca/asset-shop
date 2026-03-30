import { useOrders } from "../../hooks/useOrders";
import * as ordersApi from "../../api/orders.api";
import { useUiStore } from "../../stores/uiStore";
import OrderList from "../../components/orders/OrderList";
import OrderDetail from "../../components/orders/OrderDetail";
import Pagination from "../../components/ui/Pagination";
import Spinner from "../../components/ui/Spinner";

const REFUNDABLE_STATUSES = ["paid", "fulfilled"] as const;

export default function CustomerDashboard() {
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
  } = useOrders({ limit: 10 });

  const addToast = useUiStore((s) => s.addToast);

  if (selectedOrder) {
    const canRefund = REFUNDABLE_STATUSES.includes(
      selectedOrder.status as (typeof REFUNDABLE_STATUSES)[number],
    );

    return (
      <OrderDetail
        order={selectedOrder}
        onBack={clearSelection}
        onRefund={
          canRefund
            ? async (note) => {
                await ordersApi.requestRefund(selectedOrder.id, { note });
                addToast("Refund request submitted", "success");
                clearSelection();
                await fetchOrders();
              }
            : undefined
        }
      />
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">My Orders</h1>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <>
          <OrderList orders={orders} onSelectOrder={selectOrder} />
          <Pagination
            page={page}
            total={total}
            limit={limit}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
