import { useEffect, useState } from "react";
import { navigateWithMotion } from "./ui/navigationMotion";
import Dashboard from "./Dashboard";
import Landing from "./ui/Landing";
import "./neo.css";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import LoginPage from "./auth/LoginPage";
import SignupPage from "./auth/SignupPage";

function Pages() {
  const { user, checking, generation } = useAuth();
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const update = (event: HashChangeEvent) => {
      const next = window.location.hash;
      const wasDesk = ["#dashboard", "#login", "#signup"].includes(new URL(event.oldURL).hash);
      const isDesk = ["#dashboard", "#login", "#signup"].includes(next);
      if (wasDesk === isDesk) setHash(next);
      else navigateWithMotion("page", isDesk, () => setHash(window.location.hash));
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const desk = ["#dashboard", "#login", "#signup"].includes(hash);
  useEffect(() => {
    document.title = desk
      ? user ? "SwiftRoute · Работно табло" : hash === "#signup" ? "SwiftRoute · Регистрация" : "SwiftRoute · Вход"
      : "SwiftRoute · Градска логистика";
    if (desk || !hash || hash === "#start") window.scrollTo(0, 0);
    else document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash, desk, user]);
  if (!desk) return <Landing />;
  if (!user && hash === "#signup") return <SignupPage />;
  if (checking || !user) return <LoginPage />;
  return <Dashboard key={`${user.id}:${generation}`} />;
}

export default function App() {
  return <AuthProvider><Pages /></AuthProvider>;
}
