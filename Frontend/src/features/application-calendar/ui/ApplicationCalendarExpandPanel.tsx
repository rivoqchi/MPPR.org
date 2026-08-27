import { useEffect, useState, type ReactNode } from 'react'

const EXPAND_MS = 420
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
export const CALENDAR_DAY_PANEL_MAX_HEIGHT = 260

interface ApplicationCalendarExpandPanelProps {
  open: boolean
  borderColor: string
  background: string
  boxShadow?: string
  children: ReactNode
}

export function ApplicationCalendarExpandPanel({
  open,
  borderColor,
  background,
  boxShadow,
  children,
}: ApplicationCalendarExpandPanelProps) {
  const [mounted, setMounted] = useState(open)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)

      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setExpanded(true)
        })
      })

      return () => cancelAnimationFrame(frame)
    }

    setExpanded(false)
    const timeout = window.setTimeout(() => {
      setMounted(false)
    }, EXPAND_MS)

    return () => window.clearTimeout(timeout)
  }, [open])

  if (!mounted) {
    return null
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: expanded ? '1fr' : '0fr',
        transition: `grid-template-rows ${EXPAND_MS}ms ${EASE}`,
        flexShrink: 0,
      }}
    >
      <div style={{ minHeight: 0, overflow: 'hidden' }}>
        <div
          style={{
            margin: '8px 10px 12px',
            padding: 10,
            borderRadius: 16,
            border: `2px solid ${borderColor}`,
            background,
            boxShadow,
            maxHeight: CALENDAR_DAY_PANEL_MAX_HEIGHT,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            opacity: expanded ? 1 : 0,
            transform: expanded ? 'translateY(0)' : 'translateY(-10px)',
            transition: `opacity ${EXPAND_MS - 40}ms ease, transform ${EXPAND_MS}ms ${EASE}`,
          }}
        >
          <div style={{ minHeight: 0, flex: 1, overflow: 'auto' }}>{children}</div>
        </div>
      </div>
    </div>
  )
}
