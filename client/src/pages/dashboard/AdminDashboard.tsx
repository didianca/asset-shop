import { Link } from "react-router-dom";
import { ROUTES } from "../../lib/constants";
import Card from "../../components/ui/Card";

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Admin Dashboard
      </h1>
      <div className="grid gap-6 sm:grid-cols-2">
        <Link to={ROUTES.ADMIN_PRODUCTS}>
          <Card className="p-6 transition-shadow hover:shadow-md">
            <h2 className="text-lg font-semibold text-gray-900">Products</h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage products, pricing, and tags
            </p>
          </Card>
        </Link>
        <Link to={ROUTES.ADMIN_ORDERS}>
          <Card className="p-6 transition-shadow hover:shadow-md">
            <h2 className="text-lg font-semibold text-gray-900">Orders</h2>
            <p className="mt-1 text-sm text-gray-500">
              View and manage customer orders
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
