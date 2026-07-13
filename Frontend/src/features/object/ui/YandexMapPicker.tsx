import { SearchOutlined } from '@ant-design/icons'
import { Alert, Button, Input, Space, Typography } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ObjectLocation } from '@/entities/object/model/types'
import {
  DEFAULT_MAP_CENTER,
  geocodeAddress,
  loadYandexMaps,
  reverseGeocode,
} from '@/features/object/lib/yandex-maps'

interface YandexMapPickerProps {
  value?: ObjectLocation | null
  onChange: (location: ObjectLocation) => void
  readOnly?: boolean
  height?: number
}

type YandexMap = {
  events: { add: (event: string, handler: (event: { get: (key: string) => [number, number] }) => void) => void }
  geoObjects: { add: (object: YandexPlacemark) => void }
  getZoom: () => number
  setCenter: (coords: [number, number], zoom?: number) => void
  destroy: () => void
}

type YandexPlacemark = {
  geometry: {
    getCoordinates: () => [number, number]
    setCoordinates: (coords: [number, number]) => void
  }
  events: { add: (event: string, handler: () => void) => void }
  properties: { set: (key: string, value: string) => void }
}

function coordsEqual(
  first: [number, number],
  second: [number, number],
  epsilon = 0.000001,
): boolean {
  return (
    Math.abs(first[0] - second[0]) < epsilon && Math.abs(first[1] - second[1]) < epsilon
  )
}

function getFallbackLocation(value?: ObjectLocation | null): ObjectLocation {
  return (
    value ?? {
      latitude: DEFAULT_MAP_CENTER.latitude,
      longitude: DEFAULT_MAP_CENTER.longitude,
      address: '',
    }
  )
}

export function YandexMapPicker({
  value,
  onChange,
  readOnly = false,
  height = 320,
}: YandexMapPickerProps) {
  const { t } = useTranslation()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<YandexMap | null>(null)
  const placemarkRef = useRef<YandexPlacemark | null>(null)
  const onChangeRef = useRef(onChange)
  const valueRef = useRef(value)
  const geocodeRequestRef = useRef(0)
  const [searchValue, setSearchValue] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)

  onChangeRef.current = onChange
  valueRef.current = value

  const emitLocation = (location: ObjectLocation) => {
    onChangeRef.current(location)
  }

  const updateLocationFromMap = (latitude: number, longitude: number) => {
    const currentAddress = valueRef.current?.address ?? ''

    emitLocation({
      latitude,
      longitude,
      address: currentAddress,
    })

    const requestId = geocodeRequestRef.current + 1
    geocodeRequestRef.current = requestId

    void reverseGeocode(latitude, longitude)
      .then((address) => {
        if (geocodeRequestRef.current !== requestId) {
          return
        }

        emitLocation({ latitude, longitude, address })
        placemarkRef.current?.properties.set('hintContent', address)
      })
      .catch(() => {
        if (geocodeRequestRef.current !== requestId) {
          return
        }

        const fallbackAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        emitLocation({ latitude, longitude, address: fallbackAddress })
        placemarkRef.current?.properties.set('hintContent', fallbackAddress)
      })
  }

  useEffect(() => {
    let isActive = true

    loadYandexMaps()
      .then((ymaps) => {
        if (!isActive || !mapContainerRef.current) {
          return
        }

        const initialLocation = getFallbackLocation(valueRef.current)
        const center: [number, number] = [
          initialLocation.latitude,
          initialLocation.longitude,
        ]

        const map = new ymaps.Map(
          mapContainerRef.current,
          {
            center,
            zoom: valueRef.current?.address ? 15 : 11,
            controls: readOnly ? ['zoomControl'] : ['zoomControl', 'geolocationControl'],
          },
          { suppressMapOpenBlock: true },
        ) as unknown as YandexMap

        const placemark = new ymaps.Placemark(
          center,
          { hintContent: initialLocation.address || t('object.map.selectedPoint') },
          { draggable: !readOnly },
        ) as unknown as YandexPlacemark

        map.geoObjects.add(placemark)

        if (!readOnly) {
          map.events.add('click', (event) => {
            const coords = event.get('coords')
            placemark.geometry.setCoordinates(coords)
            updateLocationFromMap(coords[0], coords[1])
          })

          placemark.events.add('dragend', () => {
            const coords = placemark.geometry.getCoordinates()
            updateLocationFromMap(coords[0], coords[1])
          })
        }

        mapRef.current = map
        placemarkRef.current = placemark
        setIsMapReady(true)
        setMapError(null)
      })
      .catch(() => {
        if (isActive) {
          setMapError(t('object.map.loadError'))
        }
      })

    return () => {
      isActive = false
      mapRef.current?.destroy()
      mapRef.current = null
      placemarkRef.current = null
      setIsMapReady(false)
    }
  }, [readOnly, t])

  useEffect(() => {
    if (!isMapReady || !value || !mapRef.current || !placemarkRef.current) {
      return
    }

    const nextCoords: [number, number] = [value.latitude, value.longitude]
    const currentCoords = placemarkRef.current.geometry.getCoordinates()

    if (coordsEqual(currentCoords, nextCoords)) {
      return
    }

    placemarkRef.current.geometry.setCoordinates(nextCoords)
    mapRef.current.setCenter(nextCoords, mapRef.current.getZoom())
    placemarkRef.current.properties.set(
      'hintContent',
      value.address || t('object.map.selectedPoint'),
    )
  }, [isMapReady, t, value?.address, value?.latitude, value?.longitude])

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      return
    }

    setIsSearching(true)

    try {
      const result = await geocodeAddress(searchValue)

      if (!result) {
        setMapError(t('object.map.searchNotFound'))
        return
      }

      geocodeRequestRef.current += 1
      emitLocation(result)
      setMapError(null)
    } catch {
      setMapError(t('object.map.searchError'))
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={12}>
      {!readOnly && (
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={t('object.map.searchPlaceholder')}
            onPressEnter={() => void handleSearch()}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            disabled={isSearching}
            onClick={() => void handleSearch()}
          >
            {t('object.map.search')}
          </Button>
        </Space.Compact>
      )}

      {mapError && <Alert type="warning" message={mapError} showIcon closable onClose={() => setMapError(null)} />}

      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height,
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid var(--ant-color-border-secondary)',
        }}
      />

      <Typography.Text type="secondary">
        {value?.address || (readOnly ? t('object.map.noAddress') : t('object.map.clickToSelect'))}
      </Typography.Text>

      {!readOnly && mapError && <ManualLocationFields value={value} onChange={emitLocation} />}
    </Space>
  )
}

interface ManualLocationFieldsProps {
  value?: ObjectLocation | null
  onChange: (location: ObjectLocation) => void
}

function ManualLocationFields({ value, onChange }: ManualLocationFieldsProps) {
  const { t } = useTranslation()

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Input
        value={value?.address ?? ''}
        placeholder={t('object.placeholders.address')}
        onChange={(event) =>
          onChange({
            latitude: value?.latitude ?? DEFAULT_MAP_CENTER.latitude,
            longitude: value?.longitude ?? DEFAULT_MAP_CENTER.longitude,
            address: event.target.value,
          })
        }
      />
      <Space>
        <Input
          type="number"
          value={value?.latitude ?? DEFAULT_MAP_CENTER.latitude}
          placeholder={t('object.fields.latitude')}
          onChange={(event) =>
            onChange({
              latitude: Number(event.target.value),
              longitude: value?.longitude ?? DEFAULT_MAP_CENTER.longitude,
              address: value?.address ?? '',
            })
          }
        />
        <Input
          type="number"
          value={value?.longitude ?? DEFAULT_MAP_CENTER.longitude}
          placeholder={t('object.fields.longitude')}
          onChange={(event) =>
            onChange({
              latitude: value?.latitude ?? DEFAULT_MAP_CENTER.latitude,
              longitude: Number(event.target.value),
              address: value?.address ?? '',
            })
          }
        />
      </Space>
    </Space>
  )
}
