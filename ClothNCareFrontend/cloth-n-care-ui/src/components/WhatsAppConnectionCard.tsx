import { useEffect, useRef, useState } from "react";
import {
  connectWhatsApp,
  getWhatsAppConnectionStatus,
  logoutWhatsApp,
  reconnectWhatsApp,
  sendWhatsAppMessage,
  type WhatsAppConnectionStatus,
} from "../api/whatsapp";

const STATE_LABELS: Record<string, string> = {
  NOT_CONFIGURED: "Not configured",
  CONNECTING: "Connecting…",
  QR_REQUIRED: "Scan to connect",
  CONNECTED: "Connected",
  DISCONNECTED: "Disconnected",
  AUTH_FAILURE: "Authentication failed",
  LOGGED_OUT: "Logged out",
  OFFLINE: "Service offline",
  ERROR: "Error",
};

export default function WhatsAppConnectionCard() {
  const [status, setStatus] = useState<WhatsAppConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [notice, setNotice] = useState("");

  const [testPhone, setTestPhone] = useState("");
  const [testBody, setTestBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState("");

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = () => {
    getWhatsAppConnectionStatus()
      .then(setStatus)
      .catch((err) => {
        console.error(err);
        setStatus(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    pollTimer.current = setInterval(refresh, 5000);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  const runAction = async (action: () => Promise<WhatsAppConnectionStatus>, label: string) => {
    setActing(true);
    setNotice("");
    try {
      setStatus(await action());
    } catch (err: unknown) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof err.response === "object" &&
        err.response !== null &&
        "data" in err.response &&
        typeof err.response.data === "object" &&
        err.response.data !== null &&
        "message" in err.response.data &&
        typeof err.response.data.message === "string"
          ? err.response.data.message
          : `Failed to ${label}`;
      setNotice(message);
    } finally {
      setActing(false);
    }
  };

  const handleTestSend = async () => {
    if (!testPhone.trim() || !testBody.trim()) return;
    setSending(true);
    setSendResult("");
    try {
      const result = await sendWhatsAppMessage(testPhone.trim(), testBody);
      setSendResult(
        result.success
          ? `Sent (status: ${result.status})`
          : `Not sent: ${result.message}`,
      );
      setTestBody("");
    } catch (err) {
      console.error(err);
      setSendResult("Request failed. Is the backend running?");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="empty-state">Loading connection status…</div>;

  const state = status?.state ?? "OFFLINE";
  const isWebJs = status?.provider === "webjs";
  const connected = status?.connected ?? false;
  const qrAvailable = state === "QR_REQUIRED" && Boolean(status?.qrDataUrl);

  return (
    <div className="settings-card">
      <div className="section-title">
        <h3>WhatsApp Connection</h3>
      </div>

      <div className="form-grid">
        <div className="form-field">
          <label>Provider</label>
          <div className="muted">{status?.provider === "webjs" ? "Web client (whatsapp-web.js)" : status?.provider ?? "—"}</div>
        </div>
        <div className="form-field">
          <label>State</label>
          <span className={`badge ${connected ? "status-RECEIVED" : "status-CANCELLED"}`}>
            <span className="badge-dot" />
            {STATE_LABELS[state] ?? state}
          </span>
        </div>

        {status?.businessNumber && (
          <div className="form-field">
            <label>Linked Number</label>
            <div className="muted">{status.businessNumber}</div>
          </div>
        )}

        {status?.lastConnectedAt && (
          <div className="form-field">
            <label>Last Connected</label>
            <div className="muted">{status.lastConnectedAt}</div>
          </div>
        )}
      </div>

      {status?.message && state !== "CONNECTED" && (
        <p className="form-hint">{status.message}</p>
      )}

      {qrAvailable && (
        <div className="form-field">
          <label>Scan this QR code with your WhatsApp to link the business phone</label>
          <img src={status!.qrDataUrl} alt="WhatsApp QR code" className="whatsapp-qr" />
        </div>
      )}

      {!isWebJs && (
        <p className="form-hint">
          Using the Meta Cloud API provider — no QR needed. Connect a phone by
          providing the Phone Number ID and Access Token in the settings above.
        </p>
      )}

      {notice && <div className="form-error">{notice}</div>}

      {isWebJs && (
        <div className="settings-actions">
          {!connected && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={acting}
              onClick={() => runAction(connectWhatsApp, "start WhatsApp")}
            >
              {acting ? "Working…" : "Start / Show QR"}
            </button>
          )}
          {connected && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={acting}
                onClick={() => runAction(reconnectWhatsApp, "reconnect WhatsApp")}
              >
                Reconnect
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={acting}
                onClick={() => runAction(logoutWhatsApp, "logout WhatsApp")}
              >
                Logout
              </button>
            </>
          )}
        </div>
      )}

      {isWebJs && (
        <div className="form-field mt-16">
          <label>Send a test message</label>
          <div className="form-grid">
            <div className="form-field">
              <input
                className="form-input"
                placeholder="Phone (e.g. +91 98765 43210)"
                value={testPhone}
                onChange={(event) => setTestPhone(event.target.value)}
              />
            </div>
            <div className="form-field">
              <input
                className="form-input"
                placeholder="Message body"
                value={testBody}
                onChange={(event) => setTestBody(event.target.value)}
              />
            </div>
          </div>
          <div className="settings-actions">
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              disabled={sending || !testPhone.trim() || !testBody.trim()}
              onClick={handleTestSend}
            >
              {sending ? "Sending…" : "Send test message"}
            </button>
            {sendResult && <span className="muted">{sendResult}</span>}
          </div>
        </div>
      )}
    </div>
  );
}