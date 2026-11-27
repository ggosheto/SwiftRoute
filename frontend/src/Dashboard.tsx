import { useCallback, useEffect, useRef, useState } from "react";
import { Atlas, Brand, Icon } from "./ui/DispatchVisuals";
import { navigateWithMotion } from "./ui/navigationMotion";
import RouteSummary from "./ui/RouteSummary";
import useOrderRoutes from "./ui/useOrderRoutes";
import DispatchMap from "./ui/DispatchMap";
import NewOrder from "./ui/NewOrder";
import { api, labels, message, next } from "./ui/dispatch";
import type { Courier, Order, Place } from "./ui/dispatch";
import "./App.css";
import { roleLabels, useAuth } from "./auth/AuthContext";
import CourierControls from "./auth/CourierControls";
import AdminUsers from "./auth/AdminUsers";
import "./auth/auth.css";

type View = "Табло" | "Поръчки" | "Куриери" | "Потребители";
type Filter = "Всички" | "Активни" | "Завършени";
const num = (id: number) => "#" + String(id).padStart(3, "0");

export default function Dashboard() {
  const { user, logout } = useAuth();
  const views: View[] = user?.role === "admin" ? ["Табло", "Поръчки", "Куриери", "Потребители"] : ["Табло", "Поръчки", "Куриери"];
  const [leaving, setLeaving] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const canCreate = user?.role === "admin" || user?.role === "restaurant";
  const canAdvance = (order: Order) => !!user && (
    user.role === "admin" ||
    (user.role === "restaurant" && order.restaurant_id === user.restaurant_id && order.status === "pending") ||
    (user.role === "courier" && order.courier_id === user.courier_id && order.status !== "pending")
  );
  async function signOut() {
    if (leaving) return;
    setLeaving(true);
    setActionError("");
    try { await logout(); }
    catch (e) { setActionError(message(e)); setLeaving(false); }
  }
  const [view, setView] = useState<View>("Табло"),
    [filter, setFilter] = useState<Filter>("Всички");
  const [selectedCourierId, setSelectedCourierId] = useState<number | null>(null);
  const [data, setData] = useState<{
    orders: Order[];
    places: Place[];
    couriers: Courier[];
  } | null>(null);
  const [loading, setLoading] = useState(true),
    [dbError, setDbError] = useState(""),
    [notice, setNotice] = useState(""),
    [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState<number | null>(null),
    [create, setCreate] = useState(false);
  const {
    route, pickupRoute, routeId, setRouteId, routeErr, routeNote, finding,
    showRoute, invalidateRoutes, refreshSelected,
  } = useOrderRoutes();
  const loads = useRef(0),
    working = useRef(false);
  const routePanel = useRef<HTMLElement>(null);
  const refresh = useCallback(async () => {
    const v = ++loads.current;
    invalidateRoutes();
    setLoading(true);
    setDbError("");
    try {
      const [orders, places, couriers] = await Promise.all([
        api<Order[]>("/orders"),
        api<Place[]>("/restaurants"),
        api<Courier[]>("/couriers"),
      ]);
      if (v === loads.current) {
        setData({
          orders: [...orders].sort((a, b) => b.id - a.id),
          places,
          couriers,
        });
        refreshSelected(orders);
      }
    } catch (e) {
      if (v === loads.current) setDbError(message(e));
    } finally {
      if (v === loads.current) setLoading(false);
    }
  }, [invalidateRoutes, refreshSelected]);
  useEffect(() => {
    void refresh();
    return () => {
      loads.current++;
    };
  }, [refresh]);
  useEffect(() => {
    if (finding && window.matchMedia("(max-width: 980px)").matches) {
      routePanel.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [finding]);
  const orders = data?.orders ?? [],
    couriers = data?.couriers ?? [],
    places = data?.places ?? [];
  const visible = orders.filter(
    (o) =>
      filter === "Всички" ||
      (filter === "Завършени"
        ? o.status === "delivered"
        : o.status !== "delivered"),
  );
  async function change(order: Order) {
    const a = next[order.status];
    if (!a || !canAdvance(order) || working.current || profileBusy || leaving) return;
    working.current = true;
    invalidateRoutes();
    setBusy(order.id);
    setActionError("");
    setNotice("");
    try {
      const result = await api<Order>(
        a.status === "assigned"
          ? `/orders/${order.id}/assign`
          : `/orders/${order.id}/status`,
        a.status === "assigned"
          ? { method: "POST" }
          : {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: a.status }),
            },
      );
      setNotice(`Поръчка ${num(order.id)} · ${labels[result.status]}`);
    } catch (e) {
      setActionError(message(e));
    } finally {
      await refresh();
      working.current = false;
      setBusy(null);
    }
  }
  function openView(nextView: View) {
    if (nextView === view) return;
    navigateWithMotion("tab", views.indexOf(nextView) > views.indexOf(view), () => setView(nextView));
  }
  function created(o: Order) {
    setCreate(false);
    setActionError("");
    setNotice("Създадена поръчка " + num(o.id));
    setFilter("Всички");
    setView("Табло");
    void refresh();
    void showRoute(o.id, o);
  }
  async function changeCourier(courier: Courier, kind: "availability" | "location", values: object) {
    if (working.current || leaving) return;
    working.current = true;
    setProfileBusy(true);
    setActionError("");
    setNotice("");
    try {
      await api<Courier>(`/couriers/${courier.id}/${kind}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
      });
      setNotice(kind === "availability" ? "Наличността е обновена." : "Местоположението е обновено.");
    } catch (e) { setActionError(message(e)); }
    finally { await refresh(); working.current = false; setProfileBusy(false); }
  }
  const free = couriers.filter((c) => c.is_available).length;
  const metrics = [
    ["box", user?.role === "admin" ? "Всички поръчки" : "Моите поръчки", orders.length, "blue"],
    [
      "pulse",
      "Активни доставки",
      orders.filter((o) =>
        ["assigned", "accepted", "picked_up"].includes(o.status),
      ).length,
      "violet",
    ],
    ["bike", user?.role === "courier" ? "Готов за доставка" : "Видими свободни куриери", free, "green"],
    [
      "check",
      "Доставени",
      orders.filter((o) => o.status === "delivered").length,
      "amber",
    ],
  ] as const;
  const selectedCourier = couriers.find((c) => c.id === selectedCourierId) ?? couriers[0];
  const displayedCouriers = view === "Табло"
    ? (selectedCourier ? [selectedCourier] : [])
    : couriers;
  const courierList = (
    <div className={view === "Куриери" ? "courier-grid" : "courier-list"}>
      {displayedCouriers.map((c) => (
        <div className="courier" key={c.id}>
          <span className={"avatar a" + (c.id % 3)}>{c.name.slice(0, 1)}</span>
          <div>
            <b>{c.name}</b>
            <small>Куриер {num(c.id)}</small>
          </div>
          <span className={"presence " + (c.is_available ? "free" : "")}>
            {c.is_available ? "Свободен" : "Недостъпен"}
          </span>
          {(user?.role === "admin" || user?.courier_id === c.id) && (
            <CourierControls key={`${c.id}:${c.latitude}:${c.longitude}:${c.is_available}`} courier={c}
              allowDeviceLocation={user?.role === "courier" && user.courier_id === c.id}
              disabled={loading || busy !== null || profileBusy || leaving || !!dbError}
              active={orders.some((o) => o.courier_id === c.id && ["assigned", "accepted", "picked_up"].includes(o.status))}
              save={(kind, values) => changeCourier(c, kind, values)} />
          )}
        </div>
      ))}
      {data && !couriers.length && (
        <p className="empty">Няма регистрирани куриери.</p>
      )}
    </div>
  );
  const locked = loading || busy !== null || profileBusy || leaving || !!dbError;
  return (
    <div className="workspace">
      <header className="top">
        <div className="top-in">
          <a
            href="#start"
            className="back-home"
            aria-label="SwiftRoute — към началната страница"
          >
            <Brand />
          </a>
          <nav aria-label="Основна навигация">
            {views.map((n, i) => (
              <button
                key={n}
                className={view === n ? "nav current" : "nav"}
                aria-current={view === n ? "page" : undefined}
                onClick={() => openView(n)}
              >
                <Icon name={["grid", "box", "bike", "grid"][i]} size={16} />
                {n}
              </button>
            ))}
          </nav>
          <div className="account-menu">
            <div><small>{user ? roleLabels[user.role] : ""}</small><b>{user?.email}</b></div>
            <button className="secondary" onClick={() => void signOut()} disabled={leaving || busy !== null || profileBusy}>
              {leaving ? "Излизане…" : "Изход"}
            </button>
          </div>
        </div>
      </header>
      <main className="shell">
        <div className="hero">
          <Atlas />
          <div className="hero-copy">
            <span className="kicker">
              <i /> {user ? roleLabels[user.role].toUpperCase() : ""} / ПЛОВДИВ
            </span>
            <h1>
              {view === "Табло"
                ? user?.role === "courier" ? "Моите доставки" : user?.role === "restaurant" ? "Моят ресторант" : "Диспечерски център"
                : view === "Поръчки"
                  ? "Регистър на поръчките"
                  : view === "Потребители" ? "Управление на достъпа" : "Екип на терен"}
            </h1>
            <p>
              {view === "Табло"
                ? "Поръчки, куриери и маршрути на едно място."
                : view === "Поръчки"
                  ? "Проследи всяка поръчка от ресторанта до клиента."
                  : view === "Потребители" ? "Регистрации, одобрение и активност на акаунтите." : "Виж кои куриери могат да поемат следващата доставка."}
            </p>
          </div>
          <span className="hero-tag">
            ПЛОВДИВ <b>/</b> BG–PDV
          </span>
        </div>
        {view === "Потребители" && user?.role === "admin" ? <AdminUsers onChanged={() => void refresh()} /> : <>
        <div className="stats">
          {metrics.map(([ico, title, value, color]) => (
            <div className="stat" key={title}>
              <span className={"stat-icon " + color}>
                <Icon name={ico} size={21} />
              </span>
              <div>
                <small>{title}</small>
                <strong>{data ? value : "—"}</strong>
              </div>
            </div>
          ))}
        </div>
        {dbError && (
          <p role="alert" className="error">
            {dbError} Данните не са обновени.{" "}
            <button className="text-btn" onClick={() => void refresh()}>
              Опитай отново
            </button>
          </p>
        )}
        {actionError && (
          <p className="error" role="alert">
            {actionError}
          </p>
        )}
        {notice && (
          <div className="notice" role="status">
            <Icon name="check" size={17} />
            {notice}
            <button
              aria-label="Скрий съобщението"
              className="icon"
              onClick={() => setNotice("")}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        )}
        {view === "Куриери" ? (
          <section className="card">
            <div className="card-head">
              <div>
                <span className="eyebrow">ЕКИП</span>
                <h2>
                  Куриери <em>{data ? couriers.length : "—"}</em>
                </h2>
              </div>
              <button
                className="secondary"
                disabled={locked && !dbError}
                onClick={() => void refresh()}
              >
                <Icon name="refresh" />
                Обнови
              </button>
            </div>
            {courierList}
          </section>
        ) : (
          <div className="columns">
            <div className="left">
              <section className="card">
                <div className="card-head">
                  <div>
                    <span className="eyebrow">ДИСПЕЧЕРСКА ОПАШКА</span>
                    <h2>
                      Поръчки <em>{data ? orders.length : "—"}</em>
                    </h2>
                  </div>
                  {canCreate && <button
                    className="primary"
                    disabled={!places.length || locked}
                    onClick={() => setCreate(true)}
                  >
                    <Icon name="plus" size={16} />
                    Нова поръчка
                  </button>}
                </div>
                <div className="toolbar">
                  <div className="segments" aria-label="Филтър на поръчките">
                    {(["Всички", "Активни", "Завършени"] as const).map((f) => (
                      <button
                        key={f}
                        aria-pressed={filter === f}
                        onClick={() => setFilter(f)}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <button
                    aria-label="Обнови списъка"
                    title="Обнови списъка"
                    className="icon"
                    disabled={loading || busy !== null}
                    onClick={() => void refresh()}
                  >
                    <Icon name="refresh" size={16} />
                  </button>
                </div>
                {visible.length > 0 ? (
                  <div className="rows">
                    {visible.map((o) => (
                      <article
                        key={o.id}
                        className={
                          "order " + ((route?.order_id ?? pickupRoute?.order_id) === o.id ? "chosen" : "")
                        }
                      >
                        <div className="order-main">
                          <span className="box-icon">
                            <Icon name="box" size={19} />
                          </span>
                          <div className="order-name">
                            <b>Поръчка {num(o.id)}</b>
                            <small>
                              {places.find((p) => p.id === o.restaurant_id)
                                ?.name ?? "Ресторант №" + o.restaurant_id}
                            </small>
                          </div>
                          <span className={"badge " + o.status}>
                            {labels[o.status]}
                          </span>
                        </div>
                        <div className="order-bottom">
                          <span>
                            <Icon name="bike" size={15} />
                            {couriers.find((c) => c.id === o.courier_id)
                              ?.name ?? (o.courier_id ? "Куриер №" + o.courier_id : "Без куриер")}
                          </span>
                          <div>
                            <button
                              onClick={() => void showRoute(o.id)}
                              className="text-btn"
                            >
                              <Icon name="route" size={14} />
                              Маршрут
                            </button>
                            {next[o.status] && canAdvance(o) && (
                              <button
                                className="step"
                                disabled={locked}
                                onClick={() => void change(o)}
                              >
                                {busy === o.id
                                  ? "Запис…"
                                  : next[o.status]?.label}
                                <Icon name="arrow" size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty">
                    <span className="empty-ico">
                      <Icon name="box" size={27} />
                    </span>
                    <b>
                      {loading
                        ? "Зареждане…"
                        : dbError
                          ? "Няма актуални данни"
                          : orders.length
                            ? "Няма поръчки в този филтър"
                            : "Опашката е празна"}
                    </b>
                    <small>
                      {orders.length
                        ? "Избери друг филтър."
                        : "Новите поръчки ще се появят тук."}
                    </small>
                  </div>
                )}
              </section>
              {view === "Табло" && (
                <section className="card courier-picker-card" aria-labelledby="courier-picker-title">
                  <div className="card-head">
                    <div>
                      <span className="eyebrow">НА ТЕРЕН</span>
                      <h2 id="courier-picker-title">Куриери <em>{data ? couriers.length : "—"}</em></h2>
                    </div>
                    <button className="text-btn" onClick={() => openView("Куриери")}>
                      Всички <Icon name="arrow" size={14} />
                    </button>
                  </div>
                  <div className="courier-picker-field">
                    <label htmlFor="dashboard-courier">Избери куриер</label>
                    <select id="dashboard-courier" value={selectedCourier?.id ?? ""}
                      disabled={loading || !couriers.length || busy !== null || profileBusy || leaving}
                      onChange={(event) => setSelectedCourierId(Number(event.target.value))}>
                      {!couriers.length && <option value="">{loading ? "Зареждане…" : "Няма куриери"}</option>}
                      {couriers.map((courier) => <option key={courier.id} value={courier.id}>
                        {courier.name} · {num(courier.id)} · {courier.is_available ? "Свободен" : "Недостъпен"}
                      </option>)}
                    </select>
                    <p>Профил и действия за избрания куриер.</p>
                  </div>
                  {courierList}
                </section>
              )}
            </div>
            <aside>
              <section className="card map-card" ref={routePanel}>
                <div className="card-head">
                  <div>
                    <span className="eyebrow">НАВИГАЦИЯ</span>
                    <h2>Карта на маршрута</h2>
                  </div>
                  <span className="tag">Дийкстра / A*</span>
                </div>
                <DispatchMap route={route} pickupRoute={pickupRoute} />
                {finding && <p className="tile-note" role="status">Изчисляване на маршрут…</p>}
                {routeErr && (
                  <p className="error" role="alert">
                    {routeErr}
                  </p>
                )}
                <RouteSummary delivery={route} pickup={pickupRoute} note={routeNote} />
                <form
                  className="lookup"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void showRoute(Number(routeId));
                  }}
                >
                  <input
                    aria-label="Номер на поръчка за маршрут"
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="№ на поръчка"
                    value={routeId}
                    onChange={(e) => setRouteId(e.target.value)}
                  />
                  <button className="secondary" disabled={finding}>
                    Покажи
                  </button>
                </form>
              </section>
            </aside>
          </div>
        )}
        </>}
        <footer>
          <span>
            SwiftRoute <i>/</i> Оперативно табло
          </span>
          <span>Пловдив, България</span>
        </footer>
      </main>
      {create && canCreate && (
        <NewOrder
          places={places}
          close={() => setCreate(false)}
          created={created}
        />
      )}
    </div>
  );
}
