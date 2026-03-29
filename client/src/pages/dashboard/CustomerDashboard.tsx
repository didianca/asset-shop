import { useEffect, useState, useCallback } from "react";
import * as ordersApi from "../../api/orders.api";
import type { OrderResponse } from "../../types/api";
import OrderList from "../../components/orders/OrderList";
import OrderDetail from "../../components/orders/OrderDetail";
import Pagination from "../../components/ui/Pagination";
import Spinner from "../../components/ui/Spinner";

export default function CustomerDashboard() {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(
    null,
  );
  const limit = 10;

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await ordersApi.getOrders({ page, limit });
      setOrders(data.orders);
      setTotal(data.total);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSelectOrder = async (id: string) => {
    const { data } = await ordersApi.getOrder(id);
    setSelectedOrder(data);
  };

  if (selectedOrder) {
    return (
      <OrderDetail
        order={selectedOrder}
        onBack={() => setSelectedOrder(null)}
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
          <OrderList orders={orders} onSelectOrder={handleSelectOrder} />
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
