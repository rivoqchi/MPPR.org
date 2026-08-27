export type ApplicationType = 'execution' | 'information'

export type ApplicationSubmissionMode = 'single' | 'combined'

export type ApplicationNumberMode = 'auto' | 'manual'

export type ApplicationStatus = 'in_progress' | 'completed' | 'cancelled'

export type ApplicationWorkflowStatus =
  | 'returned'
  | 'in_progress_work'
  | 'pending_confirmation'
  | 'confirmed'
  | 'cancelled'

export type WorkflowAssignmentStatus =
  | 'pending_accept'
  | 'accepted'
  | 'replied'
  | 'forwarded'
  | 'released'

export interface ApplicationWorkflowUnitStatus {
  structuralUnitId: string
  workflowStatus: ApplicationWorkflowStatus
  confirmationFiles: ApplicationAttachment[]
}

export interface WorkflowAssignment {
  id: string
  userId: string
  assignedByUserId: string
  parentAssignmentId: string | null
  status: WorkflowAssignmentStatus
  replyMessageId?: string | null
  forwardedToAssignmentId?: string | null
  acceptedAt?: string | null
  repliedAt?: string | null
  releasedAt?: string | null
  createdAt: string
}

export interface ApplicationAttachment {
  id: string
  name: string
  size: number
  mimeType: string
  kind: 'image' | 'file'
  dataUrl?: string
}

export interface ApplicationSpecialMessage {
  structuralUnitId: string
  message: string
}

export interface Application {
  id: string
  applicationNumber?: string | null
  submissionMode: ApplicationSubmissionMode
  recipientUserIds: string[]
  structuralUnitIds: string[]
  structuralUnitSectionId?: string | null
  type: ApplicationType
  status: ApplicationStatus
  workflowStatus: ApplicationWorkflowStatus
  workflowUnitStatuses: ApplicationWorkflowUnitStatus[]
  workflowAssignments: WorkflowAssignment[]
  deadline?: string
  images: ApplicationAttachment[]
  files: ApplicationAttachment[]
  comment: string
  specialMessages: ApplicationSpecialMessage[]
  confirmationFiles: ApplicationAttachment[]
  createdByUserId: string
  createdByFirstName?: string
  createdByLastName?: string
  createdByStructuralUnitId?: string
  createdAt: string
  updatedAt: string
}

export interface ApplicationFormValues {
  submissionMode?: ApplicationSubmissionMode
  numberMode: ApplicationNumberMode
  applicationNumber?: string | null
  recipientUserIds: string[]
  structuralUnitIds?: string[]
  structuralUnitSectionId?: string | null
  type: ApplicationType
  deadline?: string
  images: ApplicationAttachment[]
  files: ApplicationAttachment[]
  comment: string
  specialMessages: ApplicationSpecialMessage[]
}

export interface ApplicationWorkflowMessage {
  id: string
  applicationId: string
  authorUserId: string
  authorFirstName?: string
  authorLastName?: string
  authorStructuralUnitId?: string
  content: string
  attachments: ApplicationAttachment[]
  assignmentId?: string | null
  createdAt: string
  updatedAt?: string
}

export interface ApplicationWorkflowData {
  application: Application
  messages: ApplicationWorkflowMessage[]
}
