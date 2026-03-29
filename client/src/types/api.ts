export type HealthResponse = {
  status: string;
  message: string;
};

export type UserRole = "admin" | "customer";
export type UserStatus = "pending" | "active" | "deleted";
export type OrderStatus = "pending" | "paid" | "fulfilled" | "refunded";
export type PaymentStatus = "pending" | "captured" | "failed" | "refunded";

export interface JwtPayload {
  id: string;
  role: UserRole;
  status: UserStatus;
}

export interface RegisterBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface ProductResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  discountPercent: number | null;
  isActive: boolean;
  tags: string[];
  previewKey: string;
  assetKey: string;
  previewUrl: string;
  assetUrl: string;
  bundle: {
    id: string;
    name: string;
    slug: string;
    discountPercent: number | null;
  } | null;
  createdAt: string;
}

export interface CreateProductBody {
  name: string;
  slug: string;
  description?: string;
  price: number;
  discountPercent?: number;
  tags?: string[];
}

export interface UpdateProductBody {
  name: string;
  slug: string;
  description: string | null;
  price: number;
  discountPercent: number | null;
  isActive: boolean;
  tags: string[];
}

export interface CartItemResponse {
  productId: string;
  name: string;
  slug: string;
  price: number;
  discountPercent: number | null;
  previewUrl: string;
  addedAt: string;
}

export interface CartResponse {
  id: string;
  items: CartItemResponse[];
  total: number;
}

export interface OrderItemResponse {
  productId: string;
  name: string;
  slug: string;
  unitPrice: number;
  previewUrl: string;
}

export interface StatusHistoryEntry {
  id: string;
  status: OrderStatus;
  note: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface PaymentSummary {
  id: string;
  amount: number;
  status: PaymentStatus;
  provider: string;
  createdAt: string;
}

export interface OrderResponse {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItemResponse[];
  statusHistory: StatusHistoryEntry[];
  payment: PaymentSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListResponse {
  orders: OrderResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface UpdateOrderStatusBody {
  status: "paid" | "fulfilled" | "refunded";
  note?: string;
}

export interface CreatePaymentResponse {
  paymentId: string;
  clientSecret: string;
}

export interface PaymentResponse {
  id: string;
  orderId: string;
  amount: number;
  status: PaymentStatus;
  provider: string;
  providerReference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
