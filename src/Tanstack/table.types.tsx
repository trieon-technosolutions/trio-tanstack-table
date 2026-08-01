/* eslint-disable @typescript-eslint/no-explicit-any */
import { ProFieldValueEnumType } from "@ant-design/pro-components"
import {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  GroupingState,
  OnChangeFn,
  RowData,
  RowSelectionState,
  SortingState,
  Table,
  TableOptions,
  VisibilityState,
} from "@tanstack/react-table"
import { TabsProps } from "antd"
import type { MenuItemType } from "antd/es/menu/interface"
import type { AxiosInstance } from "axios"
import { ForwardedRef, ReactNode, RefObject } from "react"
import {
  ServerExportPayload,
  TableViewState,
} from "~/shared/components/SavedViews"
import { InternalTableProps } from "./InternalTable"
export interface RHFCardConfig {
  columns?: string[]
  gridColumns?: number
  hideLabels?: boolean
  badge?: {
    enabled?: boolean
    bgColor?: string
    fgColor?: string
    size?: number
  }
  className?: string
}
import { BaseInputProps, TableInputFieldTypes } from "./tableInput"

type FilterVariantOptions =
  | "search"
  | "select"
  | "range"
  | "multi-select"
  | "date"
  | "date-range"

export type GetComponentProps<DataType> = (
  data: DataType,
  index?: number,
) => React.HTMLAttributes<any> & React.TdHTMLAttributes<any>

export interface TableEditableCellProps extends Record<string, any> {
  valueType?: TableInputFieldTypes
  inputItemProps?: BaseInputProps
}

export interface GroupSummaryEntry {
  count: number
  total: string
}

export interface GroupSummaryResult {
  data: Array<{ key: unknown[]; label: string; count: number; total: string }>
  grandTotal: { count: number; total: string }
}

export interface RequestResponse<T> {
  data: T[]
  total?: number
  success: boolean
  nextCursor?: any
  /** Cursor mode: backend-authoritative "more rows exist" flag */
  hasNextPage?: boolean
  paginationMetadata?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
    nextCursor?: any
  }
  /**
   * Backend-computed grand totals for the FULL filtered set (e.g.
   * { totalDebit, totalCredit }). Rendered in the (sticky) footer so summary
   * rows stay correct no matter how many infinite-scroll pages are loaded —
   * never sum loaded rows on the client for financial totals.
   */
  summary?: Record<string, unknown>
}

export interface DataProps {
  rowIndex: number
  columnId: string
  value: unknown
}

export interface CustomTableMeta {
  /** Server group summary: key = JSON.stringify(group value path as strings) */
  groupSummary?: Map<string, GroupSummaryEntry>
  /** Backend grand totals for the full filtered set — read by column footers. */
  footerSummary?: Record<string, unknown>
  reload: () => void
  updateData: (rowIndex: number, columnId: string, value: any) => void
  updateEditRowKey: (keys: React.Key[]) => void
  updateDensity?: (density: DensityState) => void
  rowSelection?: {
    selectedRowKeys?: RowSelectionState
    onChange: (selectedRowKeys: React.Key[], selectedRows: any[]) => void
    selections?: MenuItemType[] | true
  }
  rowExpandable?: {
    onExpand: (selectedRowKeys: React.Key[], selectedRows: any[]) => void
  }
  onSearchParamsChange?: (params: Record<string, unknown>) => void
}

export interface CustomTableOptions<T> extends TableOptions<T> {
  meta?: CustomTableMeta
  onSearchParamsChange?: OnChangeFn<T>
}
export interface CustomTable<T> extends Omit<Table<T>, "options"> {
  options: CustomTableOptions<T>
}

export interface TanstackToolbarProps {
  options?: OptionConfig
  actions?: any[]
  menu?: ListToolBarHeaderMenuProps
  title?: React.ReactNode | string
  subTitle?: React.ReactNode | string
  table?: Table<unknown>
  ref?: ForwardedRef<TableRef | undefined>
  selectionCount?: number
  selectionActions?: React.ReactNode
  columnsStateKey?: string
}
export interface Editable {
  editedRowKey?: React.Key[]
  setEditedRowKey?: (keys: React.Key[]) => void
  onDataSourceChange: ({ record, recordList }: any) => void
}

// note Define the properties you want to omit
type OmittedProps =
  | "data"
  | "columns"
  | "getFilteredRowModel"
  | "getSortedRowModel"
  | "getCoreRowModel"
  | "getGroupedRowModel"
  | "getExpandedRowModel"
  | "getFacetedRowModel"
  | "getFacetedUniqueValues"
  | "getFacetedMinMaxValues"
  | "getPaginationRowModel"
  | "filterFns"

// note Create a new type that omits the specified properties
export type OmittedTableProps<T> = Omit<TableOptions<T>, OmittedProps>

export interface TableRef {
  reload: () => void
  focus?: () => void
  blur?: () => void
  getTable?: () => Table<any>
  deleteRow?: (rowIndex: number) => void
  // validateAllRows?: () => Promise<boolean>
}

export interface OptionConfig<T = any> {
  reload?:
    | boolean
    | {
        icon?: React.ReactNode
        onClick?: () => void
      }
  search?:
    | boolean
    | {
        autoFocus?: boolean
        placeholder?: string
      }
  reloadIcon?: React.ReactNode
  /**
   * Export control in the toolbar. Pass a config (items + onClick) and the table
   * injects runtime context (table, selection, payload, apiClient) into each
   * handler — the consumer decides what happens (formatting, download, API call).
   * `true` renders the button shell with no items (a placeholder).
   */
  export?: boolean | TableActionConfig<T>
  /** Generic config-driven toolbar actions (Import, Print, Bulk, Share…). */
  actions?: TableActionConfig<T>[]
}

type PaginationType = "virtual" | "pagination" | "cursor"

export type OmittedInternalTableProps<T> = Omit<InternalTableProps<T>, "table">

export interface ColumnState {
  persistenceType?: "localStorage"
  persistenceKey?: string
}

/**
 * Wired callbacks the table hands to a Saved Views control. A custom control
 * (backend-backed or otherwise) uses these to capture/restore/reset table state.
 */
export interface SavedViewsApi {
  /** Stable identifier for this list (used as the storage/registry key). */
  listKey: string
  /** Serialize the current table state into a view snapshot. */
  getViewState: () => TableViewState
  /** Restore a saved snapshot (filters/sort/grouping/visibility + refetch). */
  applyViewState: (state: TableViewState) => void
  /** Clear back to the table's default state. */
  resetViewState: () => void
  /** True when the initial state came from the URL (control may skip auto-apply). */
  hasInitialUrlState?: boolean
}

export interface SavedViewsOption {
  /** Stable identifier of this list page (saved views are stored per key per user) */
  listKey: string
  /**
   * Render your own Saved Views control (e.g. backend-backed). Receives the
   * wired {@link SavedViewsApi}. When omitted, the package's built-in
   * localStorage-based control is used.
   */
  render?: (api: SavedViewsApi) => ReactNode
}

export interface ServerExportOption {
  /** Key registered in the backend list-exports registry */
  listKey: string
  /** Page-scoped filters always sent with the export (e.g. config.api.defaultParams) */
  extraFilters?: Record<string, unknown>
}

/**
 * Runtime context handed to every action handler. The table builds this and
 * injects it — consumers never construct it.
 */
export interface TableActionContext<T> {
  /** The full TanStack table instance (state, row models, columns, selection). */
  table: Table<T>
  /** Original row objects of the currently selected rows. */
  selectedRows: T[]
  /** Keys/ids of the currently selected rows. */
  selectedKeys: React.Key[]
  /** Builds the standard export payload (columns/filters/search/sort) from the
   *  current table state. A convenience — ignore it if you only need rows. */
  getPayload: () => ServerExportPayload
  /** The consumer's Axios instance from TableConfigProvider, if present. */
  apiClient?: AxiosInstance
}

/** A single action in a {@link TableActionConfig} (an antd-menuItem-like entry). */
export interface ActionItem<T> {
  key: string
  label: ReactNode
  icon?: ReactNode
  /** Hide the item entirely (use for permission gating). */
  hidden?: boolean
  /** Disable the item; may depend on current context (e.g. no selection). */
  disabled?: boolean | ((ctx: TableActionContext<T>) => boolean)
  danger?: boolean
  /** Do whatever you want on click. If it returns a Promise, the trigger shows
   *  a loading spinner until it resolves. */
  onClick?: (ctx: TableActionContext<T>) => void | Promise<void>
}

/**
 * Config-driven toolbar action (Export, Import, Print, Bulk…). One item renders
 * as a button; multiple render as a dropdown menu. The table injects the
 * runtime {@link TableActionContext} at render.
 */
export interface TableActionConfig<T> {
  /** Stable key for this action group. */
  key?: string
  items: ActionItem<T>[]
  /** Fallback handler used when an item has no own `onClick`. */
  onAction?: (item: ActionItem<T>, ctx: TableActionContext<T>) => void | Promise<void>
  /** Trigger label (dropdown) — defaults to "Export" via the Export preset. */
  label?: ReactNode
  icon?: ReactNode
  /** "auto" (default): button when 1 visible item, dropdown when >1. */
  trigger?: "button" | "dropdown" | "auto"
  /** Force loading state (overrides the auto-from-async-onClick behavior). */
  loading?: boolean
  disabled?: boolean
  /** Full custom rendering; receives a `trigger(key?)` fn and `loading` flag. */
  render?: (api: { trigger: (key?: string) => void; loading: boolean }) => ReactNode
}

export interface TanstackTableProps<T> extends OmittedInternalTableProps<T> {
  paginationType?: PaginationType
  pagination?: PaginationState
  /** Enables the per-user Saved Views control in the toolbar */
  savedViews?: SavedViewsOption
  /**
   * @deprecated Use `options.export` instead. This delegated to a host-provided
   * export button and coupled the table to a backend `listKey` registry.
   */
  serverExport?: ServerExportOption
  displayName?: string
  bordered?: boolean
  manualPagination?: boolean
  manualSorting?: boolean
  manualFiltering?: boolean
  manualGrouping?: boolean
  syncWithUrl?: boolean
  ref?: RefObject<TableRef | null>
  tableLoading?: boolean
  request?: (params: Record<string, unknown>) => Promise<RequestResponse<T>>
  /**
   * Group summary fetcher (counts + financial totals per group). When grouping
   * is active, called with the current grouping/filters/search; results power
   * the group headers independently of how many detail rows are loaded.
   */
  groupSummaryRequest?: (
    params: Record<string, unknown>,
  ) => Promise<GroupSummaryResult>
  dataSource?: T[]
  density?: DensityState
  refreshDeps?: any[]
  toolbar?: TanstackToolbarProps
  editable?: Editable
  tableProps?: OmittedTableProps<T>
  columns?: Array<ColumnDef<T, any>>
  columnsState?: ColumnState
  rowSelection?: {
    selectionType?: "checkbox" | "radio"
    selectedRowKeys?: RowSelectionState
    onChange: (selectedRowKeys: React.Key[], selectedRows: T[]) => void
    selections?: MenuItemType[] | true
  }
  rowExpandable?: {
    onExpand: (selectedRowKeys: React.Key[], selectedRows: T[]) => void
  }
  options?: OptionConfig<T> | false
  tableAlertOptionRender?: (
    selectedRowKeys: React.Key[],
    selectedRows: T[],
    onCleanSelected: () => void,
  ) => React.ReactNode
  cardConfig?: RHFCardConfig
}

export interface PaginationState {
  pageIndex: number
  pageSize: number
}

export type DensityState = "small" | "middle" | "large" | undefined
export interface CustomTableState {
  density: DensityState
  editedRowKey: React.Key[]
  columnPinningVersion: number
  columnVisibilityVersion: number
  columnSizingVersion: number
  groupingVersion: number
  searchParams: Record<string, unknown>
}

export interface _CustomColumnMeta<T, J> {
  filterVariant?: FilterVariantOptions | TableInputFieldTypes
  editable?: boolean
  valueType?: TableInputFieldTypes
  inputItemProps?: BaseInputProps | ((context: any) => BaseInputProps)
  valueEnum?: ProFieldValueEnumType | any
  render?: (value: J, record: T, index: number) => React.ReactNode
  hidden?: boolean
  transform?: (value: any) => Record<string, unknown>
  align?: "left" | "center" | "right"
  highlight?:
    | boolean
    | "danger"
    | "info"
    | "warning"
    | "success"
    | { backgroundColor?: string; color?: string; fontWeight?: number }
}
export interface CustomColumnMeta<T, J>
  extends Omit<_CustomColumnMeta<T, J>, "render"> {
  groupable?: boolean
}

declare module "@tanstack/react-table" {
  // note merge our new feature's state with the existing table state
  interface TableState extends CustomTableState {}

  interface ColumnMeta<TData extends RowData, TValue>
    extends CustomColumnMeta<TData, TValue> {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> extends CustomTableMeta {}

  interface FilterFns {
    ISODateFilter: FilterFn<unknown>
    BooleanFn: FilterFn<unknown>
  }
}

// note define types for our new feature's table options
export interface ListToolBarMenuItem {
  key: React.Key
  label: React.ReactNode
  disabled?: boolean
}
export interface ListToolBarHeaderMenuProps {
  type?: "dropdown" | "tab"
  activeKey?: TabsProps["activeKey"]
  defaultActiveKey?: TabsProps["defaultActiveKey"]
  items?: TabsProps["items"]
  onChange?: (activeKey?: React.Key) => void
  prefixCls?: string
}

export interface TanstackTableParams {
  page?: any
  limit?: any
  cursor?: any
  grouping?: GroupingState
  columnFilters?: ColumnFiltersState
  sort?: SortingState
  global_search_text?: string
  visible_columns?: VisibilityState
}
