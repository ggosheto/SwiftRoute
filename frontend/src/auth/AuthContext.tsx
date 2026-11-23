import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { api, ApiError, message, resetApiSession } from "../ui/dispatch";

export type User = {
  id: number;
  email: string;
  role: "admin" | "restaurant" | "courier";
  restaurant_id: number | null;
  courier_id: number | null;
  is_active: boolean;
};
export const roleLabels: Record<User["role"], string> = {
  admin: "Администратор", restaurant: "Ресторант", courier: "Куриер",
};
type AuthState = {
  user: User | null;
  checking: boolean;
  error: string;
  notice: string;
  generation: number;
  retry: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);
const CHANNEL = "swiftroute-auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [generation, setGeneration] = useState(0);
  const version = useRef(0);
  const busy = useRef(false);
  const channel = useRef<BroadcastChannel | null>(null);
  const identity = useRef<string>("");

  const accept = useCallback((value: User | null) => {
    const key = value ? JSON.stringify(value) : "";
    if (identity.current !== key) {
      identity.current = key;
      resetApiSession();
      setGeneration((n) => n + 1);
    }
    setUser(value);
  }, []);

  const retry = useCallback(async () => {
    if (busy.current) return;
    const request = ++version.current;
    // При проверка след смяна на таб/акаунт не оставяме стари данни на екрана.
    resetApiSession();
    setChecking(true);
    setError("");
    try {
      const current = await api<User>("/auth/me");
      if (request === version.current) accept(current);
    } catch (e) {
      if (request !== version.current) return;
      accept(null);
      if (!(e instanceof ApiError && e.status === 401)) setError(message(e));
    } finally {
      if (request === version.current) setChecking(false);
    }
  }, [accept]);

  useEffect(() => {
    void retry();
    const expired = () => {
      version.current++;
      accept(null);
      setChecking(false);
      setError("");
      setNotice("Сесията е изтекла или е прекратена. Влез отново.");
    };
    const visible = () => { if (document.visibilityState === "visible") void retry(); };
    window.addEventListener("swiftroute:session-expired", expired);
    document.addEventListener("visibilitychange", visible);
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel(CHANNEL);
      channel.current.onmessage = () => void retry();
    }
    return () => {
      version.current++;
      resetApiSession();
      window.removeEventListener("swiftroute:session-expired", expired);
      document.removeEventListener("visibilitychange", visible);
      channel.current?.close();
      channel.current = null;
    };
  }, [retry, accept]);

  async function login(email: string, password: string) {
    if (busy.current) throw new Error("Изчакай текущото действие.");
    busy.current = true;
    const request = ++version.current;
    resetApiSession();
    try {
      const current = await api<User>("/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (request !== version.current) return;
      accept(current);
      setError("");
      setNotice("");
      setChecking(false);
      channel.current?.postMessage("changed");
      window.location.hash = "dashboard";
    } finally {
      busy.current = false;
    }
  }

  async function logout() {
    if (busy.current) throw new Error("Изчакай текущото действие.");
    busy.current = true;
    ++version.current;
    resetApiSession();
    try {
      await api<void>("/auth/logout", { method: "POST" });
      accept(null);
      setNotice("Излезе успешно от акаунта си.");
      setError("");
      setChecking(false);
      channel.current?.postMessage("changed");
      window.location.hash = "login";
    } finally {
      busy.current = false;
    }
  }

  return <AuthContext.Provider value={{ user, checking, error, notice, generation, retry, login, logout }}>
    {children}
  </AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("Липсва AuthProvider.");
  return value;
}
