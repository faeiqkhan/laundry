interface DecodedToken {
  sub: string;
  id: string;
  role: string;
  name: string;
  iat: number;
  exp: number;
}

export function decodeToken(token: string): DecodedToken | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = atob(parts[1]);
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export function getUserRole(): string | null {
  const token = localStorage.getItem("token");
  if (!token) return null;

  const decoded = decodeToken(token);
  return decoded?.role ?? null;
}

export function isAdmin(): boolean {
  return getUserRole() === "ADMIN";
}