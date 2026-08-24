export const NOTIFICATION_TYPES = {
  PPR_CALENDAR_SUBMITTED: 'ppr_calendar_submitted',
  PPR_CALENDAR_APPROVED: 'ppr_calendar_approved',
  PPR_CALENDAR_REJECTED: 'ppr_calendar_rejected',
  PPR_CALENDAR_ENTRY_MOVED: 'ppr_calendar_entry_moved',
  APPLICATION_CREATED: 'application_created',
  APPLICATION_WORKFLOW_MESSAGE: 'application_workflow_message',
  APPLICATION_WORKFLOW_STATUS: 'application_workflow_status',
  ROLE_PERMISSIONS_UPDATED: 'role_permissions_updated',
  USER_ROLE_CHANGED: 'user_role_changed',
  USER_ACCESS_CHANGED: 'user_access_changed',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
