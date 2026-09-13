import { useEffect, useRef, useState } from "react";
import Icon from "./Icons";
import {
  type DataFormat,
  type DataResource,
  downloadExport,
  downloadTemplate,
  importData,
} from "../api/dataIO";

interface Props {
  resource: DataResource;
  importable?: boolean;
  onImported?: () => void;
}

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (
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
  ) {
    return err.response.data.message;
  }
  return fallback;
};

export default function ImportExportButtons({
  resource,
  importable = true,
  onImported,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const close = () => setMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const run = async (task: () => Promise<void>, errorMessage: string) => {
    setBusy(true);
    try {
      await task();
    } catch (err) {
      console.error(err);
      alert(errorMessage);
    } finally {
      setBusy(false);
    }
  };

  const handleExport = (format: DataFormat) => {
    setMenuOpen(false);
    return run(() => downloadExport(resource, format), "Failed to export data");
  };

  const handleTemplate = (format: DataFormat) => {
    setMenuOpen(false);
    return run(
      () => downloadTemplate(resource, format),
      "Failed to download template",
    );
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const format: DataFormat = /\.csv$/i.test(file.name) ? "csv" : "xlsx";
    setBusy(true);
    try {
      const result = await importData(resource, file, format);
      const message = [
        `${result.created} added`,
        `${result.updated} updated`,
        `${result.skipped} skipped`,
        ...(result.errors.length > 0
          ? [`${result.errors.length} row error(s)`]
          : []),
      ].join(", ");
      alert(`Import complete: ${message}`);
      onImported?.();
    } catch (err) {
      console.error(err);
      alert(getErrorMessage(err, "Failed to import data"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="data-io-buttons">
      {importable && (
        <>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name="upload" size={16} />
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv"
            style={{ display: "none" }}
            onChange={(event) => {
              void handleFile(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
          />
        </>
      )}

      <div className="data-io-menu">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={() => handleExport("xlsx")}
        >
          <Icon name="download" size={16} />
          Export
        </button>
        <button
          type="button"
          className="btn btn-secondary data-io-caret"
          disabled={busy}
          aria-label="More export options"
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((open) => !open);
          }}
        >
          <Icon name="chevron-down" size={16} />
        </button>

        {menuOpen && (
          <div className="data-io-dropdown" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => handleExport("xlsx")}>
              Export Excel (.xlsx)
            </button>
            <button type="button" onClick={() => handleExport("csv")}>
              Export CSV (.csv)
            </button>
            <div className="data-io-dropdown-sep" />
            <button type="button" onClick={() => handleTemplate("xlsx")}>
              Download template (.xlsx)
            </button>
            <button type="button" onClick={() => handleTemplate("csv")}>
              Download template (.csv)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}