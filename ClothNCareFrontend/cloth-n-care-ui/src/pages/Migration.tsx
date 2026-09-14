import { useEffect, useRef, useState } from "react";
import {
  dryRunLocal,
  dryRunWithFiles,
  executeLocal,
  executeWithFiles,
  getMigrationStatus,
  type DryRunReport,
  type ExecutionResult,
  type MigrationStatus,
} from "../api/migration";
import DashboardLayout from "../layout/DashboardLayout";
import Icon from "../components/Icons";
import { isAdmin } from "../utils/auth";

function StatCard({
  label,
  value,
  footer,
  tone = "teal",
}: {
  label: string;
  value: string | number;
  footer?: string;
  tone?: "teal" | "primary" | "green" | "amber" | "red";
}) {
  const classByTone = {
    teal: "stat-card stat-teal",
    primary: "stat-card stat-primary",
    green: "stat-card stat-success",
    amber: "stat-card stat-warning",
    red: "stat-card stat-danger",
  } as const;
  return (
    <div className={classByTone[tone]}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {footer && <div className="stat-footer">{footer}</div>}
    </div>
  );
}

function IssueTable({
  title,
  headers,
  empty,
  rows,
}: {
  title: string;
  headers: string[];
  empty: string;
  rows: React.ReactNode[];
}) {
  return (
    <div className="table-card">
      <div className="card-title-row">
        <h3>{title}</h3>
      </div>
      {rows.length === 0 ? (
        <div className="table-empty">{empty}</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      )}
    </div>
  );
}

function MessageList({ title, items, tone }: { title: string; items: string[]; tone: "warning" | "error" }) {
  if (items.length === 0) return null;
  return (
    <div className={`table-card ${tone === "error" ? "card-error" : ""}`}>
      <div className="card-title-row">
        <h3>{title}</h3>
        <span className={`badge ${tone === "error" ? "badge-red" : "badge-amber"}`}>
          {items.length}
        </span>
      </div>
      <ul className="message-list">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ReportSection({ report }: { report: DryRunReport }) {
  const { counts, reconciliation, sourceFiles } = report;

  const money = (value?: number) =>
    value == null ? "-" : value.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

  return (
    <div className="stack">
      <div className="stats-grid">
        <StatCard label="Booked Laundry" value={counts.bookedLaundryRows} tone="teal" />
        <StatCard label="Invoices" value={counts.invoicesFound} tone="primary" />
        <StatCard label="Order Detail Lines" value={counts.orderDetailRows} tone="primary" footer={`${counts.uniqueOrderNumbers} unique order numbers`} />
        <StatCard label="Unique Customers" value={counts.uniqueCustomers} tone="green" footer={`${counts.expensesFound} expenses, ${counts.paymentsFound} payments found`} />
      </div>

      <div className="stats-grid">
        <StatCard label="Matched" value={reconciliation.matched} tone="green" />
        <StatCard label="Booked Only" value={reconciliation.bookedOnly} tone="amber" footer={`${reconciliation.bookedOnlyInactive} inactive`} />
        <StatCard label="Invoice Only" value={reconciliation.invoiceOnly} tone="red" />
        <StatCard label="Detail Only (orphans)" value={reconciliation.detailOnly} tone="red" />
      </div>

      <div className="table-card">
        <div className="card-title-row">
          <h3>Source Files</h3>
        </div>
        <table className="data-table">
          <tbody>
            <tr>
              <td>Booked Laundry</td>
              <td>{sourceFiles.bookedLaundry || "-"}</td>
            </tr>
            <tr>
              <td>Invoices</td>
              <td>{sourceFiles.invoices || "-"}</td>
            </tr>
            <tr>
              <td>Order Details</td>
              <td>{sourceFiles.orderDetails || "-"}</td>
            </tr>
            <tr>
              <td>Expenses</td>
              <td>{sourceFiles.expenses || "-"}</td>
            </tr>
            <tr>
              <td>Payments (received)</td>
              <td>{sourceFiles.payments || "-"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="stats-grid">
        <StatCard label="Invoice Range" value={`${report.invoiceNumberMin} – ${report.invoiceNumberMax}`} tone="primary" />
        <StatCard label="Recommended Counter" value={report.recommendedInvoiceCounter} tone="green" footer="next invoice starts after this" />
        <StatCard label="Orders With Details" value={reconciliation.ordersWithDetails} tone="teal" />
        <StatCard label="Orders Without Details" value={reconciliation.ordersWithoutDetails} tone="amber" />
      </div>

      <div className="stats-grid">
        <StatCard label="Duplicate Invoices" value={report.duplicateInvoiceCount} tone="red" />
        <StatCard label="Missing Phones" value={report.missingPhoneNumbers} tone="amber" />
        <StatCard label="Invalid Dates" value={report.invalidDates} tone="amber" />
        <StatCard label="Invalid Numbers" value={report.invalidNumberCount} tone="amber" />
      </div>

      <MessageList title="Warnings" items={report.warnings} tone="warning" />
      <MessageList title="Errors" items={report.errors} tone="error" />

      {report.duplicateCustomers.length > 0 && (
        <div className="table-card">
          <div className="card-title-row">
            <h3>Duplicate Customers</h3>
            <span className="badge badge-amber">{report.duplicateCustomers.length}</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Phone</th>
                <th>Names</th>
                <th>Source Records</th>
              </tr>
            </thead>
            <tbody>
              {report.duplicateCustomers.map((group) => (
                <tr key={group.normalizedPhone}>
                  <td style={{ fontWeight: 700 }}>{group.displayPhone || group.normalizedPhone}</td>
                  <td>{group.names.join(", ")}</td>
                  <td className="cell-muted">{group.sourceRecords}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <IssueTable
        title="Orphan Order Details"
        headers={["Order Number"]}
        empty="No orphan details"
        rows={report.orphanDetails.map((orderNo) => (
          <tr key={orderNo}>
            <td style={{ fontWeight: 700 }}>{orderNo}</td>
          </tr>
        ))}
      />

      {report.unmatchedProducts.length > 0 && (
        <div className="table-card">
          <div className="card-title-row">
            <h3>Unmatched Products</h3>
            <span className="badge badge-amber">{report.unmatchedProducts.length}</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Service</th>
                <th>Lines</th>
              </tr>
            </thead>
            <tbody>
              {report.unmatchedProducts.map((product) => (
                <tr key={`${product.productName}-${product.service}`}>
                  <td style={{ fontWeight: 700 }}>{product.productName}</td>
                  <td>{product.service}</td>
                  <td className="cell-muted">{product.lineCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report.unknownStatuses.length > 0 && (
        <IssueTable
          title="Unknown Statuses"
          headers={["Status"]}
          empty="None"
          rows={report.unknownStatuses.map((status) => (
            <tr key={status}>
              <td style={{ fontWeight: 700 }}>{status}</td>
            </tr>
          ))}
        />
      )}

      {report.unknownServices.length > 0 && (
        <IssueTable
          title="Unknown Services"
          headers={["Service"]}
          empty="None"
          rows={report.unknownServices.map((service) => (
            <tr key={service}>
              <td style={{ fontWeight: 700 }}>{service}</td>
            </tr>
          ))}
        />
      )}

      {report.invalidQuantities.length > 0 && (
        <div className="table-card">
          <div className="card-title-row">
            <h3>Invalid Quantities</h3>
            <span className="badge badge-red">{report.invalidQuantities.length}</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {report.invalidQuantities.map((issue, index) => (
                <tr key={index}>
                  <td style={{ fontWeight: 700 }}>{issue.orderNo || "-"}</td>
                  <td>{issue.productName || "-"}</td>
                  <td>{issue.quantity?.toString() ?? "-"}</td>
                  <td className="cell-muted">{issue.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report.invalidPrices.length > 0 && (
        <div className="table-card">
          <div className="card-title-row">
            <h3>Invalid Prices</h3>
            <span className="badge badge-red">{report.invalidPrices.length}</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Product</th>
                <th>Price</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {report.invalidPrices.map((issue, index) => (
                <tr key={index}>
                  <td style={{ fontWeight: 700 }}>{issue.orderNo || "-"}</td>
                  <td>{issue.productName || "-"}</td>
                  <td>{money(issue.price)}</td>
                  <td className="cell-muted">{issue.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report.lineTotalMismatches.length > 0 && (
        <div className="table-card">
          <div className="card-title-row">
            <h3>Line Total Mismatches</h3>
            <span className="badge badge-red">{report.lineTotalMismatches.length}</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Product</th>
                <th>Qty × Price</th>
                <th>Source Total</th>
              </tr>
            </thead>
            <tbody>
              {report.lineTotalMismatches.map((issue, index) => (
                <tr key={index}>
                  <td style={{ fontWeight: 700 }}>{issue.orderNo || "-"}</td>
                  <td>{issue.productName || "-"}</td>
                  <td>
                    {issue.quantity?.toString() ?? "-"} × {money(issue.price)}
                  </td>
                  <td className="cell-total">{money(issue.sourceTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report.invoiceTotalMismatches.length > 0 && (
        <div className="table-card">
          <div className="card-title-row">
            <h3>Invoice Total Mismatches</h3>
            <span className="badge badge-red">{report.invoiceTotalMismatches.length}</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Items</th>
                <th>Discount</th>
                <th>Addn Charges</th>
                <th>Expected</th>
                <th>Source Total</th>
              </tr>
            </thead>
            <tbody>
              {report.invoiceTotalMismatches.map((mismatch, index) => (
                <tr key={index}>
                  <td style={{ fontWeight: 700 }}>{mismatch.orderNo}</td>
                  <td>{money(mismatch.itemsTotal)}</td>
                  <td>{money(mismatch.discount)}</td>
                  <td>{money(mismatch.additionalCharges)}</td>
                  <td>{money(mismatch.expectedTotal)}</td>
                  <td className="cell-total">{money(mismatch.sourceTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report.statusMappings.length > 0 && (
        <div className="table-card">
          <div className="card-title-row">
            <h3>Status Mapping</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Target</th>
                <th>Rows</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {report.statusMappings.map((mapping, index) => (
                <tr key={index}>
                  <td style={{ fontWeight: 700 }}>{mapping.source}</td>
                  <td>
                    <span className="badge badge-blue">{mapping.target}</span>
                  </td>
                  <td className="cell-muted">{mapping.rows}</td>
                  <td className="cell-muted">{mapping.note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ExecutionSection({ result }: { result: ExecutionResult }) {
  return (
    <div className="stack">
      <div className="stats-grid">
        <StatCard label="Customers Created" value={result.customersCreated} tone="green" footer={`${result.customersMatched} already matched`} />
        <StatCard label="Orders Created" value={result.ordersCreated} tone="primary" footer={`${result.ordersSkipped} skipped`} />
        <StatCard label="Order Items Created" value={result.orderItemsCreated} tone="teal" footer={`${result.orphanDetailsSkipped} orphan details skipped`} />
        <StatCard label="Expenses Created" value={result.expensesCreated} tone="green" footer={`${result.expensesSkipped} skipped`} />
        <StatCard label="Payments Imported" value={result.paymentsCreated} tone="amber" footer={`${result.paymentsSkipped} skipped, ${result.paymentsUnmatched} unmatched`} />
      </div>

      <div className="table-card">
        <div className="card-title-row">
          <h3>Import Result</h3>
          <span className="badge badge-green">Complete</span>
        </div>
        <table className="data-table">
          <tbody>
            <tr>
              <td>Completed At</td>
              <td>{result.completedAt}</td>
            </tr>
            <tr>
              <td>Invoice Counter</td>
              <td style={{ fontWeight: 700 }}>{result.invoiceCounterUpdatedTo}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <MessageList title="Warnings" items={result.warnings} tone="warning" />
      <MessageList title="Errors" items={result.errors} tone="error" />
    </div>
  );
}

export default function MigrationPage() {
  const admin = isAdmin();
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [report, setReport] = useState<DryRunReport | null>(null);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<{
    booked?: File;
    invoices?: File;
    orderDetails?: File;
    expenses?: File;
    payments?: File;
  }>({});
  const bookedRef = useRef<HTMLInputElement>(null);
  const invoicesRef = useRef<HTMLInputElement>(null);
  const orderDetailsRef = useRef<HTMLInputElement>(null);
  const expensesRef = useRef<HTMLInputElement>(null);
  const paymentsRef = useRef<HTMLInputElement>(null);

  const loadStatus = () => {
    getMigrationStatus()
      .then(setStatus)
      .catch((err) => {
        console.error(err);
        setError("Failed to load migration status");
      });
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const run = async (operation: () => Promise<DryRunReport | ExecutionResult>, isExecute: boolean) => {
    if (isExecute && !window.confirm("Run the Swash import now? This writes to the live database and creates a backup first.")) {
      return;
    }
    setBusy(true);
    setError("");
    setReport(null);
    setResult(null);
    try {
      const output = await operation();
      if (isExecute) {
        setResult(output as ExecutionResult);
      } else {
        setReport(output as DryRunReport);
      }
      loadStatus();
    } catch (err: unknown) {
      console.error(err);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Operation failed");
    } finally {
      setBusy(false);
    }
  };

  const hasUploaded = Boolean(files.booked || files.invoices || files.orderDetails || files.expenses || files.payments);
  const allUploaded = Boolean(files.booked && files.invoices && files.orderDetails && files.expenses && files.payments);

  const pickFile =
    (key: keyof typeof files) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      setFiles((current) => ({ ...current, [key]: file }));
    };

  const runWithUploads = (isExecute: boolean) => {
    if (!allUploaded) {
      setError("All five files are required for an upload-based run. Otherwise use the swash-data directory.");
      return;
    }
    void run(
      isExecute
        ? () => executeWithFiles(files)
        : () => dryRunWithFiles(files),
      isExecute,
    );
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Data Migration</h1>
          <p>Swash → ClothNCare import service</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void run(dryRunLocal, false)}
          >
            <Icon name="search" size={16} />
            {busy && !result && !report ? "Working..." : "Dry Run (swash-data)"}
          </button>
          {admin && (
            <button
              type="button"
              className="btn btn-danger"
              disabled={busy}
              onClick={() => void run(executeLocal, true)}
            >
              <Icon name="check" size={16} />
              {busy && !result && !report ? "Importing..." : "Run Import (swash-data)"}
            </button>
          )}
          {!admin && <span className="badge badge-slate">Import requires ADMIN</span>}
        </div>
      </div>

          <div className="table-card">
            <div className="card-title-row">
              <h3>Upload Files Instead</h3>
              <span className="badge badge-slate">optional</span>
            </div>
            <div className="form-grid">
              <label className="form-field">
                <span>Booked Laundry CSV</span>
                <input
                  ref={bookedRef}
                  type="file"
                  accept=".csv"
                  className="form-input"
                  onChange={pickFile("booked")}
                />
              </label>
              <label className="form-field">
                <span>Invoices CSV</span>
                <input
                  ref={invoicesRef}
                  type="file"
                  accept=".csv"
                  className="form-input"
                  onChange={pickFile("invoices")}
                />
              </label>
              <label className="form-field">
                <span>Order Details CSV</span>
                <input
                  ref={orderDetailsRef}
                  type="file"
                  accept=".csv"
                  className="form-input"
                  onChange={pickFile("orderDetails")}
                />
              </label>
              <label className="form-field">
                <span>Expenses CSV</span>
                <input
                  ref={expensesRef}
                  type="file"
                  accept=".csv"
                  className="form-input"
                  onChange={pickFile("expenses")}
                />
              </label>
              <label className="form-field">
                <span>Payments (received) CSV</span>
                <input
                  ref={paymentsRef}
                  type="file"
                  accept=".csv"
                  className="form-input"
                  onChange={pickFile("payments")}
                />
              </label>
            </div>
            <div className="flex-row" style={{ gap: 10, marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy || !allUploaded}
                onClick={() => runWithUploads(false)}
              >
                <Icon name="upload" size={16} />
                Dry Run Uploads
              </button>
              {admin && (
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={busy || !allUploaded}
                  onClick={() => runWithUploads(true)}
                >
                  <Icon name="upload" size={16} />
                  Import Uploads
                </button>
              )}
              {hasUploaded && !allUploaded && (
                <span className="badge badge-amber">All 5 files required</span>
              )}
            </div>
          </div>

      {error && <div className="empty-state">{error}</div>}

      {status && (
        <div className="stats-grid">
          <StatCard label="Orders Imported" value={status.invoicesImported} tone="teal" />
          <StatCard label="Customers Imported" value={status.customersImported} tone="primary" />
          <StatCard label="Expenses Imported" value={status.expensesImported} tone="green" />
          <StatCard label="Payments Imported" value={status.paymentsImported} tone="amber" />
          <StatCard label="Ledger Entries" value={status.totalLedgerEntries} tone="primary" />
        </div>
      )}

      {busy && <div className="empty-state">Working...</div>}

      {report && (
        <>
          <div className="card-title-row">
            <h3>
              Dry Run Report{" "}
              <span className="badge badge-blue">{new Date(report.generatedAt).toLocaleString()}</span>
            </h3>
          </div>
          <ReportSection report={report} />
        </>
      )}

      {result && <ExecutionSection result={result} />}
    </DashboardLayout>
  );
}