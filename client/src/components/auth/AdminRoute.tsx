import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { ROUTES } from "../../lib/constants";

export default function AdminRoute() {
  const user = useAuthStore((s) => s.user);

  if (user?.role !== "admin" || user?.status !== "active") {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <Outlet />;
}
