import type { OrderResponse, ApiError } from "../../types/api";
import { formatPrice } from "../../lib/utils";
import { useUiStore } from "../../stores/uiStore";
import StatusBadge from "./StatusBadge";
import StatusTimeline from "./StatusTimeline";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { useState } from "react";
import { AxiosError } from "axios";

interface OrderDetailProps {
  order: OrderResponse;
  onBack: () => void;
  onRefund?: (note: string) => Promise<void>;
  onApproveRefund?: () => Promise<void>;
  onDenyRefund?: (note: string) => Promise<void>;
}

export default function OrderDetail({
  order,
  onBack,
  onRefund,
  onApproveRefund,
  onDenyRefund,
}: OrderDetailProps) {
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundNote, setRefundNote] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);
  const [denyNote, setDenyNote] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isDenying, setIsDenying] = useState(false);
  const addToast = useUiStore((s) => s.addToast);

  const handleRefund = async () => {
    if (!onRefund || !refundNote.trim()) return;

    setIsRefunding(true);
    try {
      await onRefund(refundNote.trim());
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      addToast(
        axiosError.response?.data?.message ?? "Failed to process refund",
        "error",
      );
    } finally {
      setIsRefunding(false);
    }
  };

  const handleApprove = async () => {
    if (!onApproveRefund) return;
    setIsApproving(true);
    try {
      await onApproveRefund();
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      addToast(
        axiosError.response?.data?.message ?? "Failed to approve refund",
        "error",
      );
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeny = async () => {
    if (!onDenyRefund) return;
    setIsDenying(true);
    try {
      await onDenyRefund(denyNote.trim());
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      addToast(
        axiosError.response?.data?.message ?? "Failed to deny refund",
        "error",
      );
    } finally {
      setIsDenying(false);
    }
  };

  const customerRefundNote = order.statusHistory
    .find((h) => h.status === "refund_pending")?.note;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          &larr; Back
        </Button>
        <h2 className="text-lg font-semibold text-gray-900">
          Order {order.id.slice(0, 8)}...
        </h2>
        <StatusBadge status={order.status} />
      </div>

      {order.user && (
        <Card className="p-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">Customer:</span>{" "}
            {order.user.firstName} {order.user.lastName} ({order.user.email})
          </p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-4 font-semibold text-gray-900">Items</h3>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-3"
              >
                <img
                  src={item.previewUrl}
                  alt={item.name}
                  className="h-12 w-12 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {item.name}
                  </p>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatPrice(item.unitPrice)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="flex justify-between font-semibold text-gray-900">
              <span>Total</span>
              <span>{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 font-semibold text-gray-900">Status History</h3>
          <StatusTimeline history={order.statusHistory} />
        </Card>
      </div>

      {order.payment && (
        <Card className="p-6">
          <h3 className="mb-2 font-semibold text-gray-900">Payment</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Amount: {formatPrice(order.payment.amount)}</p>
            <p>Status: {order.payment.status}</p>
            <p>Provider: {order.payment.provider}</p>
          </div>
        </Card>
      )}

      {(onApproveRefund || onDenyRefund) && (
        <Card className="p-6">
          <h3 className="mb-2 font-semibold text-gray-900">Refund Review</h3>
          {customerRefundNote && (
            <div className="mb-4 rounded-lg bg-orange-50 p-3">
              <p className="mb-1 text-xs font-medium text-orange-800">
                Customer&apos;s reason
              </p>
              <p className="text-sm text-orange-900">{customerRefundNote}</p>
            </div>
          )}
          {onDenyRefund && (
            <>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Reason for denial (optional)
              </label>
              <textarea
                className="mb-4 w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                rows={2}
                placeholder="Enter reason for denial..."
                value={denyNote}
                onChange={(e) => setDenyNote(e.target.value)}
              />
            </>
          )}
          <div className="flex gap-2">
            {onApproveRefund && (
              <Button
                variant="outline"
                size="sm"
                isLoading={isApproving}
                onClick={handleApprove}
              >
                Approve Refund
              </Button>
            )}
            {onDenyRefund && (
              <Button
                variant="danger"
                size="sm"
                isLoading={isDenying}
                onClick={handleDeny}
              >
                Deny Refund
              </Button>
            )}
          </div>
        </Card>
      )}

      {onRefund && !showRefundForm && (
        <Button variant="danger" onClick={() => setShowRefundForm(true)}>
          Request Refund
        </Button>
      )}

      {onRefund && showRefundForm && (
        <Card className="p-6">
          <h3 className="mb-2 font-semibold text-gray-900">Request Refund</h3>
          <p className="mb-3 text-sm text-gray-600">
            Please provide a reason for your refund request.
          </p>
          <textarea
            className="mb-4 w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            rows={3}
            placeholder="Why are you requesting a refund?"
            value={refundNote}
            onChange={(e) => setRefundNote(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="sm"
              isLoading={isRefunding}
              disabled={!refundNote.trim()}
              onClick={handleRefund}
            >
              Submit Refund Request
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowRefundForm(false);
                setRefundNote("");
              }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
