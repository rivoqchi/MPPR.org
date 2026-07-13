import type { ApplicationWorkflowMessage } from '@/entities/application/model/types'
import type { EntityChangeEvent } from '@/shared/api/types'

export interface WorkflowMessageEvent {
  applicationId: string
  message: ApplicationWorkflowMessage
}

type WorkflowMessageListener = (event: WorkflowMessageEvent) => void

const listeners = new Set<WorkflowMessageListener>()

function isWorkflowMessageEvent(data: unknown): data is WorkflowMessageEvent {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false
  }

  const event = data as Partial<WorkflowMessageEvent>

  return (
    typeof event.applicationId === 'string' &&
    Boolean(event.message) &&
    typeof event.message === 'object' &&
    typeof event.message.id === 'string'
  )
}

export function subscribeWorkflowMessages(listener: WorkflowMessageListener): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function notifyWorkflowMessage(event: WorkflowMessageEvent): void {
  listeners.forEach((listener) => listener(event))
}

export function handleWorkflowRealtimeEvent(event: EntityChangeEvent): void {
  if (event.entity !== 'application-workflow' || event.action !== 'create') {
    return
  }

  if (!isWorkflowMessageEvent(event.data)) {
    return
  }

  notifyWorkflowMessage(event.data)
}

export function appendWorkflowMessage(
  messages: ApplicationWorkflowMessage[],
  message: ApplicationWorkflowMessage,
): ApplicationWorkflowMessage[] {
  if (messages.some((item) => item.id === message.id)) {
    return messages
  }

  return [...messages, message]
}
