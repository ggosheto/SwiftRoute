import { useEffect, useRef, useState } from 'react'

type OrderStatus =
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'picked_up'
  | 'delivered'

type Order = {
  id: number
  restaurant_id: number
  courier_id: number | null
  status: OrderStatus
}

type Restaurant = {
  id: number
  name: string
}

type Courier = {
  id: number
  name: string
  is_available: boolean
}

type Snapshot = {
  orders: Order[]
  restaurants: Restaurant[]
  couriers: Courier[]
}

type OrdersPanelProps = {
  refreshKey: number
  onShowRoute: (orderId: number) => void
}

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Очаква куриер',
  assigned: 'Възложена',
  accepted: 'Приета',
  picked_up: 'Взета от ресторанта',
  delivered: 'Доставена',
}

type OrderAction = {
  label: string
  nextStatus: 'accepted' | 'picked_up' | 'delivered' | null
}

const actions: Partial<Record<OrderStatus, OrderAction>> = {
  pending: {
    label: 'Назначи куриер',
    nextStatus: null,
  },
  assigned: {
    label: 'Приеми',
    nextStatus: 'accepted',
  },
  accepted: {
    label: 'Взех поръчката',
    nextStatus: 'picked_up',
  },
  picked_up: {
    label: 'Доставих',
    nextStatus: 'delivered',
  },
}

async function readJson<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, options)

  if (!response.ok) {
    const body = await response.json().catch(() => null)

    const message =
      typeof body?.detail === 'string'
        ? body.detail
        : `Заявката не успя (HTTP ${response.status}).`

    throw new Error(message)
  }

  return response.json()
}

export default function OrdersPanel({
  refreshKey,
  onShowRoute,
}: OrdersPanelProps) {
  const [snapshot, setSnapshot] = useState<Snapshot>({
    orders: [],
    restaurants: [],
    couriers: [],
  })

  const [reloadKey, setReloadKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')

  const actionInProgress = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    async function loadData() {
      setLoading(true)
      setLoadError('')

      try {
        const options = { signal: controller.signal }

        const [orders, restaurants, couriers] = await Promise.all([
          readJson<Order[]>('/api/orders', options),
          readJson<Restaurant[]>('/api/restaurants', options),
          readJson<Courier[]>('/api/couriers', options),
        ])

        if (active) {
          setSnapshot({ orders, restaurants, couriers })
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Данните не бяха заредени.',
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadData()

    return () => {
      active = false
      controller.abort()
    }
  }, [refreshKey, reloadKey])

  async function performAction(order: Order) {
    const action = actions[order.status]

    if (!action || actionInProgress.current) return

    actionInProgress.current = true
    setBusyOrderId(order.id)
    setActionError('')

    try {
      if (action.nextStatus === null) {
        await readJson<Order>(`/api/orders/${order.id}/assign`, {
          method: 'POST',
        })
      } else {
        await readJson<Order>(`/api/orders/${order.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: action.nextStatus }),
        })
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Невалиден отговор.'

      setActionError(
        `Не получихме потвърждение за действието: ${message} ` +
        'Провери обновените данни преди повторен опит.',
      )
    } finally {
      actionInProgress.current = false
      setBusyOrderId(null)
      setLoading(true)
      setReloadKey((value) => value + 1)
    }
  }

  const disabled =
    loading || busyOrderId !== null || loadError !== ''

  return (
    <section className="orders-panel">
      <div className="section-heading">
        <h2>Поръчки</h2>

        <button
          type="button"
          disabled={loading || busyOrderId !== null}
          onClick={() => {
            setLoading(true)
            setReloadKey((value) => value + 1)
          }}
        >
          Обнови списъка
        </button>
      </div>

      {loading && <p role="status">Обновяване на данните…</p>}

      {loadError && (
        <p role="alert">
          {loadError} Показаните по-долу данни може да са остарели.
        </p>
      )}

      {actionError && <p role="alert">{actionError}</p>}

      {!loading && !loadError && snapshot.orders.length === 0 && (
        <p>Все още няма поръчки. Създай първата от формата по-горе.</p>
      )}

      {snapshot.orders.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Ресторант</th>
                <th>Куриер</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>

            <tbody>
              {[...snapshot.orders].reverse().map((order) => {
                const restaurant = snapshot.restaurants.find(
                  (item) => item.id === order.restaurant_id,
                )

                const courier = snapshot.couriers.find(
                  (item) => item.id === order.courier_id,
                )

                const action = actions[order.status]

                return (
                  <tr key={order.id}>
                    <td>{order.id}</td>

                    <td>
                      {restaurant?.name ??
                        `Ресторант №${order.restaurant_id}`}
                    </td>

                    <td>
                      {order.courier_id === null
                        ? 'Не е назначен'
                        : courier?.name ?? `Куриер №${order.courier_id}`}
                    </td>

                    <td>{statusLabels[order.status]}</td>

                    <td>
                      <div className="order-actions">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => onShowRoute(order.id)}
                        >
                          Маршрут
                        </button>

                        {action && (
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => void performAction(order)}
                          >
                            {busyOrderId === order.id
                              ? 'Изпълнение…'
                              : action.label}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <h3>Наличност на куриерите</h3>

      <ul className="courier-list">
        {snapshot.couriers.map((courier) => (
          <li key={courier.id}>
            <strong>{courier.name}</strong>
            {' — '}
            {courier.is_available ? 'Свободен' : 'Недостъпен'}
          </li>
        ))}
      </ul>
    </section>
  )
}