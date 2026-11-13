import { useEffect, useRef } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type Coordinate = [number, number]

export type RouteGeometry =
  | { type: 'LineString'; coordinates: Coordinate[] }
  | { type: 'Point'; coordinates: Coordinate }

type RouteMapProps = {
  geometry: RouteGeometry
}

export default function RouteMap({ geometry }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const map = L.map(containerRef.current)

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    const routeLayer = L.geoJSON(geometry, {
      style: {
        color: '#2457d6',
        weight: 5,
        opacity: 0.9,
      },
      pointToLayer: (_feature, latlng) =>
        L.circleMarker(latlng, { radius: 7, color: '#2457d6' }),
    }).addTo(map)

    map.fitBounds(routeLayer.getBounds(), {
      padding: [24, 24],
      maxZoom: 16,
    })

    return () => {
      map.remove()
    }
  }, [geometry])

  return (
    <div
      ref={containerRef}
      aria-label="Карта на маршрута от ресторанта до клиента"
      style={{ height: '380px', width: '100%' }}
    />
  )
}