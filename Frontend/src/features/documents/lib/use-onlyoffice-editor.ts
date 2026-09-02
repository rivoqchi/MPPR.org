import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type OnlyOfficeConnector = {
  callCommand?: (
    command: () => void,
    callback?: () => void,
  ) => void
  executeMethod?: (
    method: string,
    args: unknown[],
    callback?: () => void,
  ) => void
}

export type OnlyOfficeEditorInstance = {
  destroyEditor?: () => void
  serviceCommand?: (command: string, data: string) => void
  createConnector?: () => OnlyOfficeConnector
}

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (
        placeholderId: string,
        config: Record<string, unknown>,
      ) => OnlyOfficeEditorInstance
    }
    Asc?: {
      scope?: Record<string, unknown>
    }
  }

  // OnlyOffice executes this in the editor sandbox.
  const Api: {
    GetDocument: () => {
      InsertContent: (elements: unknown[], checkLock?: boolean) => void
    }
    CreateParagraph: () => {
      AddDrawing: (drawing: unknown) => void
    }
    CreateImage: (url: string, width: number, height: number) => unknown
  }

  const Asc: {
    scope: Record<string, unknown>
  }
}

let scriptPromise: Promise<void> | null = null

function loadOnlyOfficeScript(documentServerUrl: string): Promise<void> {
  if (window.DocsAPI) {
    return Promise.resolve()
  }

  if (scriptPromise) {
    return scriptPromise
  }

  const src = `${documentServerUrl.replace(/\/$/, '')}/web-apps/apps/api/documents/api.js`

  scriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[data-onlyoffice-api="true"]`)

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('ONLYOFFICE_SCRIPT_FAILED')), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.onlyofficeApi = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('ONLYOFFICE_SCRIPT_FAILED'))
    document.body.appendChild(script)
  })

  return scriptPromise
}

interface UseOnlyOfficeEditorOptions {
  placeholderId: string
  documentServerUrl: string
  config: Record<string, unknown> | null
  enabled: boolean
  onScriptError?: () => void
  onDocumentReady?: () => void
}

export function useOnlyOfficeEditor({
  placeholderId,
  documentServerUrl,
  config,
  enabled,
  onScriptError,
  onDocumentReady,
}: UseOnlyOfficeEditorOptions) {
  const editorRef = useRef<OnlyOfficeEditorInstance | null>(null)
  const connectorRef = useRef<OnlyOfficeConnector | null>(null)
  const onDocumentReadyRef = useRef(onDocumentReady)
  const [isReady, setIsReady] = useState(false)
  const [isDocumentReady, setIsDocumentReady] = useState(false)
  const [hasConnector, setHasConnector] = useState(false)

  useEffect(() => {
    onDocumentReadyRef.current = onDocumentReady
  }, [onDocumentReady])

  const mergedConfig = useMemo(() => {
    if (!config) {
      return null
    }

    const existingEvents = (config.events as Record<string, unknown> | undefined) ?? {}

    return {
      ...config,
      events: {
        ...existingEvents,
        onDocumentReady: () => {
          if (typeof existingEvents.onDocumentReady === 'function') {
            ;(existingEvents.onDocumentReady as () => void)()
          }

          connectorRef.current = editorRef.current?.createConnector?.() ?? null
          setHasConnector(Boolean(connectorRef.current))
          setIsDocumentReady(true)
          onDocumentReadyRef.current?.()
        },
      },
    }
  }, [config])

  const triggerSave = useCallback(() => {
    editorRef.current?.serviceCommand?.('forcesave', '')
  }, [])

  const insertImageInDocument = useCallback((url: string, sizeMm = 28): Promise<boolean> => {
    return new Promise((resolve) => {
      const connector = connectorRef.current

      if (!connector) {
        resolve(false)
        return
      }

      const imageSize = sizeMm * 36000
      let settled = false

      const finish = (ok: boolean) => {
        if (settled) {
          return
        }
        settled = true
        resolve(ok)
      }

      const timeoutId = window.setTimeout(() => finish(false), 15_000)

      const clearAndFinish = (ok: boolean) => {
        window.clearTimeout(timeoutId)
        finish(ok)
      }

      if (connector.callCommand) {
        const asc = window.Asc ?? { scope: {} as Record<string, unknown> }
        window.Asc = asc
        asc.scope = {
          imageUrl: url,
          imageSize,
        }

        connector.callCommand(
          function insertQrCommand() {
            const doc = Api.GetDocument()
            const paragraph = Api.CreateParagraph()
            paragraph.AddDrawing(
              Api.CreateImage(
                Asc.scope.imageUrl as string,
                Asc.scope.imageSize as number,
                Asc.scope.imageSize as number,
              ),
            )
            doc.InsertContent([paragraph], true)
          },
          () => clearAndFinish(true),
        )
        return
      }

      if (connector.executeMethod) {
        connector.executeMethod('InsertPicture', [{ url, width: sizeMm, height: sizeMm }], () =>
          clearAndFinish(true),
        )
        return
      }

      clearAndFinish(false)
    })
  }, [])

  useEffect(() => {
    if (!enabled || !mergedConfig) {
      setIsReady(false)
      setIsDocumentReady(false)
      setHasConnector(false)
      connectorRef.current = null
      return
    }

    let cancelled = false

    loadOnlyOfficeScript(documentServerUrl)
      .then(() => {
        if (cancelled || !window.DocsAPI) {
          return
        }

        editorRef.current?.destroyEditor?.()
        editorRef.current = new window.DocsAPI.DocEditor(placeholderId, mergedConfig)

        if (!cancelled) {
          setIsReady(true)
        }
      })
      .catch(() => {
        onScriptError?.()
      })

    return () => {
      cancelled = true
      setIsReady(false)
      setIsDocumentReady(false)
      setHasConnector(false)
      connectorRef.current = null
      editorRef.current?.destroyEditor?.()
      editorRef.current = null
    }
  }, [documentServerUrl, enabled, mergedConfig, onScriptError, placeholderId])

  return {
    triggerSave,
    insertImageInDocument,
    isReady,
    isDocumentReady,
    hasConnector,
  }
}
