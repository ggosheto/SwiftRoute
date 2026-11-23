import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Brand, Icon } from "../ui/DispatchVisuals";
import { api, message } from "../ui/dispatch";
import "./auth.css";
import "./registration.css";

export default function SignupPage() {
  const [role, setRole] = useState<"restaurant" | "courier">("restaurant");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const sending = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const password = String(fields.get("password"));
    const confirmation = String(fields.get("confirmation"));
    const name = String(fields.get("name")).trim();
    setError("");
    if (password !== confirmation) { setError("Двете пароли не съвпадат."); return; }
    if (password.length < 10 || !password.trim()) { setError("Паролата трябва да съдържа поне 10 знака и да не е само от интервали."); return; }
    if (name.length < 2) { setError("Въведи име с поне 2 знака."); return; }
    sending.current = true;
    setBusy(true);
    try {
      const result = await api<{ message: string }>("/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(fields.get("email")).trim(), password,
          password_confirmation: confirmation, role, name,
          latitude: Number(fields.get("latitude")), longitude: Number(fields.get("longitude")),
        }),
      });
      form.reset();
      setDone(result.message);
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); sending.current = false; }
  }

  return <div className="sr-auth">
    <header className="sr-auth-header">
      <a href="#start" aria-label="SwiftRoute — начало"><Brand /></a>
      <a className="sr-auth-back" href="#login">Към входа ↗</a>
    </header>
    <main className="sr-auth-layout">
      <section className="sr-auth-story" aria-labelledby="signup-heading">
        <span className="sr-auth-label">ПРИСЪЕДИНИ СЕ КЪМ SWIFTROUTE</span>
        <h1 id="signup-heading">Твоят бизнес.<br />Твоят град.<br /><span>Обща посока.</span></h1>
        <p>Свързваме ресторанти и куриери,<br />за да стига всяка поръчка до своя адрес.</p>
        <ol className="sr-signup-steps">
          <li><b>01</b><span>Избери роля и създай профил.</span></li>
          <li><b>02</b><span>Администраторът проверява регистрацията.</span></li>
          <li><b>03</b><span>След одобрение влез и започни работа.</span></li>
        </ol>
      </section>
      <section className="sr-auth-card" aria-labelledby="signup-title" aria-busy={busy}>
        <span className="sr-auth-card-tag">НОВ ПРОФИЛ / НОВИ ВЪЗМОЖНОСТИ</span>
        <h2 id="signup-title">Регистрация</h2>
        {done ? <div className="sr-signup-success">
          <Icon name="check" size={36} />
          <h3>Заявката е изпратена.</h3>
          <p role="status">{done}</p>
          <p>Не изпращаме автоматичен имейл. Свържи се с администратора за потвърждение на одобрението.</p>
          <a className="sr-auth-submit" href="#login">Към входа <span aria-hidden="true">↗</span></a>
        </div> : <>
          <p className="sr-auth-subtitle">Попълни данните. Профилът става достъпен след одобрение.</p>
          <form onSubmit={submit}>
            <fieldset className="sr-signup-fields" disabled={busy}>
              <fieldset className="sr-role-picker">
                <legend>Регистрирам се като</legend>
                <label><input type="radio" name="role" value="restaurant" checked={role === "restaurant"}
                  onChange={() => setRole("restaurant")} /><span>Ресторант</span></label>
                <label><input type="radio" name="role" value="courier" checked={role === "courier"}
                  onChange={() => setRole("courier")} /><span>Куриер</span></label>
              </fieldset>
              <label htmlFor="signup-name">{role === "restaurant" ? "Име на ресторанта" : "Име и фамилия"}</label>
              <input id="signup-name" name="name" required minLength={2} maxLength={200}
                autoComplete={role === "restaurant" ? "organization" : "name"} />
              <label htmlFor="signup-email">Имейл</label>
              <input id="signup-email" name="email" type="email" required maxLength={254}
                autoComplete="username" autoCapitalize="none" spellCheck={false} />
              <label htmlFor="signup-password">Парола</label>
              <div className="sr-auth-password">
                <input id="signup-password" name="password" type={showPassword ? "text" : "password"}
                  required minLength={10} maxLength={128} autoComplete="new-password" aria-describedby="signup-password-help" />
                <button type="button" onClick={() => setShowPassword(v => !v)} aria-pressed={showPassword}
                  aria-label={showPassword ? "Скрий паролите" : "Покажи паролите"}>{showPassword ? "Скрий" : "Покажи"}</button>
              </div>
              <small id="signup-password-help">Между 10 и 128 знака.</small>
              <label htmlFor="signup-confirmation">Повтори паролата</label>
              <input id="signup-confirmation" name="confirmation" type={showPassword ? "text" : "password"}
                required minLength={10} maxLength={128} autoComplete="new-password" />
              <div className="sr-signup-location">
                <p><b>{role === "restaurant" ? "Местоположение на ресторанта" : "Начално местоположение"}</b></p>
                <p>Въведи координати от Пловдив. Например центърът е около 42.143, 24.750. Картата за маршрути покрива тестов район от града.</p>
                <div>
                  <label htmlFor="signup-latitude">Ширина
                    <input id="signup-latitude" name="latitude" type="number" step="any" min="-90" max="90" required placeholder="42.143" />
                  </label>
                  <label htmlFor="signup-longitude">Дължина
                    <input id="signup-longitude" name="longitude" type="number" step="any" min="-180" max="180" required placeholder="24.750" />
                  </label>
                </div>
              </div>
              {error && <p className="sr-auth-error" role="alert">{error}</p>}
              <button className="sr-auth-submit" type="submit">{busy ? "Изпращане…" : "Изпрати регистрация"}<Icon name="arrow" size={22} /></button>
            </fieldset>
          </form>
          <p className="sr-auth-help">Вече имаш профил? <a href="#login">Влез в SwiftRoute</a></p>
        </>}
      </section>
    </main>
    <footer className="sr-auth-footer"><span>SwiftRoute</span><span>Ресторанти и куриери. В една посока.</span></footer>
  </div>;
}
