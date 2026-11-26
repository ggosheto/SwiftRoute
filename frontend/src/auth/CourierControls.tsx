import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Courier } from "../ui/dispatch";

export default function CourierControls({ courier, disabled, active, save, allowDeviceLocation = false }: {
  courier: Courier;
  disabled: boolean;
  active: boolean;
  allowDeviceLocation?: boolean;
  save: (kind: "availability" | "location", values: object) => Promise<void>;
}) {
  const [latitude, setLatitude] = useState(String(courier.latitude));
  const [longitude, setLongitude] = useState(String(courier.longitude));
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const request = useRef(0);
  const finding = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stopLocation() {
    request.current++;
    finding.current = false;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }
  useEffect(() => {
    if (disabled || !allowDeviceLocation) {
      stopLocation();
      setLocating(false);
    }
    return stopLocation;
  }, [disabled, allowDeviceLocation]);

  function locate() {
    if (disabled || !allowDeviceLocation || finding.current) return;
    setLocationError("");
    setLocationNote("");
    if (!window.isSecureContext) {
      setLocationError("Отвори сайта през HTTPS, за да използваш местоположението.");
      return;
    }
    if (!navigator.geolocation) {
      setLocationError("Браузърът не поддържа определяне на местоположение. Въведи координатите ръчно.");
      return;
    }
    finding.current = true;
    setLocating(true);
    const id = ++request.current;
    const finish = () => {
      if (id !== request.current) return false;
      stopLocation();
      setLocating(false);
      return true;
    };
    // Ограничаваме и чакането на отговор от диалога за разрешение.
    timer.current = setTimeout(() => {
      if (finish()) setLocationError("Определянето на местоположението се забави. Провери разрешението и опитай отново.");
    }, 25000);
    try {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (!finish()) return;
          if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)
            || Math.abs(coords.latitude) > 90 || Math.abs(coords.longitude) > 180) {
            setLocationError("Устройството върна невалидни координати. Опитай отново.");
            return;
          }
          setLatitude(coords.latitude.toFixed(6));
          setLongitude(coords.longitude.toFixed(6));
          const accuracy = Number.isFinite(coords.accuracy) && coords.accuracy >= 0
            ? ` Отчетена точност: около ${Math.ceil(coords.accuracy)} м.` : "";
          setLocationNote(`Координатите са попълнени.${accuracy} Провери ги и натисни „Запази местоположението“.`);
        },
        (error) => {
          if (!finish()) return;
          const messages: Record<number, string> = {
            1: "Достъпът до местоположението е отказан. Разреши го от настройките на сайта или въведи координатите ръчно.",
            2: "Местоположението не е достъпно. Провери услугите за местоположение на устройството и опитай отново.",
            3: "Времето за определяне на местоположението изтече. Опитай отново или въведи координатите ръчно.",
          };
          setLocationError(messages[error.code] ?? "Не успяхме да определим местоположението. Въведи координатите ръчно.");
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    } catch {
      if (finish()) setLocationError("Браузърът не позволи определяне на местоположението. Въведи координатите ръчно.");
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || finding.current) return;
    setLocationNote("");
    void save("location", { latitude: Number(latitude), longitude: Number(longitude) });
  }
  const locked = disabled || locating;
  return <div className="courier-controls">
    <button className="secondary" disabled={locked || (!courier.is_available && active)}
      onClick={() => void save("availability", { is_available: !courier.is_available })}>
      {courier.is_available ? "Стани недостъпен" : "Готов за поръчки"}
    </button>
    {active && <p>Има активна доставка. Наличността се освобождава след доставянето.</p>}
    <form className="courier-location-form" onSubmit={submit} aria-label={`Местоположение на ${courier.name}`}>
      <label>Географска ширина
        <input type="number" step="any" min="-90" max="90" required disabled={locked}
          value={latitude} onChange={(e) => { setLatitude(e.target.value); setLocationNote(""); }} />
      </label>
      <label>Географска дължина
        <input type="number" step="any" min="-180" max="180" required disabled={locked}
          value={longitude} onChange={(e) => { setLongitude(e.target.value); setLocationNote(""); }} />
      </label>
      {allowDeviceLocation && <>
        <button className="secondary" type="button" disabled={locked} onClick={locate}>
          {locating ? "Определяне на местоположението…" : "Моето местоположение"}
        </button>
        {locating && <button className="secondary" type="button" onClick={() => {
          stopLocation(); setLocating(false); setLocationNote("Определянето на местоположението е отменено.");
        }}>Отказ</button>}
        <p>Демо маршрутите обхващат част от Пловдив. Извън този район използвай тестови координати в него.</p>
      </>}
      {locationError && <p role="alert">{locationError}</p>}
      {locationNote && <p role="status">{locationNote}</p>}
      <button className="secondary" type="submit" disabled={locked}>Запази местоположението</button>
    </form>
  </div>;
}
