import { useEffect, useState } from "react";
import {
  getSettings,
  updateSettings,
  type Settings as SettingsData,
} from "../api/settings";
import { isAdmin } from "../utils/auth";
import DashboardLayout from "../layout/DashboardLayout";
import Icon from "../components/Icons";
import WhatsAppConnectionCard from "../components/WhatsAppConnectionCard";

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const admin = isAdmin();

  useEffect(() => {
    let ignore = false;

    getSettings()
      .then((data) => {
        if (!ignore) setSettings(data);
      })
      .catch((err) => {
        console.error(err);
        if (!ignore) setError("Failed to load settings");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleSubmit = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setSaved(false);
      setError("");

      const updated = await updateSettings({
        businessName: settings.businessName,
        tagline: settings.tagline,
        phone: settings.phone,
        email: settings.email,
        address: settings.address,
        currencySymbol: settings.currencySymbol,
        currencyCode: settings.currencyCode,
        taxRate: settings.taxRate,
        invoiceFooter: settings.invoiceFooter,
        termsAndConditions: settings.termsAndConditions,
        whatsAppEnabled: settings.whatsAppEnabled,
        whatsAppPhoneNumberId: settings.whatsAppPhoneNumberId,
        whatsAppAccessToken: settings.whatsAppAccessToken,
        whatsAppMode: settings.whatsAppMode,
        whatsAppWelcomeTemplate: settings.whatsAppWelcomeTemplate,
        whatsAppInvoiceTemplate: settings.whatsAppInvoiceTemplate,
        whatsAppStatusTemplate: settings.whatsAppStatusTemplate,
        whatsAppProvider: settings.whatsAppProvider,
        whatsAppTestMode: settings.whatsAppTestMode,
        whatsAppTestNumber: settings.whatsAppTestNumber,
        whatsAppAutoWelcome: settings.whatsAppAutoWelcome,
        whatsAppAutoInvoice: settings.whatsAppAutoInvoice,
        whatsAppAutoStatus: settings.whatsAppAutoStatus,
      });

      setSettings(updated);
      setSaved(true);

      setTimeout(() => setSaved(false), 3000);
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
          : "Failed to save settings";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Settings</h1>
          <p>Business details used on invoices and reports</p>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading settings...</div>
      ) : error && !settings ? (
        <div className="empty-state">{error}</div>
      ) : !settings ? (
        <div className="empty-state">No settings available</div>
      ) : !admin ? (
        <div className="empty-state">Only administrators can edit settings</div>
      ) : (
        <>
          <div className="settings-card">
            {error && <div className="form-error">{error}</div>}
          {saved && <div className="form-success">Settings saved</div>}

          <div className="section-title">
            <h3>Business Information</h3>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Business Name</label>
              <input
                className="form-input"
                value={settings.businessName}
                onChange={(event) =>
                  setSettings({ ...settings, businessName: event.target.value })
                }
              />
            </div>

            <div className="form-field">
              <label>Tagline</label>
              <input
                className="form-input"
                value={settings.tagline}
                onChange={(event) =>
                  setSettings({ ...settings, tagline: event.target.value })
                }
              />
            </div>

            <div className="form-field">
              <label>Phone</label>
              <input
                className="form-input"
                value={settings.phone}
                onChange={(event) =>
                  setSettings({ ...settings, phone: event.target.value })
                }
              />
            </div>

            <div className="form-field">
              <label>Email</label>
              <input
                type="email"
                className="form-input"
                value={settings.email}
                onChange={(event) =>
                  setSettings({ ...settings, email: event.target.value })
                }
              />
            </div>
          </div>

          <div className="form-field">
            <label>Address</label>
            <input
              className="form-input"
              value={settings.address}
              onChange={(event) =>
                setSettings({ ...settings, address: event.target.value })
              }
            />
          </div>

          <div className="section-title">
            <h3>Invoice Preferences</h3>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Currency Symbol</label>
              <input
                className="form-input"
                value={settings.currencySymbol}
                onChange={(event) =>
                  setSettings({ ...settings, currencySymbol: event.target.value })
                }
              />
            </div>

            <div className="form-field">
              <label>Currency Code</label>
              <input
                className="form-input"
                value={settings.currencyCode}
                onChange={(event) =>
                  setSettings({ ...settings, currencyCode: event.target.value })
                }
              />
            </div>

            <div className="form-field">
              <label>Tax Rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className="form-input"
                value={settings.taxRate}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    taxRate: Number(event.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="form-field">
            <label>Invoice Footer</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={settings.invoiceFooter}
              onChange={(event) =>
                setSettings({ ...settings, invoiceFooter: event.target.value })
              }
            />
          </div>

          <div className="form-field">
            <label>Terms & Conditions</label>
            <textarea
              className="form-textarea"
              rows={6}
              placeholder={"One condition per line"}
              value={settings.termsAndConditions ?? ""}
              onChange={(event) =>
                setSettings({ ...settings, termsAndConditions: event.target.value })
              }
            />
            <p className="form-hint">Printed on invoices, one line per condition.</p>
          </div>

          <div className="section-title">
            <h3>WhatsApp Notifications</h3>
          </div>

          <div className="form-field form-check">
            <label>
              <input
                type="checkbox"
                checked={settings.whatsAppEnabled}
                onChange={(event) =>
                  setSettings({ ...settings, whatsAppEnabled: event.target.checked })
                }
              />
              Enable WhatsApp messages
            </label>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Provider</label>
              <select
                className="form-input"
                value={settings.whatsAppProvider ?? "webjs"}
                onChange={(event) =>
                  setSettings({ ...settings, whatsAppProvider: event.target.value })
                }
              >
                <option value="webjs">Web client (whatsapp-web.js)</option>
                <option value="cloudapi">Meta Cloud API</option>
              </select>
              <p className="form-hint">
                Web client uses the Node WhatsApp service and a QR scan. Cloud
                API uses the Phone Number ID / token above.
              </p>
            </div>

            <div className="form-field">
              <label>Phone Number ID</label>
              <input
                className="form-input"
                value={settings.whatsAppPhoneNumberId ?? ""}
                onChange={(event) =>
                  setSettings({ ...settings, whatsAppPhoneNumberId: event.target.value })
                }
              />
            </div>

            <div className="form-field">
              <label>Access Token</label>
              <input
                type="password"
                className="form-input"
                value={settings.whatsAppAccessToken ?? ""}
                onChange={(event) =>
                  setSettings({ ...settings, whatsAppAccessToken: event.target.value })
                }
              />
            </div>
          </div>

          <div className="form-field">
            <label>Message Mode</label>
            <select
              className="form-input"
              value={settings.whatsAppMode ?? "FREE_FORM"}
              onChange={(event) =>
                setSettings({ ...settings, whatsAppMode: event.target.value })
              }
            >
              <option value="FREE_FORM">Free-form text</option>
              <option value="TEMPLATE">Approved templates</option>
            </select>
            <p className="form-hint">
              Free-form works inside WhatsApp&apos;s 24-hour customer window. Use
              approved templates for messages outside it (Cloud API only).
            </p>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Welcome Template Name</label>
              <input
                className="form-input"
                value={settings.whatsAppWelcomeTemplate ?? ""}
                onChange={(event) =>
                  setSettings({ ...settings, whatsAppWelcomeTemplate: event.target.value })
                }
              />
            </div>

            <div className="form-field">
              <label>Invoice Template Name</label>
              <input
                className="form-input"
                value={settings.whatsAppInvoiceTemplate ?? ""}
                onChange={(event) =>
                  setSettings({ ...settings, whatsAppInvoiceTemplate: event.target.value })
                }
              />
            </div>

            <div className="form-field">
              <label>Status Template Name</label>
              <input
                className="form-input"
                value={settings.whatsAppStatusTemplate ?? ""}
                onChange={(event) =>
                  setSettings({ ...settings, whatsAppStatusTemplate: event.target.value })
                }
              />
            </div>
          </div>

          <div className="form-field form-check">
            <label>
              <input
                type="checkbox"
                checked={settings.whatsAppTestMode ?? true}
                onChange={(event) =>
                  setSettings({ ...settings, whatsAppTestMode: event.target.checked })
                }
              />
              Test mode (redirect notifications to a test number)
            </label>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Test Number</label>
              <input
                className="form-input"
                placeholder="+91 98765 43210"
                value={settings.whatsAppTestNumber ?? ""}
                onChange={(event) =>
                  setSettings({ ...settings, whatsAppTestNumber: event.target.value })
                }
              />
              <p className="form-hint">
                When test mode is on, every automatic message goes to this
                number instead of the customer number.
              </p>
            </div>
          </div>

          <div className="section-title">
            <h3>Automatic Notifications</h3>
          </div>
          <p className="form-hint">
            All automatic notifications are OFF by default. Turn them on when
            you are ready to contact real customers. Test mode (above) still
            redirects them to the test number.
          </p>
          <div className="form-field form-check">
            <label>
              <input
                type="checkbox"
                checked={settings.whatsAppAutoWelcome ?? false}
                onChange={(event) =>
                  setSettings({ ...settings, whatsAppAutoWelcome: event.target.checked })
                }
              />
              Send welcome message when a customer is added
            </label>
          </div>
          <div className="form-field form-check">
            <label>
              <input
                type="checkbox"
                checked={settings.whatsAppAutoInvoice ?? false}
                onChange={(event) =>
                  setSettings({ ...settings, whatsAppAutoInvoice: event.target.checked })
                }
              />
              Send a text invoice when an order is created
            </label>
          </div>
          <div className="form-field form-check">
            <label>
              <input
                type="checkbox"
                checked={settings.whatsAppAutoStatus ?? false}
                onChange={(event) =>
                  setSettings({ ...settings, whatsAppAutoStatus: event.target.checked })
                }
              />
              Send automatic status updates (wash schedule Day 1-4)
            </label>
          </div>
          <p className="form-hint">
            When auto status updates are enabled, customers receive updates as
            the order advances (Day 1 wash, Day 2 dry, Day 3 iron, Day 4 ready).
          </p>

          <div className="settings-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>

          <div className="settings-note">
            <Icon name="info" size={16} />
            <span>
              Changes apply to newly generated invoices. Tax rate is applied as a
              percentage of the order subtotal.
            </span>
          </div>
          </div>

          <WhatsAppConnectionCard />
        </>
      )}
    </DashboardLayout>
  );
}
