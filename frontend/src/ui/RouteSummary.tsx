import { formatTravelTime } from "./dispatch";
import type { DeliveryRoute, PickupRoute } from "./dispatch";
import "./routes.css";

export default function RouteSummary({
  delivery,
  pickup,
  note,
}: {
  delivery: DeliveryRoute | null;
  pickup: PickupRoute | null;
  note: string;
}) {
  const orderId = delivery?.order_id ?? pickup?.order_id;
  if (!orderId) return null;
  return (
    <div className="sr-route-summary" aria-live="polite">
      <b>Поръчка #{String(orderId).padStart(3, "0")}</b>
      {pickup && (
        <div className="sr-leg">
          <span><i className="sr-line sr-pickup" aria-hidden="true" />Куриер → ресторант</span>
          <strong>{formatTravelTime(pickup.travel_time_seconds)}</strong>
        </div>
      )}
      {delivery && (
        <div className="sr-leg">
          <span><i className="sr-line sr-delivery" aria-hidden="true" />Ресторант → клиент</span>
          <strong>{formatTravelTime(delivery.travel_time_seconds)}</strong>
        </div>
      )}
      {pickup && delivery && (
        <div className="sr-leg sr-total">
          <span>Общо движение</span>
          <strong>{formatTravelTime(pickup.travel_time_seconds + delivery.travel_time_seconds)}</strong>
        </div>
      )}
      {note && <p>{note}</p>}
      <small>
        Изчислени времена без текущ трафик, подготовка и изчакване.
        Позициите са свързани с най-близките върхове на пътната мрежа.
      </small>
    </div>
  );
}
