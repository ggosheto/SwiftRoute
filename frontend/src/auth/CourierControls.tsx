import { useState } from "react";
import type { FormEvent } from "react";
import type { Courier } from "../ui/dispatch";

export default function CourierControls({ courier, disabled, active, save }: {
  courier: Courier;
  disabled: boolean;
  active: boolean;
  save: (kind: "availability" | "location", values: object) => Promise<void>;
}) {
  const [latitude, setLatitude] = useState(String(courier.latitude));
  const [longitude, setLongitude] = useState(String(courier.longitude));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    void save("location", { latitude: Number(latitude), longitude: Number(longitude) });
  }
  return <div className="courier-controls">
    <button className="secondary" disabled={disabled || (!courier.is_available && active)}
      onClick={() => void save("availability", { is_available: !courier.is_available })}>
      {courier.is_available ? "Стани недостъпен" : "Готов за поръчки"}
    </button>
    {active && <p>Има активна доставка. Наличността се освобождава след доставянето.</p>}
    <form className="courier-location-form" onSubmit={submit} aria-label={`Местоположение на ${courier.name}`}>
      <label>Географска ширина
        <input type="number" step="any" min="-90" max="90" required disabled={disabled}
          value={latitude} onChange={(e) => setLatitude(e.target.value)} />
      </label>
      <label>Географска дължина
        <input type="number" step="any" min="-180" max="180" required disabled={disabled}
          value={longitude} onChange={(e) => setLongitude(e.target.value)} />
      </label>
      <button className="secondary" type="submit" disabled={disabled}>Запази местоположението</button>
    </form>
  </div>;
}
