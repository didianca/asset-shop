import { useOrders } from "../../hooks/useOrders";
import OrderList from "../../components/orders/OrderList";
import OrderDetail from "../../components/orders/OrderDetail";
import Pagination from "../../components/ui/Pagination";
import Spinner from "../../components/ui/Spinner";

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
    limit,
  } = useOrders({ limit: 10 });

  if (selectedOrder) {
    return (
      <OrderDetail order={selectedOrder} onBack={clearSelection} />
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
