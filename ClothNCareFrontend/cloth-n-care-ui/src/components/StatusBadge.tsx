import { ORDER_STATUSES } from "../types/order";

interface StatusBadgeProps {
  status: string;
}

const normalize = (status: string) =>
  status
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");

const isOrderStatus = (status: string) =>
  (ORDER_STATUSES as readonly string[]).includes(status);

export default function StatusBadge({ status }: StatusBadgeProps) {
  const value = normalize(status);
  const className = isOrderStatus(value)
    ? `badge status-${value}`
    : value === "PAID" || value === "PARTIAL" || value === "UNPAID"
      ? `badge pay-${value}`
      : "badge badge-slate";

  return (
    <span className={className}>
      <span className="badge-dot" />
      {status}
    </span>
  );
}
