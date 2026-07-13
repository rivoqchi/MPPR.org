import { api } from '@/shared/api/axios'
import { unwrapApiResponse } from '@/shared/api/client'
import type {
  Application,
  ApplicationAttachment,
  ApplicationWorkflowData,
  ApplicationWorkflowMessage,
  ApplicationWorkflowStatus,
} from '@/entities/application/model/types'

export async function fetchApplicationWorkflow(
  applicationId: string,
): Promise<ApplicationWorkflowData> {
  const response = await api.get(`/applications/${applicationId}/workflow`)
  return unwrapApiResponse<ApplicationWorkflowData>(response)
}

export async function sendWorkflowMessage(
  applicationId: string,
  data: { content?: string; attachments?: ApplicationAttachment[] },
): Promise<ApplicationWorkflowMessage> {
  const response = await api.post(`/applications/${applicationId}/workflow/messages`, data)
  return unwrapApiResponse<ApplicationWorkflowMessage>(response)
}

export async function updateWorkflowStatus(
  applicationId: string,
  data: {
    workflowStatus: ApplicationWorkflowStatus
    confirmationFiles?: ApplicationAttachment[]
  },
): Promise<Application> {
  const response = await api.patch(`/applications/${applicationId}/workflow/status`, data)
  return unwrapApiResponse<Application>(response)
}

export async function confirmApplicationWorkflow(applicationId: string): Promise<Application> {
  const response = await api.post(`/applications/${applicationId}/workflow/confirm`)
  return unwrapApiResponse<Application>(response)
}

export async function cancelApplicationWorkflow(applicationId: string): Promise<Application> {
  const response = await api.post(`/applications/${applicationId}/workflow/cancel`)
  return unwrapApiResponse<Application>(response)
}
