import { useCallback, useEffect, useRef, useState } from "react";
import { Atlas, Brand, Icon } from "./ui/DispatchVisuals";
import DispatchMap from "./ui/DispatchMap";
import NewOrder from "./ui/NewOrder";
import { api, labels, message, next } from "./ui/dispatch";
import type { Courier, DeliveryRoute, Order, Place } from "./ui/dispatch";
import "./App.css";

type View = "Табло" | "Поръчки" | "Куриери";
type Filter = "Всички" | "Активни" | "Завършени";
const num = (id: number) => "#" + String(id).padStart(3, "0");

export default function Dashboard() {
  const [view, setView] = useState<View>("Табло"),
    [filter, setFilter] = useState<Filter>("Всички");
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
  const [route, setRoute] = useState<DeliveryRoute | null>(null),
    [routeId, setRouteId] = useState(""),
    [routeErr, setRouteErr] = useState(""),
    [finding, setFinding] = useState(false);
  const loads = useRef(0),
    routes = useRef(0),
    working = useRef(false);
  const routePanel = useRef<HTMLElement>(null);
  const refresh = useCallback(async () => {
    const v = ++loads.current;
    setLoading(true);
    setDbError("");
    try {
      const [orders, places, couriers] = await Promise.all([
        api<Order[]>("/orders"),
        api<Place[]>("/restaurants"),
        api<Courier[]>("/couriers"),
      ]);
      if (v === loads.current)
        setData({
          orders: [...orders].sort((a, b) => b.id - a.id),
          places,
          couriers,
        });
    } catch (e) {
      if (v === loads.current) setDbError(message(e));
    } finally {
      if (v === loads.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    return () => {
      loads.current++;
      routes.current++;
    };
  }, [refresh]);
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
    if (!a || working.current) return;
    working.current = true;
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
  async function showRoute(id: number) {
    if (!Number.isSafeInteger(id) || id < 1) return;
    const v = ++routes.current;
    setRouteId(String(id));
    setRoute(null);
    setRouteErr("");
    setFinding(true);
    if (window.matchMedia("(max-width: 980px)").matches)
      routePanel.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
    try {
      const result = await api<DeliveryRoute>(`/orders/${id}/route`);
      if (v === routes.current) setRoute(result);
    } catch (e) {
      if (v === routes.current) setRouteErr(message(e));
    } finally {
      if (v === routes.current) setFinding(false);
    }
  }
  function created(o: Order) {
    setCreate(false);
    setActionError("");
    setNotice("Създадена поръчка " + num(o.id));
    setFilter("Всички");
    setView("Табло");
    void refresh();
    void showRoute(o.id);
  }
  const free = couriers.filter((c) => c.is_available).length;
  const metrics = [
    ["box", "Всички поръчки", orders.length, "blue"],
    [
      "pulse",
      "Активни доставки",
      orders.filter((o) =>
        ["assigned", "accepted", "picked_up"].includes(o.status),
      ).length,
      "violet",
    ],
    ["bike", "Свободни куриери", free, "green"],
    [
      "check",
      "Доставени",
      orders.filter((o) => o.status === "delivered").length,
      "amber",
    ],
  ] as const;
  const courierList = (
    <div className={view === "Куриери" ? "courier-grid" : "courier-list"}>
      {couriers.map((c, i) => (
        <div className="courier" key={c.id}>
          <span className={"avatar a" + (i % 3)}>{c.name.slice(0, 1)}</span>
          <div>
            <b>{c.name}</b>
            <small>Куриер {num(c.id)}</small>
          </div>
          <span className={"presence " + (c.is_available ? "free" : "")}>
            {c.is_available ? "Свободен" : "Недостъпен"}
          </span>
        </div>
      ))}
      {data && !couriers.length && (
        <p className="empty">Няма регистрирани куриери.</p>
      )}
    </div>
  );
  const secs = Math.round(route?.travel_time_seconds ?? 0);
  const locked = loading || busy !== null || !!dbError;
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
            {(["Табло", "Поръчки", "Куриери"] as const).map((n, i) => (
              <button
                key={n}
                className={view === n ? "nav current" : "nav"}
                aria-current={view === n ? "page" : undefined}
                onClick={() => setView(n)}
              >
                <Icon name={["grid", "box", "bike"][i]} size={16} />
                {n}
              </button>
            ))}
          </nav>
          <span className="city">
            <Icon name="pin" size={15} />
            Пловдив
          </span>
        </div>
      </header>
      <main className="shell">
        <div className="hero">
          <Atlas />
          <div className="hero-copy">
            <span className="kicker">
              <i /> РЕСТОРАНТСКА ЛОГИСТИКА
            </span>
            <h1>
              {view === "Табло"
                ? "Диспечерски център"
                : view === "Поръчки"
                  ? "Регистър на поръчките"
                  : "Екип на терен"}
            </h1>
            <p>
              {view === "Табло"
                ? "Поръчки, куриери и маршрути на едно място."
                : view === "Поръчки"
                  ? "Проследи всяка поръчка от ресторанта до клиента."
                  : "Виж кои куриери могат да поемат следващата доставка."}
            </p>
          </div>
          <span className="hero-tag">
            ПЛОВДИВ <b>/</b> BG–PDV
          </span>
        </div>
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
                  <button
                    className="primary"
                    disabled={!places.length || locked}
                    onClick={() => setCreate(true)}
                  >
                    <Icon name="plus" size={16} />
                    Нова поръчка
                  </button>
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
                          "order " + (route?.order_id === o.id ? "chosen" : "")
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
                              ?.name ?? "Без куриер"}
                          </span>
                          <div>
                            <button
                              onClick={() => void showRoute(o.id)}
                              className="text-btn"
                            >
                              <Icon name="route" size={14} />
                              Маршрут
                            </button>
                            {next[o.status] && (
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
            </div>
            <aside>
              <section className="card map-card" ref={routePanel}>
                <div className="card-head">
                  <div>
                    <span className="eyebrow">НАВИГАЦИЯ</span>
                    <h2>Карта на маршрута</h2>
                  </div>
                  <span className="tag">A*</span>
                </div>
                {route ? (
                  <DispatchMap key={route.order_id} route={route} />
                ) : (
                  <div className="map-placeholder">
                    <div className="map-ghost" />
                    <div>
                      <span className="empty-ico">
                        <Icon name="route" size={26} />
                      </span>
                      <b>{finding ? "Изчисляване…" : "Избери маршрут"}</b>
                      <small>От поръчка или по номер</small>
                    </div>
                  </div>
                )}
                {routeErr && (
                  <p className="error" role="alert">
                    {routeErr}
                  </p>
                )}
                {route && (
                  <div className="route-info">
                    <b>{num(route.order_id)} · Ресторант → клиент</b>
                    <span>
                      <Icon name="clock" size={15} />
                      {Math.floor(secs / 60)} мин {secs % 60} сек
                    </span>
                    <small>Прогнозно време за движение без текущ трафик.</small>
                  </div>
                )}
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
              {view === "Табло" && (
                <section className="card">
                  <div className="card-head">
                    <div>
                      <span className="eyebrow">НА ТЕРЕН</span>
                      <h2>Куриери</h2>
                    </div>
                    <button
                      className="text-btn"
                      onClick={() => setView("Куриери")}
                    >
                      Всички <Icon name="arrow" size={14} />
                    </button>
                  </div>
                  {courierList}
                </section>
              )}
            </aside>
          </div>
        )}
        <footer>
          <span>
            SwiftRoute <i>/</i> Оперативно табло
          </span>
          <span>Пловдив, България</span>
        </footer>
      </main>
      {create && (
        <NewOrder
          places={places}
          close={() => setCreate(false)}
          created={created}
        />
      )}
    </div>
  );
}
