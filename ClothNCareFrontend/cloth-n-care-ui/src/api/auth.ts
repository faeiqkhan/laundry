import api from "./axios";
import type { RegisterRequest } from "../types/auth";

export const register = async (payload: RegisterRequest) => {
  await api.post("/auth/register", payload);
};