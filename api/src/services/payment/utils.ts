type PaymentRecord = {
  id: string;
  orderId: string;
  amount: { toString(): string } | number;
  status: string;
  provider: string;
  providerReference: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PaymentResponse = {
  id: string;
  orderId: string;
  amount: number;
  status: string;
  provider: string;
  providerReference: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function formatPayment(payment: PaymentRecord): PaymentResponse {
  return {
    id: payment.id,
    orderId: payment.orderId,
    amount: Number(payment.amount),
    status: payment.status,
    provider: payment.provider,
    providerReference: payment.providerReference,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}
