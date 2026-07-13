import { describe, expect, it, vi } from 'vitest'
import type { ApplicationWorkflowMessage } from '@/entities/application/model/types'
import {
  appendWorkflowMessage,
  handleWorkflowRealtimeEvent,
  notifyWorkflowMessage,
  subscribeWorkflowMessages,
} from '@/shared/lib/realtime/workflow-realtime'

const message: ApplicationWorkflowMessage = {
  id: 'msg-1',
  applicationId: 'app-1',
  authorUserId: 'user-1',
  content: 'Salom',
  attachments: [],
  createdAt: '2026-07-13T00:00:00.000Z',
}

describe('workflow realtime', () => {
  it('appends unique workflow messages', () => {
    expect(appendWorkflowMessage([], message)).toEqual([message])
    expect(appendWorkflowMessage([message], message)).toEqual([message])
  })

  it('notifies subscribed listeners for workflow events', () => {
    const listener = vi.fn()

    const unsubscribe = subscribeWorkflowMessages(listener)

    handleWorkflowRealtimeEvent({
      entity: 'application-workflow',
      action: 'create',
      data: {
        applicationId: 'app-1',
        message,
      },
    })

    expect(listener).toHaveBeenCalledWith({
      applicationId: 'app-1',
      message,
    })

    unsubscribe()
    notifyWorkflowMessage({ applicationId: 'app-1', message })
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
