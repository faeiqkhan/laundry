import api from "./axios";

export type UserRole = "ADMIN" | "MANAGER" | "STAFF";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface UserPayload {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
}

export const USER_ROLES: UserRole[] = ["ADMIN", "MANAGER", "STAFF"];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  STAFF: "Staff",
};

export const getUsers = async () => {
  const res = await api.get<{ data: User[] }>("/users");
  return res.data.data;
};

export const createUser = async (payload: UserPayload) => {
  const res = await api.post<{ data: User }>("/users", payload);
  return res.data.data;
};

export const updateUser = async (id: string, payload: UserPayload) => {
  const res = await api.put<{ data: User }>(`/users/${id}`, payload);
  return res.data.data;
};

export const deleteUser = async (id: string) => {
  await api.delete(`/users/${id}`);
};
