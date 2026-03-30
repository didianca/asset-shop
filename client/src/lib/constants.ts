export const ROUTES = {
  HOME: "/",
  CATALOG: "/catalog",
  PRODUCT_DETAIL: "/products/:slug",
  CART: "/cart",
  CHECKOUT: "/checkout",
  CHECKOUT_STATUS: "/checkout/status",
  LOGIN: "/login",
  REGISTER: "/register",
  VERIFY_EMAIL: "/verify-email",
  DASHBOARD: "/dashboard",
  ADMIN: "/admin",
  ADMIN_PRODUCTS: "/admin/products",
  ADMIN_ORDERS: "/admin/orders",
} as const;

export const ORDER_STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  paid: { label: "Paid", color: "bg-blue-100 text-blue-800" },
  fulfilled: { label: "Fulfilled", color: "bg-green-100 text-green-800" },
  refund_pending: { label: "Refund Pending", color: "bg-orange-100 text-orange-800" },
  refunded: { label: "Refunded", color: "bg-red-100 text-red-800" },
} as const;

export const PAYMENT_STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  captured: { label: "Captured", color: "bg-green-100 text-green-800" },
  failed: { label: "Failed", color: "bg-red-100 text-red-800" },
  refunded: { label: "Refunded", color: "bg-gray-100 text-gray-800" },
} as const;
