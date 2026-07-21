import type { CSSProperties } from 'react'

/** Yagona tashqi padding — barcha sahifalar devordan shu masofada turadi */
export const PAGE_CONTENT_PADDING = 15

/** Mobile va tablet uchun kontent padding */
export const MOBILE_PAGE_CONTENT_PADDING = 8

/** Filter/toolbar va kontent orasidagi vertikal masofa */
export const PAGE_SECTION_GAP = 12

/** Detail panel ichidagi padding (devordan emas) */
export const DETAIL_PANEL_PADDING = 15

/** Split-view panellar orasidagi gorizontal masofa */
export const SPLIT_PANEL_GAP = PAGE_SECTION_GAP

export const splitPanelShellStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

export const splitPanelScrollStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overflowX: 'hidden',
  overscrollBehavior: 'contain',
}

export const fullHeightPageStyle: CSSProperties = {
  flex: 1,
  alignSelf: 'stretch',
  minHeight: 0,
  minWidth: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

export const splitPageRowStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'row',
  overflow: 'hidden',
  gap: SPLIT_PANEL_GAP,
}

export const splitPagePrimaryPanelStyle: CSSProperties = {
  ...splitPanelShellStyle,
  flex: 1.2,
}

export function getSplitPanelSurfaceStyle(token: {
  colorBgContainer: string
  colorBorderSecondary: string
  borderRadiusLG: number
}): CSSProperties {
  return {
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    overflow: 'hidden',
  }
}

export function getSplitPanelListShellStyle(token: {
  colorBgContainer: string
  borderRadiusLG: number
}): CSSProperties {
  return {
    alignSelf: 'stretch',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    background: token.colorBgContainer,
    borderRadius: token.borderRadiusLG,
    overflow: 'hidden',
  }
}

export const scrollablePageStyle: CSSProperties = {
  flex: 1,
  alignSelf: 'stretch',
  minHeight: 0,
  minWidth: 0,
  width: '100%',
  height: '100%',
  overflowY: 'auto',
  overflowX: 'hidden',
  overscrollBehavior: 'contain',
}

export const pageToolbarStyle: CSSProperties = {
  flexShrink: 0,
  marginBottom: PAGE_SECTION_GAP,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  flexWrap: 'wrap',
  width: '100%',
}

export const pageToolbarActionStyle: CSSProperties = {
  marginLeft: 'auto',
  flexShrink: 0,
}

export const detailPanelScrollStyle: CSSProperties = {
  ...splitPanelScrollStyle,
  padding: DETAIL_PANEL_PADDING,
}

/** Split-view o'ng panel: tepasi chap jadval bilan bir tekis */
export const splitDetailPanelScrollStyle: CSSProperties = {
  ...splitPanelScrollStyle,
  padding: `0 0 ${DETAIL_PANEL_PADDING}px`,
}

export function getDetailPanelCardStyle(token: {
  colorBgContainer: string
  borderRadiusLG: number
}): CSSProperties {
  return {
    width: '100%',
    background: token.colorBgContainer,
    borderRadius: token.borderRadiusLG,
    padding: DETAIL_PANEL_PADDING,
  }
}

export function getSplitDetailPanelCardStyle(token: {
  colorBgContainer: string
  borderRadiusLG: number
}): CSSProperties {
  return {
    ...getDetailPanelCardStyle(token),
    borderRadius: `0 0 ${token.borderRadiusLG}px ${token.borderRadiusLG}px`,
  }
}
