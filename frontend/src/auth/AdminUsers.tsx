import { useCallback, useEffect, useRef, useState } from "react";
import { api, message } from "../ui/dispatch";
import { roleLabels } from "./AuthContext";
import type { User } from "./AuthContext";
import "./registration.css";

type Account = User & {
  approval_status: "pending" | "approved";
  name: string | null;
  latitude: number | null;
  longitude: number | null;
};
type UserPage = { items: Account[]; total: number };
type Filter = "all" | "pending" | "active" | "inactive";
const filters: [Filter, string][] = [["all", "Всички"], ["pending", "Чакащи"], ["active", "Активни"], ["inactive", "Неактивни"]];
const PAGE_SIZE = 20;

export default function AdminUsers({ onChanged }: { onChanged: () => void }) {
  const [filter, setFilter] = useState<Filter>("pending");
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<UserPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<number | null>(null);
  const version = useRef(0);
  const working = useRef(false);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    const current = ++version.current;
    setLoading(true);
    setError("");
    try {
      const result = await api<UserPage>(`/admin/users?status=${filter}&limit=${PAGE_SIZE}&offset=${offset}`);
      if (current !== version.current) return;
      if (offset > 0 && result.items.length === 0) { setOffset(Math.max(0, offset - PAGE_SIZE)); return; }
      setPage(result);
    } catch (e) { if (current === version.current) setError(message(e)); }
    finally { if (current === version.current) setLoading(false); }
  }, [filter, offset]);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => { mounted.current = false; version.current++; };
  }, [load]);

  async function change(account: Account, action: "approve" | "activate" | "deactivate") {
    if (working.current || loading) return;
    working.current = true;
    setBusy(account.id); setError(""); setNotice(""); setConfirm(null);
    try {
      await api<Account>(`/admin/users/${account.id}/${action === "approve" ? "approve" : "activation"}`,
        action === "approve" ? { method: "POST" } : {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: action === "activate" }),
        });
      if (!mounted.current) return;
      setNotice(action === "approve" ? "Регистрацията е одобрена. Потребителят вече може да влезе."
        : action === "activate" ? "Акаунтът е активиран. Необходим е нов вход."
        : "Акаунтът е деактивиран и сесиите му са прекратени.");
      onChanged();
      await load();
    } catch (e) { if (mounted.current) setError(message(e)); }
    finally { working.current = false; if (mounted.current) setBusy(null); }
  }

  const locked = loading || busy !== null;
  return <section className="card sr-users" aria-labelledby="users-heading">
    <div className="card-head">
      <div><span className="eyebrow">ДОСТЪП ДО ПЛАТФОРМАТА</span><h2 id="users-heading">Потребители</h2></div>
      <button className="secondary" disabled={locked} onClick={() => void load()}>Обнови потребителите</button>
    </div>
    <p className="sr-users-intro">Прегледай името, ролята и местоположението, преди да одобриш регистрация. Имейл адресите не са автоматично потвърдени.</p>
    <div className="toolbar"><div className="segments" aria-label="Филтър на потребителите">
      {filters.map(([value, label]) => <button key={value} disabled={locked} aria-pressed={filter === value}
        onClick={() => { setFilter(value); setOffset(0); setPage(null); setConfirm(null); setNotice(""); }}>{label}</button>)}
    </div></div>
    {notice && <p className="notice" role="status">{notice}</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {loading ? <p className="empty" role="status">Зареждаме потребителите…</p> : !page ?
      <p className="empty">Не успяхме да заредим списъка. Натисни „Обнови потребителите“.</p> : <>
      {page.items.length === 0 ? <p className="empty">Няма потребители в този филтър.</p> : <div className="sr-users-list">
        {page.items.map(account => <article key={account.id} className="sr-user-row">
          <div className="sr-user-info">
            <div className="sr-user-heading"><b>{account.name ?? "Администратор"}</b>
              <span className={`sr-user-status ${account.approval_status === "pending" ? "pending" : account.is_active ? "active" : "inactive"}`}>
                {account.approval_status === "pending" ? "Чака одобрение" : account.is_active ? "Активен" : "Неактивен"}
              </span>
            </div>
            <p>{account.email}</p>
            <small>Акаунт №{account.id} · {roleLabels[account.role]}
              {account.restaurant_id !== null && ` · Ресторант №${account.restaurant_id}`}
              {account.courier_id !== null && ` · Куриер №${account.courier_id}`}
            </small>
            {account.latitude !== null && account.longitude !== null && <small>Местоположение: {account.latitude.toFixed(5)}, {account.longitude.toFixed(5)}</small>}
          </div>
          <div className="sr-user-actions">
            {account.role === "admin" ? <small>Защитен администраторски акаунт</small> :
              account.approval_status === "pending" ?
                <button className="primary" disabled={locked || !!error} onClick={() => void change(account, "approve")}>{busy === account.id ? "Запис…" : "Одобри"}</button> :
              !account.is_active ?
                <button className="secondary" disabled={locked || !!error} onClick={() => void change(account, "activate")}>{busy === account.id ? "Запис…" : "Активирай"}</button> :
              confirm === account.id ? <div className="sr-user-confirm">
                <p>Да прекратим ли достъпа и сесиите на този акаунт?</p>
                <button className="primary" disabled={locked} onClick={() => void change(account, "deactivate")}>Потвърди деактивирането</button>
                <button className="secondary" disabled={locked} onClick={() => setConfirm(null)}>Отказ</button>
              </div> : <button className="secondary" disabled={locked || !!error} onClick={() => setConfirm(account.id)}>Деактивирай</button>}
          </div>
        </article>)}
      </div>}
      <div className="sr-users-pagination">
        <span>{page.total ? `${offset + 1}–${Math.min(offset + PAGE_SIZE, page.total)} от ${page.total}` : "0 потребители"}</span>
        <div><button className="secondary" disabled={locked || offset === 0} onClick={() => { setOffset(v => Math.max(0, v - PAGE_SIZE)); setConfirm(null); }}>Предишни</button>
        <button className="secondary" disabled={locked || offset + PAGE_SIZE >= page.total} onClick={() => { setOffset(v => v + PAGE_SIZE); setConfirm(null); }}>Следващи</button></div>
      </div>
    </>}
  </section>;
}
