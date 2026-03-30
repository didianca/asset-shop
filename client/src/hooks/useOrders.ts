import { useEffect, useState, useCallback } from "react";
import * as ordersApi from "../api/orders.api";
import type { OrderResponse } from "../types/api";

interface UseOrdersOptions {
  limit?: number;
}

export function useOrders({ limit = 10 }: UseOrdersOptions = {}) {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(
    null,
  );

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await ordersApi.getOrders({ page, limit });
      setOrders(data.orders);
      setTotal(data.total);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const selectOrder = async (id: string) => {
    const { data } = await ordersApi.getOrder(id);
    setSelectedOrder(data);
  };

  const clearSelection = () => setSelectedOrder(null);

  return {
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
  };
}
