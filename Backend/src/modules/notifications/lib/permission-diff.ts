type PagePermission = {
  pageKey: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

const ACTION_LABELS: Record<keyof Omit<PagePermission, 'pageKey'>, string> = {
  canView: "ko'rish",
  canCreate: 'yaratish',
  canEdit: 'tahrirlash',
  canDelete: "o'chirish",
};

const PAGE_LABELS: Record<string, string> = {
  '/': 'Bosh sahifa',
  '/guide': "Qo'llanma",
  '/settings': 'Sozlamalar',
  '/applications/submit': 'Dastur yuborish',
  '/applications/incoming': 'Kiruvchi dasturlar',
  '/applications/calendar': 'Dastur taqvimi',
  '/ppr-calendar': 'PPR taqvimi',
  '/registration/ppr-type': 'PPR turi',
  '/registration/structural-units': 'Tashkiliy bo\'limlar',
  '/registration/objects': 'Obyektlar',
  '/management/users': 'Foydalanuvchilar',
  '/management/roles': 'Rollar',
  '/profile': 'Profil',
};

function formatPermissionActions(permission: PagePermission): string[] {
  const actions: string[] = [];

  if (permission.canView) actions.push(ACTION_LABELS.canView);
  if (permission.canCreate) actions.push(ACTION_LABELS.canCreate);
  if (permission.canEdit) actions.push(ACTION_LABELS.canEdit);
  if (permission.canDelete) actions.push(ACTION_LABELS.canDelete);

  return actions;
}

function permissionKey(permission: PagePermission): string {
  return `${permission.pageKey}:${permission.canView}:${permission.canCreate}:${permission.canEdit}:${permission.canDelete}`;
}

export function summarizePermissionChanges(
  before: PagePermission[],
  after: PagePermission[],
): string | null {
  const beforeMap = new Map(before.map((item) => [item.pageKey, item]));
  const afterMap = new Map(after.map((item) => [item.pageKey, item]));
  const added: string[] = [];
  const removed: string[] = [];

  for (const [pageKey, nextPermission] of afterMap) {
    const previousPermission = beforeMap.get(pageKey);

    if (!previousPermission) {
      const actions = formatPermissionActions(nextPermission);
      if (actions.length > 0) {
        added.push(`${PAGE_LABELS[pageKey] ?? pageKey} (${actions.join(', ')})`);
      }
      continue;
    }

    if (permissionKey(previousPermission) !== permissionKey(nextPermission)) {
      const actions = formatPermissionActions(nextPermission);
      if (actions.length > 0) {
        added.push(`${PAGE_LABELS[pageKey] ?? pageKey} (${actions.join(', ')})`);
      }
    }
  }

  for (const [pageKey, previousPermission] of beforeMap) {
    const nextPermission = afterMap.get(pageKey);

    if (!nextPermission) {
      const actions = formatPermissionActions(previousPermission);
      if (actions.length > 0) {
        removed.push(`${PAGE_LABELS[pageKey] ?? pageKey} (${actions.join(', ')})`);
      }
    }
  }

  const parts: string[] = [];

  if (added.length > 0) {
    parts.push(`Qo'shildi: ${added.join('; ')}`);
  }

  if (removed.length > 0) {
    parts.push(`Olib tashlandi: ${removed.join('; ')}`);
  }

  return parts.length > 0 ? parts.join('. ') : null;
}
