import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getWhatsAppMessages,
  retryWhatsAppMessage,
  type WhatsAppMessage,
} from "../../api/whatsapp";
import ReportTable, { type Column } from "../../components/ReportTable";
import { formatDateTime } from "../../utils/format";

const CATEGORY_LABELS: Record<string, string> = {
  WELCOME: "Welcome",
  INVOICE: "Invoice",
  STATUS: "Status Update",
  MANUAL: "Manual",
  DOCUMENT: "Document",
};

const STATUS_TEXT: Record<string, string> = {
  QUEUED: "Queued",
  SENDING: "Sending",
  SENT: "Sent",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  SKIPPED: "Skipped",
};

const STATUS_OPTIONS = ["ALL", "SENT", "FAILED", "QUEUED", "SENDING", "CANCELLED", "SKIPPED"];

function statusClass(status: string): string {
  const css: Record<string, string> = {
    SENT: "status-RECEIVED",
    FAILED: "status-CANCELLED",
    CANCELLED: "status-CANCELLED",
    SKIPPED: "badge-slate",
    QUEUED: "status-PROCESSING",
    SENDING: "status-PROCESSING",
  };
  const mapped = css[status.toUpperCase()];
  return mapped && mapped !== "badge-slate"
    ? `badge ${mapped}`
    : "badge badge-slate";
}

export default function WhatsAppHistoryReport() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [retrying, setRetrying] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(() => {
    getWhatsAppMessages({ status: statusFilter === "ALL" ? undefined : statusFilter })
      .then(setMessages)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load, refreshKey]);

  const handleRetry = async (id: string) => {
    setRetrying(id);
    try {
      await retryWhatsAppMessage(id);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setRetrying("");
    }
  };

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return messages;
    return messages.filter(
      (message) =>
        message.toPhone.toLowerCase().includes(term) ||
        (message.body ?? "").toLowerCase().includes(term) ||
        (message.category ?? "").toLowerCase().includes(term) ||
        (message.customerName ?? "").toLowerCase().includes(term) ||
        (message.invoiceId ?? "").toLowerCase().includes(term),
    );
  }, [messages, query]);

  const stats = useMemo(() => {
    const sent = messages.filter((m) => m.status === "SENT").length;
    const failed = messages.filter((m) => m.status === "FAILED").length;
    const skipped = messages.filter((m) => m.status === "SKIPPED").length;
    const pending =
      messages.filter((m) => m.status === "QUEUED" || m.status === "SENDING").length +
      messages.filter((m) => m.status === "CANCELLED").length;
    return { total: messages.length, sent, failed, skipped, pending };
  }, [messages]);

  const columns: Column<WhatsAppMessage>[] = [
    {
      key: "time",
      header: "Sent At",
      className: "cell-muted",
      render: (row) => formatDateTime(row.sentAt),
    },
    { key: "phone", header: "Phone", render: (row) => <strong>{row.toPhone}</strong> },
    {
      key: "customer",
      header: "Customer",
      className: "cell-muted",
      render: (row) => row.customerName ?? "—",
    },
    {
      key: "category",
      header: "Category",
      render: (row) => CATEGORY_LABELS[row.category] ?? row.category ?? "—",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span className={statusClass(row.status)}>
          <span className="badge-dot" />
          {STATUS_TEXT[row.status] ?? row.status}
        </span>
      ),
    },
    {
      key: "attempts",
      header: "Attempts",
      className: "cell-muted",
      render: (row) => (row.attemptCount ?? 0) || "—",
    },
    {
      key: "reason",
      header: "Reason",
      className: "cell-muted",
      render: (row) =>
        row.failureReason ? (
          <span title={row.failureReason}>{row.failureReason}</span>
        ) : (
          "—"
        ),
    },
    {
      key: "message",
      header: "Message",
      render: (row) => (
        <span className="muted" title={row.body}>
          {row.body}
        </span>
      ),
    },
    {
      key: "action",
      header: "",
      render: (row) =>
        row.status === "FAILED" || row.status === "CANCELLED" ? (
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            disabled={retrying === row.id}
            onClick={() => handleRetry(row.id)}
          >
            {retrying === row.id ? "Retrying…" : "Retry"}
          </button>
        ) : null,
    },
  ];

  if (loading) return <div className="empty-state">Loading WhatsApp messages...</div>;

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-card-top">
            <span className="stat-card-label">Total Messages</span>
          </div>
          <div className="stat-card-value">{stats.total}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-card-top">
            <span className="stat-card-label">Sent</span>
          </div>
          <div className="stat-card-value">{stats.sent}</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-card-top">
            <span className="stat-card-label">Pending / Failed</span>
          </div>
          <div className="stat-card-value">{stats.pending + stats.failed}</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-card-top">
            <span className="stat-card-label">Skipped</span>
          </div>
          <div className="stat-card-value">{stats.skipped}</div>
        </div>
      </div>

      <div className="toolbar-row">
        <input
          className="form-input"
          placeholder="Search by phone, message, customer, invoice..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="form-input filter-select"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status === "ALL" ? "All statuses" : STATUS_TEXT[status]}
            </option>
          ))}
        </select>
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        empty="No WhatsApp messages found"
      />
    </>
  );
}