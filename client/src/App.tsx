import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";
import Spinner from "./components/ui/Spinner";

const HomePage = lazy(() => import("./pages/HomePage"));
const CatalogPage = lazy(() => import("./pages/CatalogPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const CheckoutStatusPage = lazy(() => import("./pages/CheckoutStatusPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const CustomerDashboard = lazy(
  () => import("./pages/dashboard/CustomerDashboard"),
);
const AdminDashboard = lazy(
  () => import("./pages/dashboard/AdminDashboard"),
);
const AdminProductsPage = lazy(
  () => import("./pages/dashboard/AdminProductsPage"),
);
const AdminOrdersPage = lazy(
  () => import("./pages/dashboard/AdminOrdersPage"),
);
const AdminBundlesPage = lazy(
  () => import("./pages/dashboard/AdminBundlesPage"),
);

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: "/",
        element: (
          <Suspense fallback={<PageLoader />}>
            <HomePage />
          </Suspense>
        ),
      },
      {
        path: "/catalog",
        element: (
          <Suspense fallback={<PageLoader />}>
            <CatalogPage />
          </Suspense>
        ),
      },
      {
        path: "/products/:slug",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProductDetailPage />
          </Suspense>
        ),
      },
      {
        path: "/login",
        element: (
          <Suspense fallback={<PageLoader />}>
            <LoginPage />
          </Suspense>
        ),
      },
      {
        path: "/register",
        element: (
          <Suspense fallback={<PageLoader />}>
            <RegisterPage />
          </Suspense>
        ),
      },
      {
        path: "/verify-email",
        element: (
          <Suspense fallback={<PageLoader />}>
            <VerifyEmailPage />
          </Suspense>
        ),
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "/cart",
            element: (
              <Suspense fallback={<PageLoader />}>
                <CartPage />
              </Suspense>
            ),
          },
          {
            path: "/checkout",
            element: (
              <Suspense fallback={<PageLoader />}>
                <CheckoutPage />
              </Suspense>
            ),
          },
          {
            path: "/checkout/status",
            element: (
              <Suspense fallback={<PageLoader />}>
                <CheckoutStatusPage />
              </Suspense>
            ),
          },
          {
            path: "/dashboard",
            element: (
              <Suspense fallback={<PageLoader />}>
                <CustomerDashboard />
              </Suspense>
            ),
          },
          {
            element: <AdminRoute />,
            children: [
              {
                path: "/admin",
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <AdminDashboard />
                  </Suspense>
                ),
              },
              {
                path: "/admin/products",
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <AdminProductsPage />
                  </Suspense>
                ),
              },
              {
                path: "/admin/orders",
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <AdminOrdersPage />
                  </Suspense>
                ),
              },
              {
                path: "/admin/bundles",
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <AdminBundlesPage />
                  </Suspense>
                ),
              },
            ],
          },
        ],
      },
      {
        path: "*",
        element: (
          <Suspense fallback={<PageLoader />}>
            <NotFoundPage />
          </Suspense>
        ),
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
