import { useEffect, useState } from "react";
import { navigateWithMotion } from "./ui/navigationMotion";
import Dashboard from "./Dashboard";
import Landing from "./ui/Landing";
import "./neo.css";

export default function App() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const update = (event: HashChangeEvent) => {
      const next = window.location.hash;
      const wasDesk = new URL(event.oldURL).hash === "#dashboard";
      const isDesk = next === "#dashboard";
      if (wasDesk === isDesk) setHash(next);
      else navigateWithMotion("page", isDesk, () => setHash(window.location.hash));
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const desk = hash === "#dashboard";
  useEffect(() => {
    document.title = desk
      ? "SwiftRoute · Диспечерски център"
      : "SwiftRoute · Градска логистика";
    if (desk || !hash || hash === "#start") window.scrollTo(0, 0);
    else document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash, desk]);
  return desk ? <Dashboard /> : <Landing />;
}