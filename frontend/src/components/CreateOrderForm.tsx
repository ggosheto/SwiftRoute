import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

type Restaurant = {
  id: number
  name: string
}

type CreateOrderFormProps = {
  onOrderCreated: (orderId: number) => void
}

export default function CreateOrderForm({ onOrderCreated }: CreateOrderFormProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [restaurantId, setRestaurantId] = useState('')
  const [latitude, setLatitude] = useState('42.15')
  const [longitude, setLongitude] = useState('24.76')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [createdId, setCreatedId] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadRestaurants() {
      try {
        const response = await fetch('/api/restaurants', {
          signal: controller.signal,
        })

        if (!response.ok) throw new Error()

        const data: Restaurant[] = await response.json()
        setRestaurants(data)

        if (data.length > 0) {
          setRestaurantId(String(data[0].id))
        } else {
          setError('Все още няма добавени ресторанти.')
        }
      } catch {
        if (!controller.signal.aborted) {
          setError('Списъкът с ресторанти не се зареди. Презареди страницата.')
        }
      }
    }

    loadRestaurants()
    return () => controller.abort()
  }, [])

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setCreatedId(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: Number(restaurantId),
          delivery_latitude: Number(latitude),
          delivery_longitude: Number(longitude),
        }),
      })

      if (!response.ok) {
        if (response.status === 404) {
          setError('Избраният ресторант не е намерен.')
        } else if (response.status === 422) {
          setError('Провери избрания ресторант и въведените координати.')
        } else {
          setError(`Поръчката не беше създадена (HTTP ${response.status}).`)
        }
        return
      }

      const order: { id: number } = await response.json()
      setCreatedId(order.id)
      onOrderCreated(order.id)
    } catch {
      setError('Не получихме потвърждение от сървъра. Провери списъка с поръчки, преди да опиташ отново.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section>
      <h2>Нова поръчка</h2>

      <form onSubmit={createOrder}>
        <p>
          <label htmlFor="restaurant">Ресторант: </label>
          <select
            id="restaurant"
            value={restaurantId}
            onChange={(event) => setRestaurantId(event.target.value)}
            required
          >
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </option>
            ))}
          </select>
        </p>

        <p>
          <label htmlFor="delivery-latitude">Ширина на адреса: </label>
          <input
            id="delivery-latitude"
            type="number"
            min="-90"
            max="90"
            step="any"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            required
          />
        </p>

        <p>
          <label htmlFor="delivery-longitude">Дължина на адреса: </label>
          <input
            id="delivery-longitude"
            type="number"
            min="-180"
            max="180"
            step="any"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            required
          />
        </p>

        <button type="submit" disabled={isSubmitting || !restaurantId}>
          {isSubmitting ? 'Създаване…' : 'Създай поръчка'}
        </button>
      </form>

      {error && <p role="alert">{error}</p>}
      {createdId !== null && (
        <p role="status">Поръчка №{createdId} е създадена и очаква куриер.</p>
      )}
    </section>
  )
}