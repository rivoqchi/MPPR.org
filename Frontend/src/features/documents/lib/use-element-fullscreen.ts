import { useCallback, useEffect, useState } from 'react'

export function useElementFullscreen<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const ref = useCallback((node: T | null) => {
    setElement(node)
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === element)
      window.setTimeout(() => {
        window.dispatchEvent(new Event('resize'))
      }, 150)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [element])

  const toggleFullscreen = useCallback(async () => {
    if (!element) {
      return
    }

    try {
      if (document.fullscreenElement === element) {
        await document.exitFullscreen()
        return
      }

      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }

      await element.requestFullscreen()
    } catch {
      // Browser blocked fullscreen or API unavailable.
    }
  }, [element])

  return {
    ref,
    isFullscreen,
    toggleFullscreen,
  }
}
