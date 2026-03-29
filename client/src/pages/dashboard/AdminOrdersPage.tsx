import OrderManagement from "../../components/admin/OrderManagement";

export default function AdminOrdersPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Manage Orders</h1>
      <OrderManagement />
    </div>
  );
}
