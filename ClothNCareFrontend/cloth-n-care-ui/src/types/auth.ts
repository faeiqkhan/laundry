export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    role?: string;
  };
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: "MANAGER" | "STAFF";
}
