import { useState } from "react";
import { register } from "../api/auth";
import type { RegisterRequest } from "../types/auth";
import "./Login.css";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"MANAGER" | "STAFF">("STAFF");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const payload: RegisterRequest = {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      };

      await register(payload);
      setSuccess(true);
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
          : "Registration failed";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="login-page">
        <section className="login-card" aria-labelledby="register-title">
          <h1 id="register-title">Registration Successful</h1>
          <p style={{ textAlign: "center", marginBottom: "24px" }}>
            Your account has been created. You can now{" "}
            <a href="/" style={{ color: "#2563eb", textDecoration: "none" }}>
              login
            </a>
            .
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="register-title">
        <h1 id="register-title">Cloth n Care Register</h1>

        {error && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px",
              borderRadius: "8px",
              background: "#fef2f2",
              color: "#dc2626",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        <div className="login-form">
          <input
            type="text"
            placeholder="Full Name"
            className="login-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <input
            type="email"
            placeholder="Email"
            className="login-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="login-input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <select
            className="login-input"
            value={role}
            onChange={(event) =>
              setRole(event.target.value as "MANAGER" | "STAFF")
            }
          >
            <option value="STAFF">Staff</option>
            <option value="MANAGER">Manager</option>
          </select>

          <button
            type="button"
            onClick={handleRegister}
            disabled={loading}
            className="login-button"
          >
            {loading ? "Registering..." : "Register"}
          </button>

          <p style={{ textAlign: "center", marginTop: "8px" }}>
            Already have an account?{" "}
            <a
              href="/"
              style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}
            >
              Login
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}