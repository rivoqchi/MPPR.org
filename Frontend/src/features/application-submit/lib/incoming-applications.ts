import type { Application, ApplicationSpecialMessage } from '@/entities/application/model/types'
import type { StructuralUnit } from '@/entities/structural-unit/model/types'
import type { User } from '@/entities/user/model/types'
import { canReceiveIncomingApplication } from '@/features/application-submit/lib/application-targeting'

export function filterIncomingApplications(
  applications: Application[],
  options: {
    structuralUnitId?: string
    userId?: string
    canViewAll?: boolean
    structuralUnits: StructuralUnit[]
    users?: User[]
  },
): Application[] {
  if (options.canViewAll) {
    return applications
  }

  if (!options.structuralUnitId && !options.userId) {
    return []
  }

  return applications.filter((application) =>
    canReceiveIncomingApplication(application, {
      structuralUnitId: options.structuralUnitId,
      userId: options.userId,
      canViewAll: false,
      structuralUnits: options.structuralUnits,
      users: options.users,
    }),
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
