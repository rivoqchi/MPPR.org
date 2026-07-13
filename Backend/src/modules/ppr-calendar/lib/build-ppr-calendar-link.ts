export function buildPprCalendarLinkPath(params: {
  year: number;
  month: number;
  structuralUnitId?: string;
  sectionId?: string | null;
  openApproval?: boolean;
}): string {
  const search = new URLSearchParams();
  search.set('year', String(params.year));
  search.set('month', String(params.month));

  if (params.structuralUnitId) {
    search.set('structuralUnitId', params.structuralUnitId);
  }

  if (params.sectionId) {
    search.set('sectionId', params.sectionId);
  }

  if (params.openApproval) {
    search.set('openApproval', '1');
  }

  return `/ppr-calendar?${search.toString()}`;
}
