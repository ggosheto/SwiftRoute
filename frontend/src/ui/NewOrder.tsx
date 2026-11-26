import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { api, message } from "./dispatch";
import type { Order, Place } from "./dispatch";
import { Icon } from "./DispatchVisuals";

export default function NewOrder({
  places,
  close,
  created,
}: {
  places: Place[];
  close: () => void;
  created: (o: Order) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    sending = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending.current) return;
    const fields = new FormData(e.currentTarget);
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const order = await api<Order>("/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: Number(fields.get("restaurant")),
          delivery_latitude: Number(fields.get("lat")),
          delivery_longitude: Number(fields.get("lon")),
        }),
      });
      created(order);
    } catch (err) {
      setError(message(err));
      sending.current = false;
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="new-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
    >
      <div className="dialog-head">
        <span className="eyebrow">ДИСПЕЧЕРСКИ ЦЕНТЪР</span>
        <button
          className="icon"
          aria-label="Затвори"
          disabled={busy}
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </div>
      <h2 id="new-title">Нова поръчка</h2>
      <p className="muted">
        Избери ресторанта и въведи координатите на клиента в синята демо зона,
        обозначена върху картата. Зоната обхваща част от Пловдив.
      </p>
      <form onSubmit={submit}>
        <label>
          Ресторант
          <select name="restaurant" required>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="field-pair">
          <label>
            Географска ширина
            <input
              type="number"
              name="lat"
              step="any"
              min="-90"
              max="90"
              placeholder="42.1500"
              required
            />
          </label>
          <label>
            Географска дължина
            <input
              type="number"
              name="lon"
              step="any"
              min="-180"
              max="180"
              placeholder="24.7600"
              required
            />
          </label>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-foot">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={close}
          >
            Отказ
          </button>
          <button className="primary" disabled={busy || !places.length}>
            {busy ? "Създаване…" : "Създай поръчка"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
