import { create } from 'zustand'
import {
  createApplication as createApplicationApi,
  deleteApplication as deleteApplicationApi,
  fetchApplications,
  updateApplication as updateApplicationApi,
} from '@/shared/api/applications-api'
import { deleteApplicationFile } from '@/entities/application/lib/attachment-storage'
import type { Application, ApplicationFormValues, ApplicationStatus, ApplicationWorkflowStatus } from '@/entities/application/model/types'
import { ensureApplicationWorkflowUnitStatuses } from '@/features/application-workflow/lib/workflow-unit-status'

export const DEFAULT_APPLICATION_STATUS: ApplicationStatus = 'in_progress'
export const DEFAULT_WORKFLOW_STATUS: ApplicationWorkflowStatus = 'in_progress_work'

function normalizeApplication(application: Application): Application {
  return {
    ...application,
    status: application.status ?? DEFAULT_APPLICATION_STATUS,
    workflowStatus: application.workflowStatus ?? DEFAULT_WORKFLOW_STATUS,
    applicationNumber: application.applicationNumber ?? null,
    submissionMode: application.submissionMode === 'single' ? 'single' : 'combined',
    recipientUserIds: Array.isArray(application.recipientUserIds)
      ? application.recipientUserIds
      : [],
    structuralUnitIds: Array.isArray(application.structuralUnitIds)
      ? application.structuralUnitIds
      : [],
    structuralUnitSectionId: application.structuralUnitSectionId ?? null,
    workflowAssignments: Array.isArray(application.workflowAssignments)
      ? application.workflowAssignments
      : [],
    images: Array.isArray(application.images) ? application.images : [],
    files: Array.isArray(application.files) ? application.files : [],
    specialMessages: Array.isArray(application.specialMessages)
      ? application.specialMessages
      : [],
    confirmationFiles: Array.isArray(application.confirmationFiles)
      ? application.confirmationFiles
      : [],
    workflowUnitStatuses: ensureApplicationWorkflowUnitStatuses(application),
  }
}

interface ApplicationsState {
  applications: Application[]
  isHydrated: boolean
  setApplications: (applications: Application[]) => void
  hydrate: () => Promise<void>
  addApplication: (data: ApplicationFormValues) => Promise<Application>
  updateApplication: (id: string, data: Partial<ApplicationFormValues>) => Promise<Application | null>
  removeApplication: (id: string) => Promise<boolean>
}

export const useApplicationsStore = create<ApplicationsState>()((set, get) => ({
  applications: [],
  isHydrated: false,
  setApplications: (applications) =>
    set({
      applications: applications.map((application) => normalizeApplication(application)),
      isHydrated: true,
    }),
  hydrate: async () => {
    const applications = await fetchApplications()
    set({
      applications: applications.map((application) => normalizeApplication(application)),
      isHydrated: true,
    })
  },
  addApplication: async (data) => {
    const application = normalizeApplication(await createApplicationApi(data))
    set({ applications: [application, ...get().applications] })
    return application
  },
  updateApplication: async (id, data) => {
    const application = normalizeApplication(await updateApplicationApi(id, data))
    set({
      applications: get().applications.map((item) => (item.id === id ? application : item)),
    })
    return application
  },
  removeApplication: async (id) => {
    const application = get().applications.find((item) => item.id === id)

    if (!application) {
      return false
    }

    await deleteApplicationApi(id)

    await Promise.all(
      [...application.images, ...application.files].map((attachment) =>
        deleteApplicationFile(attachment.id),
      ),
    )

    set({
      applications: get().applications.filter((item) => item.id !== id),
    })

    return true
  },
}))
