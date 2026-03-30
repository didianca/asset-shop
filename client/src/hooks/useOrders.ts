import { useEffect, useState, useCallback } from "react";
import * as ordersApi from "../api/orders.api";
import { useAuthStore } from "../stores/authStore";
import type { OrderResponse } from "../types/api";

interface UseOrdersOptions {
  limit?: number;
  myOrders?: boolean;
}

export function useOrders({ limit = 10, myOrders = false }: UseOrdersOptions = {}) {
  const userId = useAuthStore((s) => s.user?.id);
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
      const params: { page: number; limit: number; userId?: string } = { page, limit };
      if (myOrders && userId) params.userId = userId;
      const { data } = await ordersApi.getOrders(params);
      setOrders(data.orders);
      setTotal(data.total);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, userId, myOrders]);

  useEffect(() => {
    setOrders([]);
    setTotal(0);
    setSelectedOrder(null);
    setPage(1);
  }, [userId]);

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
