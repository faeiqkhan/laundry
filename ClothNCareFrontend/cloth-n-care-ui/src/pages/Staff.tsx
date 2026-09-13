import { useEffect, useState } from "react";
import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
  USER_ROLES,
  type User,
  type UserPayload,
  type UserRole,
} from "../api/users";
import { decodeToken, isAdmin } from "../utils/auth";
import DashboardLayout from "../layout/DashboardLayout";
import ImportExportButtons from "../components/ImportExportButtons";
import Icon from "../components/Icons";

const ROLE_BADGE: Record<UserRole, string> = {
  ADMIN: "badge-purple",
  MANAGER: "badge-blue",
  STAFF: "badge-slate",
};

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  STAFF: "Staff",
};

function UserFormModal({
  user,
  onClose,
  onSuccess,
}: {
  user?: User;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEditing = Boolean(user);

  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
    role: user?.role ?? ("STAFF" as UserRole),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required");
      return;
    }

    if (!isEditing && form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (isEditing && form.password && form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const payload: UserPayload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
      };

      if (form.password) {
        payload.password = form.password;
      }

      if (isEditing && user) {
        await updateUser(user.id, payload);
      } else {
        await createUser(payload);
      }

      onSuccess();
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
            ? "Failed to update user"
            : "Failed to create user";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal"
        aria-labelledby="user-form-title"
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div>
            <h2 id="user-form-title">
              {isEditing ? "Edit User" : "Add User"}
            </h2>
            <p>{isEditing ? "Update account details and role" : "Create a new account"}</p>
          </div>
          <button type="button" className="icon-button icon-only" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          <div className="form-field">
            <label>Name</label>
            <input
              className="form-input"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </div>

          <div className="form-field">
            <label>Email</label>
            <input
              type="email"
              className="form-input"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </div>

          <div className="form-field">
            <label>{isEditing ? "New Password (optional)" : "Password"}</label>
            <input
              type="password"
              className="form-input"
              placeholder={isEditing ? "Leave blank to keep current" : "Min. 6 characters"}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </div>

          <div className="form-field">
            <label>Role</label>
            <select
              className="form-input"
              value={form.role}
              onChange={(event) =>
                setForm({ ...form, role: event.target.value as UserRole })
              }
            >
              {USER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABEL[role]}
                </option>
              ))}
            </select>
          </div>
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
            {loading ? "Saving..." : isEditing ? "Save Changes" : "Add User"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function StaffPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const admin = isAdmin();
  const currentEmail = decodeToken(localStorage.getItem("token") ?? "")?.sub;

  const fetchUsers = async () => {
    const data = await getUsers();
    setUsers(data);
  };

  useEffect(() => {
    if (!admin) {
      return;
    }

    let ignore = false;

    getUsers()
      .then((data) => {
        if (!ignore) setUsers(data);
      })
      .catch((err) => {
        console.error(err);
        if (!ignore) setError("Failed to load users");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [admin]);

  const handleDelete = async (user: User) => {
    const confirmed = window.confirm(
      `Delete user "${user.name}" (${ROLE_LABEL[user.role]})? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await deleteUser(user.id);
      setUsers((current) => current.filter((entry) => entry.id !== user.id));
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
          : "Failed to delete user";
      alert(message);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Staff & Users</h1>
          <p>Manage accounts, roles, and passwords</p>
        </div>

        <div className="page-header-actions">
          <ImportExportButtons
            resource="users"
            onImported={() => fetchUsers().catch((err) => console.error(err))}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowAdd(true)}
          >
            <Icon name="plus" size={16} />
            Add User
          </button>
        </div>
      </div>

      {!admin ? (
        <div className="empty-state">Only administrators can manage users</div>
      ) : loading ? (
        <div className="empty-state">Loading users...</div>
      ) : error ? (
        <div className="empty-state">{error}</div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="table-empty">
                      <Icon name="users" size={32} className="table-empty-icon" />
                      <div>No users found</div>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSelf = user.email === currentEmail;
                  return (
                    <tr key={user.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>
                          {user.name}
                          {isSelf && (
                            <span className="badge badge-green self-badge">You</span>
                          )}
                        </div>
                      </td>
                      <td className="cell-muted">{user.email}</td>
                      <td>
                        <span className={`badge ${ROLE_BADGE[user.role]}`}>
                          {ROLE_LABEL[user.role]}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-button icon-only"
                            title="Edit"
                            onClick={() => setEditing(user)}
                          >
                            <Icon name="edit" size={16} />
                          </button>
                          <button
                            type="button"
                            className="icon-button icon-only icon-button-danger"
                            title="Delete"
                            onClick={() => handleDelete(user)}
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <UserFormModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => fetchUsers().catch((err) => console.error(err))}
        />
      )}

      {editing && (
        <UserFormModal
          user={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => fetchUsers().catch((err) => console.error(err))}
        />
      )}
    </DashboardLayout>
  );
}
