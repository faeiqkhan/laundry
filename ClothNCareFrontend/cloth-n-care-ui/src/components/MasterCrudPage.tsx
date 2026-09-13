import { useEffect, useMemo, useState, type ReactNode } from "react";
import Icon, { type IconName } from "./Icons";
import DashboardLayout from "../layout/DashboardLayout";
import ImportExportButtons from "./ImportExportButtons";
import type { DataResource } from "../api/dataIO";

export interface MasterColumn<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
}

interface Props<T extends { id: string }, P> {
  title: string;
  subtitle: (count: number) => string;
  columns: MasterColumn<T>[];
  icon: IconName;
  emptyMessage: string;
  searchKeys?: (keyof T & string)[];
  fetchAll: () => Promise<T[]>;
  create: (payload: P) => Promise<unknown>;
  update: (id: string, payload: P) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
  initialForm: () => P;
  toForm: (row: T) => P;
  renderFields: (
    form: P,
    setForm: (patch: Partial<P>) => void,
    isEditing: boolean,
  ) => ReactNode;
  validate?: (form: P) => string | null;
  deleteMessage?: (row: T) => string;
  resource?: DataResource;
  importable?: boolean;
}

export default function MasterCrudPage<T extends { id: string }, P>({
  title,
  subtitle,
  columns,
  icon,
  emptyMessage,
  searchKeys = [],
  fetchAll,
  create,
  update,
  remove,
  initialForm,
  toForm,
  renderFields,
  validate,
  deleteMessage,
  resource,
  importable = true,
}: Props<T, P>) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [search, setSearch] = useState("");

  const fetchRows = async () => {
    const data = await fetchAll();
    setRows(data);
  };

  useEffect(() => {
    let ignore = false;

    fetchAll()
      .then((data) => {
        if (!ignore) setRows(data);
      })
      .catch((error) => console.error(error))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [fetchAll]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      searchKeys.some((key) => {
        const value = row[key];
        return typeof value === "string" && value.toLowerCase().includes(term);
      }),
    );
  }, [rows, search, searchKeys]);

  const handleDelete = async (row: T) => {
    const message = deleteMessage
      ? deleteMessage(row)
      : "Delete this record? This cannot be undone.";
    if (!window.confirm(message)) return;

    try {
      await remove(row.id);
      await fetchRows();
    } catch (error) {
      console.error(error);
      alert("Failed to delete record");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="empty-state">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-text">
          <h1>{title}</h1>
          <p>{subtitle(rows.length)}</p>
        </div>

        <div className="page-header-actions">
          {resource && (
            <ImportExportButtons
              resource={resource}
              importable={importable}
              onImported={fetchRows}
            />
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            <Icon name="plus" size={16} />
            Add
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Icon name="search" size={18} className="search-icon" />
          <input
            type="search"
            placeholder={`Search ${title.toLowerCase()}`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1}>
                  <div className="table-empty">
                    <Icon name={icon} size={32} className="table-empty-icon" />
                    <div>{emptyMessage}</div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td key={column.key}>{column.render(row)}</td>
                  ))}
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-button icon-only"
                        title="Edit"
                        onClick={() => setEditing(row)}
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-button icon-only icon-button-danger"
                        title="Delete"
                        onClick={() => handleDelete(row)}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(showModal || editing) && (
        <CrudModal
          key={editing?.id ?? "new"}
          title={title}
          initialForm={editing ? toForm(editing) : initialForm()}
          isEditing={Boolean(editing)}
          renderFields={renderFields}
          validate={validate}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSubmit={async (form) => {
            if (editing) {
              await update(editing.id, form);
            } else {
              await create(form);
            }
            await fetchRows();
          }}
        />
      )}
    </DashboardLayout>
  );
}

interface CrudModalProps<P> {
  title: string;
  initialForm: P;
  isEditing: boolean;
  renderFields: (
    form: P,
    setForm: (patch: Partial<P>) => void,
    isEditing: boolean,
  ) => ReactNode;
  validate?: (form: P) => string | null;
  onClose: () => void;
  onSubmit: (form: P) => Promise<void>;
}

function CrudModal<P>({
  title,
  initialForm,
  isEditing,
  renderFields,
  validate,
  onClose,
  onSubmit,
}: CrudModalProps<P>) {
  const [form, setForm] = useState<P>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const setField = (patch: Partial<P>) => setForm((current) => ({ ...current, ...patch }));

  const handleSubmit = async () => {
    if (validate) {
      const message = validate(form);
      if (message) {
        setError(message);
        return;
      }
    }

    try {
      setLoading(true);
      setError("");
      await onSubmit(form);
      onClose();
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
          : isEditing
            ? "Failed to save changes"
            : "Failed to add record";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal"
        aria-labelledby="crud-modal-title"
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div>
            <h2 id="crud-modal-title">
              {isEditing ? `Edit ${title}` : `Add ${title}`}
            </h2>
            <p>{isEditing ? "Update the details" : "Create a new record"}</p>
          </div>
          <button type="button" className="icon-button icon-only" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          {renderFields(form, setField, isEditing)}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Saving..." : isEditing ? "Save Changes" : "Add"}
          </button>
        </div>
      </section>
    </div>
  );
}
