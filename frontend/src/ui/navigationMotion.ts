import { flushSync } from "react-dom";
import "./navigationMotion.css";

type Scope = "page" | "tab";
type Running = { finished: Promise<void>; skipTransition(): void };
let sequence = 0;
let running: Running | undefined;

export function navigateWithMotion(scope: Scope, forward: boolean, change: () => void) {
  const id = ++sequence;
  running?.skipTransition();
  const root = document.documentElement;
  const commit = () => { if (id === sequence) flushSync(change); };
  const clear = () => {
    if (id === sequence) {
      delete root.dataset.srMotion;
      delete root.dataset.srDirection;
      running = undefined;
    }
  };
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    commit();
    clear();
    return;
  }
  root.dataset.srMotion = scope;
  root.dataset.srDirection = forward ? "next" : "back";
  if (typeof document.startViewTransition === "function") {
    running = document.startViewTransition(commit);
    void running.finished.then(clear, clear);
  } else {
    commit();
    const element = document.querySelector(scope === "page" ? "#root" : ".workspace .shell");
    element?.animate?.(
      [{ opacity: 0.35, translate: (forward ? 18 : -18) + "px 0" },
       { opacity: 1, translate: "0 0" }],
      { duration: 240, easing: "ease-out" }
    );
    clear();
  }
}
