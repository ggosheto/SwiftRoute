import { useEffect, useState } from "react";
import { navigateWithMotion } from "./ui/navigationMotion";
import Dashboard from "./Dashboard";
import Landing from "./ui/Landing";
import "./neo.css";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import LoginPage from "./auth/LoginPage";

function Pages() {
  const { user, checking, generation } = useAuth();
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const update = (event: HashChangeEvent) => {
      const next = window.location.hash;
      const wasDesk = ["#dashboard", "#login"].includes(new URL(event.oldURL).hash);
      const isDesk = ["#dashboard", "#login"].includes(next);
      if (wasDesk === isDesk) setHash(next);
      else navigateWithMotion("page", isDesk, () => setHash(window.location.hash));
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const desk = hash === "#dashboard" || hash === "#login";
  useEffect(() => {
    document.title = desk
      ? user ? "SwiftRoute · Работно табло" : "SwiftRoute · Вход"
      : "SwiftRoute · Градска логистика";
    if (desk || !hash || hash === "#start") window.scrollTo(0, 0);
    else document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash, desk, user]);
  if (!desk) return <Landing />;
  if (checking || !user) return <LoginPage />;
  return <Dashboard key={`${user.id}:${generation}`} />;
}

export default function App() {
  return <AuthProvider><Pages /></AuthProvider>;
}
