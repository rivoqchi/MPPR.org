export const DEFAULT_MAP_CENTER = {
  latitude: 41.2995,
  longitude: 69.2401,
}

const SCRIPT_ID = 'yandex-maps-script'

interface YMapsGeocodeResult {
  geoObjects: {
    get: (index: number) => {
      getAddressLine: () => string
      geometry: {
        getCoordinates: () => [number, number]
      }
    } | null
  }
}

interface YMapsInstance {
  ready: (callback: () => void) => void
  Map: new (
    element: HTMLElement,
    state: { center: [number, number]; zoom: number; controls?: string[] },
    options?: { suppressMapOpenBlock?: boolean },
  ) => {
    events: { add: (event: string, handler: (event: { get: (key: string) => [number, number] }) => void) => void }
    geoObjects: { add: (object: unknown) => void; remove: (object: unknown) => void }
    setCenter: (coords: [number, number], zoom?: number) => void
    destroy: () => void
  }
  Placemark: new (
    coords: [number, number],
    properties?: Record<string, string>,
    options?: { draggable?: boolean },
  ) => {
    geometry: {
      getCoordinates: () => [number, number]
      setCoordinates: (coords: [number, number]) => void
    }
    events: { add: (event: string, handler: () => void) => void }
  }
  geocode: (query: string | [number, number]) => Promise<YMapsGeocodeResult>
}

declare global {
  interface Window {
    ymaps?: YMapsInstance
  }
}

let loadPromise: Promise<YMapsInstance> | null = null

export function loadYandexMaps(): Promise<YMapsInstance> {
  if (window.ymaps) {
    return new Promise((resolve) => {
      window.ymaps!.ready(() => resolve(window.ymaps!))
    })
  }

  if (loadPromise) {
    return loadPromise
  }

  loadPromise = new Promise((resolve, reject) => {
    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY
    const params = new URLSearchParams({
      lang: 'ru_RU',
    })

    if (apiKey) {
      params.set('apikey', apiKey)
    }

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null

    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (!window.ymaps) {
          reject(new Error('Yandex Maps failed to load'))
          return
        }

        window.ymaps.ready(() => resolve(window.ymaps!))
      })
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = `https://api-maps.yandex.ru/2.1/?${params.toString()}`
    script.async = true

    script.onload = () => {
      if (!window.ymaps) {
        reject(new Error('Yandex Maps failed to load'))
        return
      }

      window.ymaps.ready(() => resolve(window.ymaps!))
    }

    script.onerror = () => {
      loadPromise = null
      reject(new Error('Failed to load Yandex Maps script'))
    }

    document.head.appendChild(script)
  })

  return loadPromise
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string> {
  const ymaps = await loadYandexMaps()
  const result = await ymaps.geocode([latitude, longitude])
  const first = result.geoObjects.get(0)

  return first?.getAddressLine() ?? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
}

export async function geocodeAddress(address: string): Promise<{
  latitude: number
  longitude: number
  address: string
} | null> {
  const ymaps = await loadYandexMaps()
  const result = await ymaps.geocode(address.trim())
  const first = result.geoObjects.get(0)

  if (!first) {
    return null
  }

  const [latitude, longitude] = first.geometry.getCoordinates()

  return {
    latitude,
    longitude,
    address: first.getAddressLine(),
  }
}

export function getYandexMapLink(latitude: number, longitude: number): string {
  return `https://yandex.com/maps/?pt=${longitude},${latitude}&z=16&l=map`
}
