import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Brand, Icon } from "../ui/DispatchVisuals";
import { message } from "../ui/dispatch";
import { useAuth } from "./AuthContext";
import "./auth.css";
import "./registration.css";

export default function LoginPage() {
  const { login, checking, error: connectionError, notice, retry } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sending = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(message(e));
    } finally {
      setPassword("");
      setBusy(false);
      sending.current = false;
    }
  }

  return <div className="sr-auth">
    <header className="sr-auth-header">
      <a href="#start" aria-label="SwiftRoute — начало"><Brand /></a>
      <a className="sr-auth-back" href="#start">Към началото <span aria-hidden="true">↗</span></a>
    </header>
    <main className="sr-auth-layout">
      <section className="sr-auth-story" aria-labelledby="auth-heading">
        <span className="sr-auth-label">ПЛОВДИВ / ГРАДСКА ЛОГИСТИКА</span>
        <h1 id="auth-heading">Следващата<br />доставка<br /><span>започва тук.</span></h1>
        <p>Твоите поръчки. Твоят маршрут.<br />Всичко необходимо на едно място.</p>
        <div className="sr-auth-journey" aria-label="Ресторант, куриер, клиент">
          <span><Icon name="box" size={24} /><b>Ресторант</b></span>
          <Icon name="arrow" size={22} />
          <span><Icon name="bike" size={24} /><b>Куриер</b></span>
          <Icon name="arrow" size={22} />
          <span><Icon name="pin" size={24} /><b>Клиент</b></span>
        </div>
        <div className="sr-auth-caption"><span /> Една платформа. Всеки на своето място.</div>
      </section>
      <section className="sr-auth-card" aria-labelledby="login-title" aria-busy={busy || checking}>
        <span className="sr-auth-card-tag">ДОБРЕ ДОШЪЛ ОБРАТНО</span>
        <h2 id="login-title">Вход в SwiftRoute</h2>
        <p className="sr-auth-subtitle">Влез с акаунта на своя ресторант, куриер или администратор.</p>
        {checking ? <p className="sr-auth-message" role="status">Проверяваме сесията…</p> : <>
          {notice && <p className="sr-auth-message" role="status">{notice}</p>}
          {connectionError && <div className="sr-auth-error" role="alert">
            <p>{connectionError}</p>
            <button type="button" className="sr-auth-small" onClick={() => void retry()}>Провери връзката</button>
          </div>}
          <form onSubmit={submit}>
            <label htmlFor="login-email">Имейл</label>
            <input id="login-email" type="email" autoComplete="username" inputMode="email"
              maxLength={254} required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Твоят имейл адрес" disabled={busy} autoCapitalize="none" spellCheck={false} />
            <label htmlFor="login-password">Парола</label>
            <div className="sr-auth-password">
              <input id="login-password" type={showPassword ? "text" : "password"}
                autoComplete="current-password" maxLength={128} required value={password}
                onChange={(e) => setPassword(e.target.value)} disabled={busy} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} disabled={busy}
                aria-pressed={showPassword} aria-label={showPassword ? "Скрий паролата" : "Покажи паролата"}>
                {showPassword ? "Скрий" : "Покажи"}
              </button>
            </div>
            {error && <p className="sr-auth-error" role="alert">{error}</p>}
            <button className="sr-auth-submit" type="submit" disabled={busy}>
              {busy ? "Влизане…" : "Влез в платформата"}<Icon name="arrow" size={22} />
            </button>
          </form>
          <p className="sr-auth-help">Нямаш акаунт? <a href="#signup">Създай профил</a><br />
            Забравена парола? Свържи се с администратора на платформата.</p>
        </>}
      </section>
    </main>
    <footer className="sr-auth-footer"><span>SwiftRoute</span><span>Ресторанти и куриери. В една посока.</span></footer>
  </div>;
}
