export type Status =
  "pending" | "assigned" | "accepted" | "picked_up" | "delivered";
export type Order = {
  id: number;
  restaurant_id: number;
  courier_id: number | null;
  status: Status;
  delivery_latitude: number;
  delivery_longitude: number;
};
export type Place = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
};
export type Courier = Place & { is_available: boolean };
export type Point = [number, number];
export type Geometry =
  | { type: "LineString"; coordinates: Point[] }
  | { type: "Point"; coordinates: Point };
export type DeliveryRoute = {
  order_id: number;
  travel_time_seconds: number;
  geometry: Geometry;
};
export const labels: Record<Status, string> = {
  pending: "Очаква куриер",
  assigned: "Възложена",
  accepted: "Приета",
  picked_up: "В доставка",
  delivered: "Доставена",
};
export const next: Partial<Record<Status, { label: string; status: Status }>> =
  {
    pending: { label: "Назначи куриер", status: "assigned" },
    assigned: { label: "Приеми", status: "accepted" },
    accepted: { label: "Взех поръчката", status: "picked_up" },
    picked_up: { label: "Доставих", status: "delivered" },
  };
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, text: string) {
    super(text);
    this.name = "ApiError";
    this.status = status;
  }
}

let sessionGeneration = 0;
export function resetApiSession() { sessionGeneration++; }

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const generation = sessionGeneration;
  const stillCurrent = () => {
    if (generation !== sessionGeneration) throw new DOMException("Акаунтът е сменен.", "AbortError");
  };
  let response: Response;
  try {
    response = await fetch("/api" + url, {
      ...init, credentials: "same-origin", cache: "no-store",
    });
  } catch {
    stillCurrent();
    throw new Error("Няма връзка със сървъра. Провери дали backend и frontend работят.");
  }
  stillCurrent();
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    stillCurrent();
    if (response.status === 401 && !url.startsWith("/auth/")) {
      window.dispatchEvent(new Event("swiftroute:session-expired"));
    }
    throw new ApiError(response.status,
      typeof body?.detail === "string" ? body.detail
        : response.status === 422 ? "Провери въведените данни."
        : `Заявката не успя (HTTP ${response.status}).`,
    );
  }
  if (response.status === 204) return undefined as T;
  const data: T = await response.json();
  stillCurrent();
  return data;
}
export function message(e: unknown) {
  return e instanceof Error ? e.message : "Възникна грешка.";
}

export type PickupRoute = DeliveryRoute & {
  courier_id: number;
  restaurant_id: number;
  node_ids: number[];
};

export function formatTravelTime(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  return `${Math.floor(rounded / 60)} мин ${rounded % 60} сек`;
}
