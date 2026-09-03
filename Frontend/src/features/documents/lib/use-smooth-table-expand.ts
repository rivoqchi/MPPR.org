import { useCallback, useRef, useState, type Key } from 'react'
import { DOCUMENT_EXPAND_MS } from '@/features/documents/ui/DocumentExpandedPanel'

/** Accordion: one open row, smooth close before unmount. */
export function useSmoothTableExpand() {
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])
  const [panelOpen, setPanelOpen] = useState(true)
  const closeTimerRef = useRef<number | null>(null)

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const onExpandedRowsChange = useCallback(
    (keys: readonly Key[]) => {
      const nextKeys = keys.map(String)
      const nextKey = nextKeys.length > 0 ? nextKeys[nextKeys.length - 1] : null
      const currentKey = expandedRowKeys[0] ?? null

      clearCloseTimer()

      if (!nextKey) {
        setPanelOpen(false)
        closeTimerRef.current = window.setTimeout(() => {
          setExpandedRowKeys([])
          setPanelOpen(true)
          closeTimerRef.current = null
        }, DOCUMENT_EXPAND_MS)
        return
      }

      if (currentKey && currentKey !== nextKey) {
        setPanelOpen(false)
        closeTimerRef.current = window.setTimeout(() => {
          setExpandedRowKeys([nextKey])
          setPanelOpen(true)
          closeTimerRef.current = null
        }, DOCUMENT_EXPAND_MS)
        return
      }

      setPanelOpen(true)
      setExpandedRowKeys([nextKey])
    },
    [clearCloseTimer, expandedRowKeys],
  )

  const collapseRow = useCallback(
    (rowId: string) => {
      if (expandedRowKeys[0] !== rowId) {
        return
      }

      clearCloseTimer()
      setPanelOpen(false)
      closeTimerRef.current = window.setTimeout(() => {
        setExpandedRowKeys([])
        setPanelOpen(true)
        closeTimerRef.current = null
      }, DOCUMENT_EXPAND_MS)
    },
    [clearCloseTimer, expandedRowKeys],
  )

  return {
    expandedRowKeys,
    panelOpen,
    onExpandedRowsChange,
    collapseRow,
  }
}
