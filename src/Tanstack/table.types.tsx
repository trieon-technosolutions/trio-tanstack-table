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
import { ForwardedRef, RefObject } from "react"
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

export interface OptionConfig {
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
}

type PaginationType = "virtual" | "pagination" | "cursor"

export type OmittedInternalTableProps<T> = Omit<InternalTableProps<T>, "table">

export interface ColumnState {
  persistenceType?: "localStorage"
  persistenceKey?: string
}

export interface SavedViewsOption {
  /** Stable identifier of this list page (saved views are stored per key per user) */
  listKey: string
}

export interface ServerExportOption {
  /** Key registered in the backend list-exports registry */
  listKey: string
  /** Page-scoped filters always sent with the export (e.g. config.api.defaultParams) */
  extraFilters?: Record<string, unknown>
}

export interface TanstackTableProps<T> extends OmittedInternalTableProps<T> {
  paginationType?: PaginationType
  pagination?: PaginationState
  /** Enables the per-user Saved Views control in the toolbar */
  savedViews?: SavedViewsOption
  /** Enables the server-side "Export All" CSV button in the toolbar */
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
  options?: OptionConfig | false
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
