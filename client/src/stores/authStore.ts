import { create } from "zustand";
import { jwtDecode } from "jwt-decode";
import type { JwtPayload } from "../types/api";

interface AuthState {
  token: string | null;
  user: JwtPayload | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  initialize: () => void;
}

function decodeToken(token: string): JwtPayload | null {
  try {
    return jwtDecode<JwtPayload>(token);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwtDecode<{ exp?: number }>(token);
    if (!decoded.exp) return true;
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  login: (token) => {
    const user = decodeToken(token);
    if (!user) return;
    localStorage.setItem("token", token);
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, user: null, isAuthenticated: false });
  },

  initialize: () => {
    const token = localStorage.getItem("token");
    if (!token || isTokenExpired(token)) {
      localStorage.removeItem("token");
      set({ token: null, user: null, isAuthenticated: false });
      return;
    }
    const user = decodeToken(token);
    if (!user) {
      localStorage.removeItem("token");
      set({ token: null, user: null, isAuthenticated: false });
      return;
    }
    set({ token, user, isAuthenticated: true });
  },
}));
