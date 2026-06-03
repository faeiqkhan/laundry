import { useState } from "react";
import api from "../api/axios";
import type { LoginRequest, LoginResponse } from "../types/auth";
import { getLanUrl } from "../utils/network";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const lanUrl = getLanUrl();

  const handleLogin = async () => {
    const payload: LoginRequest = {
      email,
      password,
    };

    try {
      setLoading(true);

      const res = await api.post<LoginResponse>("/auth/login", payload);
      const token = res.data.data.token;

      localStorage.setItem("token", token);

      const parts = token.split(".");
      if (parts.length === 3) {
        try {
          const payload = JSON.parse(atob(parts[1]));
          localStorage.setItem("role", payload.role);
        } catch {
          // ignore
        }
      }

      window.location.href = "/dashboard";
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
          : "Login failed";

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <h1 id="login-title">Cloth n Care Login</h1>
        <div className="network-card">
          <span className="network-card-label">Access from other devices</span>
          <span className="network-card-url">{lanUrl}</span>
        </div>

        <div className="login-form">
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

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="login-button"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </div>
      </section>
    </main>
  );
}
