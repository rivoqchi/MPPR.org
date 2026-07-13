import { useRolesStore } from '@/entities/role/model/roles-store'

export function useRoleName(roleId?: string): string {
  const roles = useRolesStore((state) => state.roles)
  const role = roles.find((item) => item.id === roleId)

  return role?.name ?? roleId ?? '—'
}
