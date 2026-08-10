import { useEffect, useState } from "react";
import {
  getSettings,
  updateSettings,
  type Settings as SettingsData,
} from "../api/settings";
import { isAdmin } from "../utils/auth";
import DashboardLayout from "../layout/DashboardLayout";
import Icon from "../components/Icons";

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
      )}
    </DashboardLayout>
  );
}
