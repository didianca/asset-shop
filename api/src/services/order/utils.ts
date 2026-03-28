type OrderItemWithProduct = {
  productId: string;
  unitPrice: { toString(): string } | number;
  product: {
    name: string;
    slug: string;
    previewUrl: string;
  };
};

type StatusHistoryEntry = {
  id: string;
  status: string;
  note: string | null;
  changedBy: string | null;
  createdAt: Date;
};

type PaymentRecord = {
  id: string;
  amount: { toString(): string } | number;
  status: string;
  provider: string;
  createdAt: Date;
} | null;

type OrderWithDetails = {
  id: string;
  userId: string;
  status: string;
  totalAmount: { toString(): string } | number;
  items: OrderItemWithProduct[];
  statusHistory: StatusHistoryEntry[];
  payment: PaymentRecord;
  createdAt: Date;
  updatedAt: Date;
};

type OrderItemResponse = {
  productId: string;
  name: string;
  slug: string;
  unitPrice: number;
  previewUrl: string;
};

type OrderResponse = {
  id: string;
  userId: string;
  status: string;
  totalAmount: number;
  items: OrderItemResponse[];
  statusHistory: {
    id: string;
    status: string;
    note: string | null;
    changedBy: string | null;
    createdAt: Date;
  }[];
  payment: {
    id: string;
    amount: number;
    status: string;
    provider: string;
    createdAt: Date;
  } | null;
  createdAt: Date;
  updatedAt: Date;
};

export function effectivePrice(price: number, discountPercent: number | null): number {
  if (!discountPercent) return price;
  return Math.round(price * (1 - discountPercent / 100) * 100) / 100;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["paid"],
  paid: ["fulfilled"],
  fulfilled: ["refunded"],
  refunded: [],
};

export function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isWithinRefundWindow(fulfilledAt: Date): boolean {
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - fulfilledAt.getTime() <= thirtyDaysMs;
}

export function formatOrder(order: OrderWithDetails): OrderResponse {
  const items = order.items.map((item) => ({
    productId: item.productId,
    name: item.product.name,
    slug: item.product.slug,
    unitPrice: Number(item.unitPrice),
    previewUrl: item.product.previewUrl,
  }));

  const statusHistory = order.statusHistory.map((entry) => ({
    id: entry.id,
    status: entry.status,
    note: entry.note,
    changedBy: entry.changedBy,
    createdAt: entry.createdAt,
  }));

  const payment = order.payment
    ? {
        id: order.payment.id,
        amount: Number(order.payment.amount),
        status: order.payment.status,
        provider: order.payment.provider,
        createdAt: order.payment.createdAt,
      }
    : null;

  return {
    id: order.id,
    userId: order.userId,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    items,
    statusHistory,
    payment,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
