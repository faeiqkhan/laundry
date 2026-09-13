import { useEffect, useMemo, useState } from "react";
import { getWhatsAppMessages } from "../../api/whatsapp";
import ReportTable, { type Column } from "../../components/ReportTable";
import { formatDateTime } from "../../utils/format";

export interface WhatsAppRow {
  id: string;
  toPhone: string;
  category: string;
  status: string;
  body: string;
  templateName?: string;
  sentAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  CAT_WELCOME: "Welcome",
  CAT_INVOICE: "Invoice",
  CAT_STATUS: "Status Update",
};

const STATUS_CLASS: Record<string, string> = {
  SENT: "status-RECEIVED",
  FAILED: "status-CANCELLED",
  SKIPPED: "badge-slate",
};

function statusClass(status: string): string {
  const mapped = STATUS_CLASS[status.toUpperCase()];
  return mapped && mapped !== "badge-slate"
    ? `badge ${mapped}`
    : "badge badge-slate";
}

export default function WhatsAppHistoryReport() {
  const [messages, setMessages] = useState<WhatsAppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let ignore = false;

    getWhatsAppMessages()
      .then((data) => {
        if (!ignore) setMessages(data);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return messages;
    return messages.filter(
      (message) =>
        message.toPhone.toLowerCase().includes(term) ||
        message.body.toLowerCase().includes(term) ||
        (message.category ?? "").toLowerCase().includes(term),
    );
  }, [messages, query]);

  const stats = useMemo(() => {
    const sent = messages.filter((m) => m.status === "SENT").length;
    const failed = messages.filter((m) => m.status === "FAILED").length;
    const skipped = messages.filter((m) => m.status === "SKIPPED").length;
    return { total: messages.length, sent, failed, skipped };
  }, [messages]);

  const columns: Column<WhatsAppRow>[] = [
    {
      key: "time",
      header: "Sent At",
      className: "cell-muted",
      render: (row) => formatDateTime(row.sentAt),
    },
    { key: "phone", header: "Phone", render: (row) => <strong>{row.toPhone}</strong> },
    {
      key: "category",
      header: "Category",
      render: (row) => CATEGORY_LABELS[row.category] ?? row.category,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span className={statusClass(row.status)}>
          <span className="badge-dot" />
          {row.status}
        </span>
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
            <span className="stat-card-label">Skipped</span>
          </div>
          <div className="stat-card-value">{stats.skipped}</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-card-top">
            <span className="stat-card-label">Failed</span>
          </div>
          <div className="stat-card-value">{stats.failed}</div>
        </div>
      </div>

      <div className="toolbar-row">
        <input
          className="form-input"
          placeholder="Search by phone or message..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
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