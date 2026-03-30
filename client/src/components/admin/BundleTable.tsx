import type { BundleResponse } from "../../types/api";
import Badge from "../ui/Badge";
import Button from "../ui/Button";

interface BundleTableProps {
  bundles: BundleResponse[];
  onEdit: (bundle: BundleResponse) => void;
}

export default function BundleTable({ bundles, onEdit }: BundleTableProps) {
  if (bundles.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">No bundles yet.</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 text-gray-500">
          <tr>
            <th className="pb-3 font-medium">Bundle</th>
            <th className="pb-3 font-medium">Discount</th>
            <th className="pb-3 font-medium">Products</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bundles.map((bundle) => (
            <tr key={bundle.id} className="border-b border-gray-100">
              <td className="py-3">
                <p className="font-medium text-gray-900">{bundle.name}</p>
                <p className="text-xs text-gray-400">{bundle.slug}</p>
              </td>
              <td className="py-3">
                {bundle.discountPercent ? (
                  <Badge className="bg-green-100 text-green-800">
                    -{bundle.discountPercent}%
                  </Badge>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="py-3">
                <span className="text-gray-700">{bundle.products.length}</span>
              </td>
              <td className="py-3">
                <Badge
                  className={
                    bundle.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }
                >
                  {bundle.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="py-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(bundle)}
                >
                  Edit
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
