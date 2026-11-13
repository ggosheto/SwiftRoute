import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import RouteMap, { type RouteGeometry } from './components/RouteMap'
import CreateOrderForm from './components/CreateOrderForm'
import OrdersPanel from './components/OrdersPanel'
import './App.css'

type DeliveryRoute = {
  order_id: number
  travel_time_seconds: number
  geometry: RouteGeometry
}

function formatTravelTime(seconds: number): string {
  const totalSeconds = Math.round(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60

  return `${minutes} мин ${remainingSeconds} сек`
}

function App() {
  const [orderId, setOrderId] = useState('1')
  const [route, setRoute] = useState<DeliveryRoute | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0)

  const routeRequestId = useRef(0)

  async function showRoute(id: number) {
    const requestId = ++routeRequestId.current

    setOrderId(String(id))
    setRoute(null)
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch(`/api/orders/${id}/route`)

      if (!response.ok) {
        const body = await response.json().catch(() => null)

        throw new Error(
          typeof body?.detail === 'string'
            ? body.detail
            : `Маршрутът не беше зареден (HTTP ${response.status}).`,
        )
      }

      const data: DeliveryRoute = await response.json()

      if (requestId === routeRequestId.current) {
        setRoute(data)
      }
    } catch (error) {
      if (requestId === routeRequestId.current) {
        setError(
          error instanceof Error
            ? error.message
            : 'Не успяхме да заредим маршрута.',
        )
      }
    } finally {
      if (requestId === routeRequestId.current) {
        setIsLoading(false)
      }
    }
  }

  function loadRoute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const id = Number(orderId)

    if (!Number.isSafeInteger(id) || id < 1) {
      setError('Въведи положителен цял номер на поръчка.')
      return
    }

    void showRoute(id)
  }

  function handleOrderCreated(newOrderId: number) {
    routeRequestId.current += 1

    setOrderId(String(newOrderId))
    setRoute(null)
    setError('')
    setIsLoading(false)

    setOrdersRefreshKey((value) => value + 1)
  }

  return (
    <main>
      <header>
        <h1>SwiftRoute</h1>
        <p>Управление на поръчки, куриери и маршрути</p>
      </header>

      <CreateOrderForm onOrderCreated={handleOrderCreated} />

      <OrdersPanel
        refreshKey={ordersRefreshKey}
        onShowRoute={(id) => void showRoute(id)}
      />

      <section>
        <h2>Маршрут на поръчка</h2>

        <form onSubmit={loadRoute}>
          <label htmlFor="order-id">Номер на поръчката: </label>

          <input
            id="order-id"
            type="number"
            min="1"
            step="1"
            required
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
            disabled={isLoading}
          />

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Зареждане…' : 'Зареди маршрут'}
          </button>
        </form>

        {isLoading && <p role="status">Изчисляване на маршрута…</p>}

        {error && <p role="alert">{error}</p>}

        {route && (
          <>
            <p>
              Поръчка №{route.order_id} · Прогнозно време за движение:{' '}
              <strong>
                {formatTravelTime(route.travel_time_seconds)}
              </strong>
            </p>

            <p>
              От ресторанта до клиента. Без текущ трафик,
              подготовка и предаване на поръчката.
            </p>

            <RouteMap geometry={route.geometry} />
          </>
        )}
      </section>
    </main>
  )
}

export default App