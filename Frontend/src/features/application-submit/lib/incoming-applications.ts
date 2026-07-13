import type { Application, ApplicationSpecialMessage } from '@/entities/application/model/types'

export function filterIncomingApplications(
  applications: Application[],
  structuralUnitId?: string,
  canViewAll = false,
): Application[] {
  if (canViewAll) {
    return applications
  }

  if (!structuralUnitId) {
    return []
  }

  return applications.filter((application) =>
    application.structuralUnitIds.includes(structuralUnitId),
  )
}

export function getSpecialMessageForUnit(
  application: Application,
  structuralUnitId?: string,
): ApplicationSpecialMessage | undefined {
  if (!structuralUnitId) {
    return undefined
  }

  return application.specialMessages.find(
    (message) => message.structuralUnitId === structuralUnitId,
  )
}

export function hasSpecialMessageForUnit(
  application: Application,
  structuralUnitId?: string,
): boolean {
  return Boolean(getSpecialMessageForUnit(application, structuralUnitId))
}
