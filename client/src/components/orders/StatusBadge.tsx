import type { OrderStatus } from "../../types/api";
import { ORDER_STATUS_CONFIG } from "../../lib/constants";
import Badge from "../ui/Badge";

interface StatusBadgeProps {
  status: OrderStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = ORDER_STATUS_CONFIG[status];
  return <Badge className={config.color}>{config.label}</Badge>;
}
