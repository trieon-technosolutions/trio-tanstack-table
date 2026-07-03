import React from "react"

export interface TableViewState {
  columnOrder?: any
  columnVisibility?: any
  columnSizing?: any
  columnPinning?: any
  sorting?: any
  grouping?: any
  filters?: any
  searchParams?: any
  visibleColumns?: any
  globalSearch?: any
}

export interface ServerExportPayload {
  [key: string]: any
}

export interface SavedViewsControlProps {
  listKey: string
  getViewState: () => TableViewState
  applyViewState: (state: TableViewState) => void
  resetViewState: () => void
  hasInitialUrlState?: boolean
}

export const SavedViewsControl: React.FC<SavedViewsControlProps> = () => {
  return null
}

export interface ServerExportButtonProps {
  title?: string
  table?: any
  payload?: ServerExportPayload
  getPayload?: () => ServerExportPayload
  apiCall?: (payload: ServerExportPayload) => Promise<any>
  customExportButtons?: any
}

export const ServerExportButton: React.FC<ServerExportButtonProps> = () => {
  return null
}
