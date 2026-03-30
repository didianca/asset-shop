import { useEffect, useState } from "react";
import type { BundleResponse } from "../../types/api";
import * as bundlesApi from "../../api/bundles.api";
import BundleTable from "../../components/admin/BundleTable";
import BundleForm from "../../components/admin/BundleForm";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Spinner from "../../components/ui/Spinner";

export default function AdminBundlesPage() {
  const [bundles, setBundles] = useState<BundleResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<BundleResponse | undefined>();

  const fetchBundles = async () => {
    setIsLoading(true);
    try {
      const res = await bundlesApi.getBundles();
      setBundles(res.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBundles();
  }, []);

  const handleCreate = () => {
    setEditingBundle(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (bundle: BundleResponse) => {
    setEditingBundle(bundle);
    setIsFormOpen(true);
  };

  const handleSuccess = () => {
    setIsFormOpen(false);
    setEditingBundle(undefined);
    fetchBundles();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Manage Bundles</h1>
        <Button onClick={handleCreate}>Create Bundle</Button>
      </div>

      <BundleTable bundles={bundles} onEdit={handleEdit} />

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingBundle ? "Edit Bundle" : "Create Bundle"}
      >
        <BundleForm
          bundle={editingBundle}
          onSuccess={handleSuccess}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>
    </div>
  );
}
