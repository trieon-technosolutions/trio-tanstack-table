/* eslint-disable no-unsafe-optional-chaining */
/* eslint-disable react/display-name */
import { ReloadOutlined } from "@ant-design/icons"
import {
  ColumnDef,
  ColumnFiltersState,
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  ExpandedState,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  GroupingState,
  SortingState,
  Table,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import {
  useInfiniteScroll,
  useRequest,
  useSafeState,
  useUpdateEffect,
} from "ahooks"
import dayjs from "dayjs"
import isBetween from "dayjs/plugin/isBetween"
import React, {
  ForwardedRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  SavedViewsControl,
  ServerExportButton,
  ServerExportPayload,
  TableViewState,
} from "~/shared/components/SavedViews"
import { useAppTheme } from "~/theme"
import type { UrlFilterValue } from "./filter-url-utils"
import { GroupByDropDown } from "./GroupByDropDown"
import { InternalTable } from "./InternalTable"
import {
  CustomTableMeta,
  PaginationState,
  RequestResponse,
  TableRef,
  TanstackTableProps,
} from "./table.types"
import {
  ColumnDropDown,
  TanstackFilter,
  TanstackTableCount,
  TanstackTablePagination,
  TanstackToolbar,
} from "./tableComponents"
import {
  getExtraColumns,
  getHiddenColumns,
  getRowIds,
  getSelectedRowModel,
} from "./tableUtils"
import { useTableUrlSync } from "./useTableUrlSync"
import { useTanstackTable } from "./useTanstackTable"

import { debounce, isArray } from "lodash"

dayjs.extend(isBetween)

const DEFAULT_LEFT_PINNED_COLUMNS = ["rowSelection", "index"] as const
const DEFAULT_RIGHT_PINNED_COLUMNS = ["filter"] as const

const toStringArray = (value: unknown): string[] => {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

const uniqueColumnIds = (columnIds: string[]) => Array.from(new Set(columnIds))

const normalizeColumnPinning = (
  value: unknown,
  fallback?: ColumnPinningState,
  validColumnIds?: string[],
): ColumnPinningState => {
  const source =
    value && typeof value === "object"
      ? (value as ColumnPinningState)
      : fallback ?? {}

  const allowed = validColumnIds ? new Set(validColumnIds) : undefined
  const filterAllowedColumn = (columnId: string) =>
    !allowed || allowed.has(columnId)

  const left = uniqueColumnIds([
    ...DEFAULT_LEFT_PINNED_COLUMNS,
    ...toStringArray(source.left).filter(filterAllowedColumn),
  ])
  const right = uniqueColumnIds(
    toStringArray(source.right).filter(
      (columnId) =>
        filterAllowedColumn(columnId) &&
        !left.includes(columnId) &&
        columnId !== "filter",
    ),
  )

  return {
    left,
    right: [...right, ...DEFAULT_RIGHT_PINNED_COLUMNS],
  }
}

const parseColumnOrder = (value: string | null): ColumnOrderState => {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : []
  } catch {
    return []
  }
}

const normalizeColumnSizing = (
  value: unknown,
  validColumnIds?: Set<string>,
): ColumnSizingState => {
  if (!value || typeof value !== "object") return {}

  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([columnId, width]) =>
      (!validColumnIds || validColumnIds.has(columnId)) &&
      typeof width === "number" &&
      Number.isFinite(width) &&
      width > 0,
  )

  return Object.fromEntries(entries) as ColumnSizingState
}

const parseColumnSizing = (
  value: string | null,
  validColumnIds?: Set<string>,
): ColumnSizingState => {
  if (!value) return {}
  try {
    return normalizeColumnSizing(JSON.parse(value), validColumnIds)
  } catch {
    return {}
  }
}

interface ColumnNode {
  id?: unknown
  accessorKey?: unknown
  columns?: unknown
}

const isColumnNode = (value: unknown): value is ColumnNode =>
  typeof value === "object" && value !== null

const extractColumnId = (column: unknown): string | undefined => {
  if (!isColumnNode(column)) return undefined

  if (typeof column.id === "string") return column.id
  if (typeof column.accessorKey === "string") return column.accessorKey

  return undefined
}

const collectLeafColumnIds = (columns: unknown[]): string[] => {
  const ids: string[] = []

  const walkColumns = (items: unknown[]) => {
    items.forEach((item) => {
      if (
        isColumnNode(item) &&
        Array.isArray(item.columns) &&
        item.columns.length > 0
      ) {
        walkColumns(item.columns)
        return
      }

      const columnId = extractColumnId(item)
      if (columnId) ids.push(columnId)
    })
  }

  walkColumns(columns)

  return ids
}

const NoobTanstackTable = forwardRef(
  // eslint-disable-next-line @typescript-eslint/ban-types
  <T extends {}>(
    props: TanstackTableProps<T>,
    ref: ForwardedRef<TableRef | undefined>,
  ) => {
    const {
      request,
      groupSummaryRequest,
      onRow,
      tableLoading,
      manualPagination = false,
      manualFiltering = false,
      manualSorting = false,
      manualGrouping = true,
      dataSource = undefined,
      columns,
      refreshDeps,
      columnsState = {
        persistenceType: "localStorage",
        ...(props?.columnsState ?? {}),
      },
      toolbar,
      editable,
      tableProps,
      rowSelection,
      rowExpandable,
      density = "small",
      bordered = false,
      tableLoadingRowCount,
      paginationType = "pagination",
      pagination = {
        pageIndex: 0,
        pageSize: 10,
      },
      syncWithUrl = false,
      options = {
        reload: true,
        search: true,
      },
      tableAlertOptionRender,
      savedViews,
      serverExport,
    } = props

    const urlSyncEnabled = syncWithUrl && manualFiltering
    const {
      initialFilters,
      initialSearchParams: initialUrlSearchParams,
      initialGlobalSearch,
      syncFiltersToUrl,
      syncGlobalSearchToUrl,
    } = useTableUrlSync({ enabled: urlSyncEnabled })

    const token = useAppTheme()
    const [rowData, setRowData] = useState<T[]>(dataSource ?? [])
    const [rowCount, setRowCount] = useState<number | undefined>(undefined)
    // Backend grand totals (full filtered set) for the sticky footer.
    const [footerSummary, setFooterSummary] = useState<
      Record<string, unknown> | undefined
    >(undefined)

    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
      columnsState?.persistenceKey
        ? localStorage.getItem(
            `${columnsState?.persistenceKey}-column-visibility`,
          )
          ? JSON.parse(
              localStorage.getItem(
                `${columnsState?.persistenceKey}-column-visibility`,
              ) ?? "{}",
            )
          : {
              ...getHiddenColumns(columns ?? []),
            }
        : {
            ...getHiddenColumns(columns ?? []),
          },
    )
    const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(
      () => {
        const fallbackPinning = normalizeColumnPinning(
          tableProps?.initialState?.columnPinning,
        )

        if (!columnsState?.persistenceKey) return fallbackPinning

        try {
          return normalizeColumnPinning(
            JSON.parse(
              localStorage.getItem(
                `${columnsState?.persistenceKey}-column-pinning`,
              ) ?? "null",
            ),
            fallbackPinning,
          )
        } catch {
          return fallbackPinning
        }
      },
    )

    const [tablePagination, setTablePagination] = useState<PaginationState>({
      ...pagination,
    })
    const [editableRowKey, setEditableRowKey] = useState<React.Key[]>(
      editable?.editedRowKey ?? [],
    )

    const { indexColumn } = useTanstackTable<T>()

    const extraColumns = getExtraColumns<T>({ rowSelection, rowExpandable })

    const [rowSelectionState, setRowSelectionState] = useSafeState(
      tableProps?.initialState?.rowSelection
        ? tableProps.initialState.rowSelection
        : rowSelection?.selectedRowKeys ?? {},
    )
    const isParentSyncRef = useRef(false)

    const [sorting, setSorting] = useState<SortingState>([])
    const [grouping, setGrouping] = useState<GroupingState>(() => {
      if (!columnsState?.persistenceKey) return []
      try {
        const stored = localStorage.getItem(
          `${columnsState.persistenceKey}-grouping`,
        )
        return stored ? JSON.parse(stored) : []
      } catch {
        return []
      }
    })
    // note default to all-expanded when grouping is active so groups open by default
    const [expanded, setExpanded] = useState<ExpandedState>(
      grouping.length > 0 ? true : {},
    )
    const [globalTextSearch, setGlobalTextSearch] = useState<
      string | undefined
    >(urlSyncEnabled ? initialGlobalSearch : undefined)

    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      urlSyncEnabled && Object.keys(initialFilters).length > 0
        ? (initialFilters as unknown as ColumnFiltersState)
        : [],
    )

    const isInfinite =
      (paginationType === "virtual" || paginationType === "cursor") &&
      request !== undefined
    const isCursor = paginationType === "cursor" && request !== undefined
    const [_cursor, setCursor] = useState<string | number | null>(null)

    // Hook 1: useRequest (for standard pagination)
    const { loading, refresh, runAsync } = useRequest(
      request ?? (() => Promise.resolve({ data: [], total: 0, success: true })),
      {
        ready: !isInfinite,
        onSuccess: (response: RequestResponse<T>) => {
          if (dataSource) {
            setRowData(() => dataSource)
          } else {
            setRowData(() => response.data)
          }
          setRowCount(response.total || undefined)
          setFooterSummary(response.summary)
        },
        defaultParams: [
          {
            page: 1,
            limit: pagination.pageSize,
            ...(urlSyncEnabled ? initialFilters : {}),
            ...(urlSyncEnabled && initialGlobalSearch
              ? { global_search_text: initialGlobalSearch }
              : {}),
          },
        ],
        onBefore() {
          if (rowData?.length === 0) {
            return true
          } else {
            setRowData([])
          }
        },
        refreshDeps,
      },
    )

    // note column visibility is a pure client concern — toggling it must NOT
    // refetch/reset the infinite stream (only filters/sort/search/grouping do).
    const reloadDepsSerialized = useMemo(() => {
      return JSON.stringify([
        sorting,
        columnFilters,
        globalTextSearch,
        grouping,
        refreshDeps,
      ])
    }, [sorting, columnFilters, globalTextSearch, grouping, refreshDeps])

    // Hook 2: useInfiniteScroll (for virtual-infinite scroll)
    const {
      data: infiniteData,
      loading: infiniteLoading,
      loadingMore: infiniteLoadingMore,
      loadMore: infiniteLoadMore,
      reload: infiniteReload,
      noMore: infiniteNoMore,
    } = useInfiniteScroll(
      async (currentData) => {
        if (!isInfinite) {
          return {
            list: [],
            page: 1,
            nextCursor: null,
            total: 0,
            success: true,
            lastPageSize: 0,
          }
        }

        const nextPage = currentData ? currentData.page + 1 : 1
        const limit = pagination.pageSize
        const cursorVal = currentData ? currentData.nextCursor : null

        const requestParams: Record<string, any> = {
          limit,
          // Always forward the active column filters — independent of URL sync.
          // (Cursor lists like vouchers don't enable syncWithUrl; gating filters
          // behind it silently dropped them from the backend query.)
          ...columnFilters,
          sort: sorting,
          global_search_text: globalTextSearch,
          visible_columns: columnVisibility,
          ...(grouping.length > 0 ? { grouping } : {}),
        }

        if (paginationType === "cursor") {
          // First page → no cursor; subsequent pages → the prior page's cursor.
          requestParams.cursor = cursorVal
        } else {
          requestParams.page = nextPage
        }

        const response = await request!(requestParams)

        // Grand totals come from the backend (full filtered set) — keep the
        // latest so the footer is correct even on a partially-scrolled stream.
        if (response.summary !== undefined) setFooterSummary(response.summary)

        return {
          list: response.data || [],
          page: nextPage,
          // Cursor + hasNextPage come straight from the backend's pageInfo.
          // No fallback to a row id — a stale/guessed cursor causes dupes/loops.
          nextCursor: response.nextCursor ?? null,
          hasNextPage: response.hasNextPage,
          // Keep page 1's total on later pages: cursor backends skip the COUNT
          // after the first page (it returns the page length, not the total).
          total: currentData?.total ?? response.total ?? 0,
          success: response.success,
          lastPageSize: response.data?.length || 0,
        }
      },
      {
        manual: true,
        isNoMore: (data) => {
          if (!data) return false
          if (paginationType === "cursor") {
            // Authoritative: the backend tells us whether more rows exist.
            if (typeof data.hasNextPage === "boolean") return !data.hasNextPage
            return data.nextCursor === null || data.nextCursor === undefined
          }
          // Offset/virtual: stop at total, else when a short page comes back.
          if (data.total !== undefined && data.total > 0) {
            return data.list.length >= data.total
          }
          return data.lastPageSize < pagination.pageSize
        },
      },
    )

    // note Trigger initial load and reload when infinite scroll is active and dependencies change
    useEffect(() => {
      if (isInfinite) {
        // Reset the stream + cursor whenever filters/sort/search/grouping change.
        infiniteReload()
      }
    }, [isInfinite, reloadDepsSerialized])

    // note Synchronize local cursor state with infiniteData's nextCursor
    useEffect(() => {
      if (isCursor && infiniteData) {
        setCursor(infiniteData.nextCursor)
      } else {
        setCursor(null)
      }
    }, [infiniteData?.nextCursor, isCursor])

    // ── Group summary: correct per-group counts + financial totals ──────────
    // Independent of how many detail rows are loaded, so headers never show a
    // misleading "loaded count". Refetches when grouping/search/filters change.
    const groupingKey = JSON.stringify(grouping)
    const { data: groupSummaryResult } = useRequest(
      async () => {
        if (!groupSummaryRequest || grouping.length === 0) {
          return { data: [], grandTotal: { count: 0, total: "0.00" } }
        }
        return groupSummaryRequest({
          grouping,
          global_search_text: globalTextSearch,
          // Forward the SAME active column filters as the detail request, so
          // header counts/totals always match the filtered visible rows.
          ...columnFilters,
        })
      },
      {
        ready: !!groupSummaryRequest && grouping.length > 0,
        refreshDeps: [groupingKey, globalTextSearch, columnFilters],
      },
    )

    const groupSummaryMap = useMemo(() => {
      const map = new Map<string, { count: number; total: string }>()
      for (const g of groupSummaryResult?.data ?? []) {
        const keyStr = JSON.stringify(
          (g.key ?? []).map((v: unknown) => (v == null ? null : String(v))),
        )
        map.set(keyStr, { count: g.count, total: g.total })
      }
      return map
    }, [groupSummaryResult])

    const getActivePageSize = () =>
      tableProps?.state?.pagination?.pageSize ?? tablePagination.pageSize

    const resetTablePageIndex = () => {
      setTablePagination((prev) =>
        prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 },
      )
    }

    const debouncedGlobalFilter = debounce((value) => {
      setGlobalTextSearch(value)
      if (manualFiltering) {
        if (!isInfinite) {
          const pageSize = getActivePageSize()
          resetTablePageIndex()
          runAsync({
            ...columnFilters,
            page: 1,
            limit: pageSize,
            global_search_text: value,
            visible_columns: columnVisibility,
            sort: sorting,
          })
        }
        syncGlobalSearchToUrl(value)
      }
      tableProps?.onGlobalFilterChange?.(value)
    }, 500)

    const memoizedColumn: Array<ColumnDef<T, any>> = useMemo(() => {
      return [...extraColumns, indexColumn, ...(columns ?? [])] as Array<
        ColumnDef<T, any>
      >
    }, [columns])

    const validPersistedColumnIds = useMemo(
      () => new Set(collectLeafColumnIds(memoizedColumn)),
      [memoizedColumn],
    )

    const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() => {
      const fallbackSizing = normalizeColumnSizing(
        tableProps?.initialState?.columnSizing,
        validPersistedColumnIds,
      )
      if (!columnsState?.persistenceKey) return fallbackSizing

      const persistedSizing = parseColumnSizing(
        localStorage.getItem(`${columnsState?.persistenceKey}-column-sizing`),
        validPersistedColumnIds,
      )

      return Object.keys(persistedSizing).length > 0
        ? persistedSizing
        : fallbackSizing
    })

    const [searchParams, setSearchParams] = useState<Record<string, unknown>>(
      urlSyncEnabled ? initialUrlSearchParams : {},
    )

    // note Add state trackers for pinning and visibility
    const [columnPinningVersion, setColumnPinningVersion] = useState(0)
    const [columnVisibilityVersion, setColumnVisibilityVersion] = useState(0)
    const [groupingVersion, _setGroupingVersion] = useState(0)
    const columnSizingVersion = 0

    const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() => {
      const fallbackOrder = toStringArray(
        tableProps?.initialState?.columnOrder,
      ).filter((columnId) => validPersistedColumnIds.has(columnId))
      if (!columnsState?.persistenceKey) return fallbackOrder

      const persistedOrder = parseColumnOrder(
        localStorage.getItem(`${columnsState?.persistenceKey}-column-order`),
      ).filter((columnId) => validPersistedColumnIds.has(columnId))

      return persistedOrder.length > 0 ? persistedOrder : fallbackOrder
    })

    const columnsDepsSerialized = useMemo(() => {
      return JSON.stringify(
        (columns ?? []).map((col: any) => {
          if (!col) return null
          return {
            id: col.id || col.accessorKey,
            size: col.size,
            minSize: col.minSize,
            maxSize: col.maxSize,
            visibility: col.visibility,
          }
        }),
      )
    }, [columns])

    useUpdateEffect(() => {
      // 1. Column Sizing
      const fallbackSizing = normalizeColumnSizing(
        tableProps?.initialState?.columnSizing,
        validPersistedColumnIds,
      )
      let initialSizing = fallbackSizing
      if (columnsState?.persistenceKey) {
        const persistedSizing = parseColumnSizing(
          localStorage.getItem(`${columnsState?.persistenceKey}-column-sizing`),
          validPersistedColumnIds,
        )
        if (Object.keys(persistedSizing).length > 0) {
          initialSizing = persistedSizing
        }
      }
      setColumnSizing(initialSizing)

      // 2. Column Visibility
      const initialVisibility = columnsState?.persistenceKey
        ? localStorage.getItem(
            `${columnsState?.persistenceKey}-column-visibility`,
          )
          ? JSON.parse(
              localStorage.getItem(
                `${columnsState?.persistenceKey}-column-visibility`,
              ) ?? "{}",
            )
          : getHiddenColumns(columns ?? [])
        : getHiddenColumns(columns ?? [])
      setColumnVisibility(initialVisibility)
      setColumnVisibilityVersion((v) => v + 1)

      // 3. Column Pinning
      const fallbackPinning = normalizeColumnPinning(
        tableProps?.initialState?.columnPinning,
      )
      let initialPinning = fallbackPinning
      if (columnsState?.persistenceKey) {
        try {
          const parsed = JSON.parse(
            localStorage.getItem(
              `${columnsState?.persistenceKey}-column-pinning`,
            ) ?? "null",
          )
          if (parsed) {
            initialPinning = normalizeColumnPinning(
              parsed,
              fallbackPinning,
              Array.from(validPersistedColumnIds),
            )
          }
        } catch {}
      }
      setColumnPinning(initialPinning)
      setColumnPinningVersion((v) => v + 1)

      // 4. Column Order
      const fallbackOrder = toStringArray(
        tableProps?.initialState?.columnOrder,
      ).filter((columnId) => validPersistedColumnIds.has(columnId))
      let initialOrder = fallbackOrder
      if (columnsState?.persistenceKey) {
        const persistedOrder = parseColumnOrder(
          localStorage.getItem(`${columnsState?.persistenceKey}-column-order`),
        ).filter((columnId) => validPersistedColumnIds.has(columnId))
        if (persistedOrder.length > 0) {
          initialOrder = persistedOrder
        }
      }
      setColumnOrder(initialOrder)
    }, [columnsDepsSerialized])

    const activeData = useMemo(() => {
      if (dataSource) return dataSource
      if (isInfinite) return infiniteData?.list ?? []
      return rowData
    }, [dataSource, isInfinite, infiniteData?.list, rowData])

    const activeRowCount = isInfinite ? infiniteData?.total ?? 0 : rowCount

    const table = useReactTable({
      //  && dataSource?.length > 0 change to dataSource !== undefined (For some reason )
      data: activeData,
      renderFallbackValue: "-",
      rowCount: manualPagination ? activeRowCount : undefined,
      defaultColumn: {
        minSize: 30,
        size: 150,
        maxSize: 500,
      },
      columns: memoizedColumn,
      getCoreRowModel: getCoreRowModel(),
      getColumnCanGlobalFilter(column) {
        return column.getIsVisible()
      },
      ...tableProps,
      columnResizeMode: "onEnd",
      enableColumnResizing: true,
      initialState: {
        ...tableProps?.initialState,
        columnPinning: {
          left: [
            "rowSelection",
            "index",
            ...(tableProps?.initialState?.columnPinning?.left ?? []),
          ],
          right: [
            "filter",
            ...(tableProps?.initialState?.columnPinning?.right ?? []),
          ],
        },
      },
      state: {
        ...tableProps?.state,
        columnPinningVersion,
        sorting,
        grouping,
        groupingVersion,
        columnVisibilityVersion,
        columnSizingVersion,
        pagination: tableProps?.state?.pagination ?? tablePagination,
        columnVisibility,
        columnPinning,
        columnSizing,
        density,
        editedRowKey: editableRowKey,
        expanded,
        columnOrder,
        rowSelection: rowSelectionState,
        searchParams,
        globalFilter: globalTextSearch,
        columnFilters,
      },
      enableMultiRowSelection:
        rowSelection?.selectionType && rowSelection.selectionType !== "radio",
      // note With manualPagination the pagination row model is bypassed, so the
      // expanded row model must flatten children itself (paginateExpandedRows=true).
      // For client pagination keep it false so a group's children aren't split
      // across pages (the pagination model still flattens them via expandRows).
      paginateExpandedRows: manualPagination,
      // note keep group/row expansion stable across re-renders & data updates
      autoResetExpanded: false,
      onExpandedChange: setExpanded,
      onRowSelectionChange: (updater) => {
        const resolved =
          typeof updater === "function"
            ? updater(table.getState().rowSelection)
            : updater
        setRowSelectionState(resolved)
      },
      filterFns: {
        ISODateFilter: (value, row, key) => {
          // note Get the date value from the row data
          const dateValue = value?.original?.[row]

          // note Return false if no date value or key
          if (!dateValue) return false

          try {
            // note Parse the date value
            const rowDate = dayjs(dateValue)

            // note Return false if invalid date
            if (!rowDate.isValid()) return false

            // note Handle date range filter
            if (isArray(key)) {
              const [startDate, endDate] = key

              // note Return false if invalid range dates
              if (!startDate || !endDate) return false

              // note Compare date within range (inclusive)
              return rowDate.isBetween(startDate, endDate, "day", "[]")
            }

            // note Handle single date filter
            if (key) {
              const filterDate = dayjs(key)

              // note Return false if invalid filter date
              if (!filterDate.isValid()) return false

              // note Compare dates for equality (ignoring time)
              return (
                rowDate.format("YYYY-MM-DD") === filterDate.format("YYYY-MM-DD")
              )
            }

            return false
          } catch (error) {
            console.error("Error in ISODateFilter:", error)
            return false
          }
        },
        BooleanFn: (row, value, key) => {
          const isKeyFalse = key === "false"
          return row?.original?.[value] !== isKeyFalse
        },
      },
      onSortingChange: (updater) => {
        const newSorting =
          typeof updater === "function"
            ? updater(table.getState().sorting)
            : updater
        setSorting(newSorting)
        if (manualSorting && !isInfinite) {
          const pageSize = getActivePageSize()
          resetTablePageIndex()
          runAsync({
            page: 1,
            limit: pageSize,
            ...columnFilters,
            sort: newSorting,
            global_search_text: globalTextSearch,
            visible_columns: columnVisibility,
          })
        }
        tableProps?.onSortingChange?.(newSorting)
      },
      onGroupingChange: (updater) => {
        const newGrouping =
          typeof updater === "function"
            ? updater(table.getState().grouping)
            : updater
        setGrouping(newGrouping)
        // note keep groups open by default; clear expansion when grouping removed
        setExpanded(newGrouping.length > 0 ? true : {})
        if (manualGrouping && !isInfinite) {
          const pageSize = getActivePageSize()
          resetTablePageIndex()
          runAsync({
            page: 1,
            limit: pageSize,
            ...columnFilters,
            sort: sorting,
            grouping: newGrouping,
            global_search_text: globalTextSearch,
            visible_columns: columnVisibility,
          })
        }
      },
      getRowCanExpand: () => true,
      onColumnOrderChange: (updater) => {
        const newOrder =
          typeof updater === "function"
            ? updater(table.getState().columnOrder)
            : updater
        const validColumnIds = new Set(
          table.getAllLeafColumns().map((column) => column.id),
        )
        const normalizedOrder = toStringArray(newOrder).filter((columnId) =>
          validColumnIds.has(columnId),
        )
        setColumnOrder(normalizedOrder)
        if (columnsState?.persistenceKey) {
          localStorage.setItem(
            `${columnsState?.persistenceKey}-column-order`,
            JSON.stringify(normalizedOrder),
          )
        }
      },
      onColumnVisibilityChange: (updater) => {
        const newVisibility =
          typeof updater === "function"
            ? updater(table.getState().columnVisibility)
            : updater
        setColumnVisibility(newVisibility)
        if (columnsState?.persistenceKey) {
          localStorage.setItem(
            `${columnsState?.persistenceKey}-column-visibility`,
            JSON.stringify(newVisibility),
          )
        }

        setColumnVisibilityVersion((v) => v + 1)
      },
      onColumnPinningChange: (updater) => {
        const newPinning =
          typeof updater === "function"
            ? updater(table.getState().columnPinning)
            : updater
        const validColumnIds = table
          .getAllLeafColumns()
          .map((column) => column.id)
        const normalizedPinning = normalizeColumnPinning(
          newPinning,
          undefined,
          validColumnIds,
        )
        if (columnsState?.persistenceKey) {
          localStorage.setItem(
            `${columnsState?.persistenceKey}-column-pinning`,
            JSON.stringify(normalizedPinning),
          )
        }
        setColumnPinningVersion((v) => v + 1)
        setColumnPinning(normalizedPinning)
      },
      onColumnSizingChange: (updater) => {
        setColumnSizing((prev) => {
          const nextSizing =
            typeof updater === "function" ? updater(prev) : updater
          const normalizedSizing = normalizeColumnSizing(
            nextSizing,
            validPersistedColumnIds,
          )

          if (columnsState?.persistenceKey) {
            localStorage.setItem(
              `${columnsState?.persistenceKey}-column-sizing`,
              JSON.stringify(normalizedSizing),
            )
          }

          return normalizedSizing
        })
      },
      onColumnFiltersChange: (updater) => {
        const newColumnFilters =
          typeof updater === "function"
            ? updater(table?.getState()?.columnFilters)
            : updater
        setColumnFilters(newColumnFilters)
        if (manualFiltering) {
          if (!isInfinite) {
            const pageSize = getActivePageSize()
            resetTablePageIndex()
            runAsync({
              ...newColumnFilters,
              page: 1,
              limit: pageSize,
              global_search_text: globalTextSearch,
              visible_columns: columnVisibility,
              sort: sorting,
            })
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          syncFiltersToUrl(newColumnFilters as any)
        }
        tableProps?.onColumnFiltersChange?.(newColumnFilters)
      },
      onGlobalFilterChange: (value) => {
        debouncedGlobalFilter(value)
      },
      meta: {
        reload: () => {
          if (isInfinite) {
            infiniteReload()
          } else {
            refresh()
          }
          table?.resetRowSelection()
        },
        updateData: (rowIndex, columnId, value) => {
          const data = dataSource ?? rowData

          const editedRow = { ...data[rowIndex], [columnId]: value }
          const updateData = data?.map((row, index) => {
            if (index === rowIndex) {
              return {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion
                ...data[rowIndex]!,
                [columnId]: value,
              }
            }
            return row
          })
          const res = { record: editedRow, recordList: updateData }
          setRowData(updateData)
          return editable?.onDataSourceChange(res)
        },
        updateEditRowKey: (keys) => {
          setEditableRowKey(keys)
          editable?.setEditedRowKey?.(keys)
        },
        onSearchParamsChange: (values) => {
          setSearchParams(values)
        },
        groupSummary: groupSummaryMap,
        footerSummary,
        rowSelection,
        rowExpandable,
      } satisfies CustomTableMeta,
      getPaginationRowModel:
        paginationType === "pagination" ? getPaginationRowModel() : undefined,
      /* todo / getSubRows: (row) => {
      //   return row.children
      // } */
      manualFiltering,
      manualPagination,
      manualSorting,
      onPaginationChange: (pagination) => {
        const newPagination =
          typeof pagination === "function"
            ? pagination(table.getState().pagination)
            : pagination
        setTablePagination({
          pageIndex: newPagination.pageIndex,
          pageSize: newPagination.pageSize,
        })
        if (manualPagination && !isInfinite) {
          runAsync({
            page: newPagination.pageIndex + 1,
            limit: newPagination.pageSize,
            ...columnFilters,
            sort: sorting,
            global_search_text: globalTextSearch,
            visible_columns: columnVisibility,
          })
        }
        tableProps?.onPaginationChange?.(newPagination)
      },
      getFilteredRowModel: getFilteredRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getGroupedRowModel: getGroupedRowModel(),
      getExpandedRowModel: getExpandedRowModel(),
      getFacetedRowModel: getFacetedRowModel(),
      getFacetedUniqueValues: getFacetedUniqueValues(),
      getFacetedMinMaxValues: getFacetedMinMaxValues(),
      // note keep grouped columns in place (avoids duplicate headers / misalignment)
      groupedColumnMode: false,
    })

    // note notify parent when internal selection changes (skip if triggered by parent sync)
    useUpdateEffect(() => {
      if (isParentSyncRef.current) {
        isParentSyncRef.current = false
        return
      }
      rowSelection?.onChange?.(getRowIds(table), getSelectedRowModel(table))
    }, [rowSelectionState])

    // note sync parent selectedRowKeys into internal state (for modal pre-selection)
    useUpdateEffect(() => {
      if (rowSelection?.selectedRowKeys) {
        isParentSyncRef.current = true
        setRowSelectionState(rowSelection.selectedRowKeys)
      }
    }, [JSON.stringify(rowSelection?.selectedRowKeys)])

    // note update effect for row visibility on active key change
    useUpdateEffect(() => {
      setColumnVisibility(getHiddenColumns(columns ?? []))
    }, [toolbar?.menu?.activeKey])

    // note update effect for row visibility on active key change
    useUpdateEffect(() => {
      setEditableRowKey(editable?.editedRowKey ?? [])
    }, [editable?.editedRowKey])

    // note Expose reload method
    useImperativeHandle(
      ref,
      () => ({
        reload: () => {
          if (isInfinite) {
            infiniteReload()
          } else {
            refresh()
          }
          table?.resetRowSelection()
        },
        getTable: () => table,
      }),
      [refresh, infiniteReload, table, isInfinite],
    )

    // ─── Saved Views / Server Export ─────────────────────────────────────────
    // note columnFilters is an empty ARRAY initially / after reset, and a
    // Record<field, { operator, value }> once the filter drawer applies values.
    // Always normalize to a record for the wire format.
    const normalizeFilterState = (value: unknown): Record<string, unknown> => {
      if (!value || typeof value !== "object") return {}
      if (Array.isArray(value)) {
        const out: Record<string, unknown> = {}
        for (const item of value) {
          if (item && typeof item === "object" && "id" in item) {
            out[(item as { id: string }).id] = (
              item as { value?: unknown }
            ).value
          }
        }
        return out
      }
      return value as Record<string, unknown>
    }

    // note Snapshot of everything a saved view captures
    const getViewState = (): TableViewState => ({
      filters: normalizeFilterState(columnFilters),
      searchParams,
      sorting: sorting as Array<{ id: string; desc: boolean }>,
      visibleColumns: columnVisibility,
      globalSearch: globalTextSearch,
      grouping: grouping as string[],
    })

    // note Restores a saved view with a single refetch + URL sync
    const applyViewState = (state: TableViewState) => {
      const nextFilters = normalizeFilterState(
        state.filters,
      ) as unknown as ColumnFiltersState
      const nextSearchParams = state.searchParams ?? {}
      const nextSorting = (state.sorting ?? []) as SortingState
      const nextVisibility =
        state.visibleColumns ?? getHiddenColumns(columns ?? [])
      const nextSearch = state.globalSearch || undefined
      // A view with no grouping must CLEAR any active grouping (not leave it on).
      const nextGrouping = (state.grouping ?? []) as GroupingState

      setColumnFilters(nextFilters)
      setSearchParams(nextSearchParams)
      setSorting(nextSorting)
      setColumnVisibility(nextVisibility)
      setColumnVisibilityVersion((v) => v + 1)
      if (columnsState?.persistenceKey) {
        localStorage.setItem(
          `${columnsState.persistenceKey}-column-visibility`,
          JSON.stringify(nextVisibility),
        )
      }
      setGlobalTextSearch(nextSearch)

      // Restore grouping the same way the Group-By control does: state +
      // expansion + persistence. Changing `grouping` also resets the cursor
      // stream / triggers a refetch via reloadDepsSerialized.
      setGrouping(nextGrouping)
      setExpanded(nextGrouping.length > 0 ? true : {})
      if (columnsState?.persistenceKey) {
        if (nextGrouping.length > 0) {
          localStorage.setItem(
            `${columnsState.persistenceKey}-grouping`,
            JSON.stringify(nextGrouping),
          )
        } else {
          localStorage.removeItem(`${columnsState.persistenceKey}-grouping`)
        }
      }

      setTablePagination((prev) => ({ ...prev, pageIndex: 0 }))

      if (manualFiltering && request) {
        runAsync({
          ...(nextFilters as unknown as Record<string, unknown>),
          page: 1,
          limit: tablePagination.pageSize ?? 10,
          sort: nextSorting,
          global_search_text: nextSearch,
          visible_columns: nextVisibility,
          ...(nextGrouping.length > 0 ? { grouping: nextGrouping } : {}),
        })
        syncFiltersToUrl(
          nextFilters as unknown as Record<string, UrlFilterValue>,
        )
        syncGlobalSearchToUrl(nextSearch)
      }
    }

    // note Clears all applied state back to the table's initial defaults
    const resetViewState = () => {
      const defaultVisibility = getHiddenColumns(columns ?? [])
      setColumnFilters([])
      setSearchParams({})
      setSorting([])
      setColumnVisibility(defaultVisibility)
      setColumnVisibilityVersion((v) => v + 1)
      if (columnsState?.persistenceKey) {
        localStorage.setItem(
          `${columnsState.persistenceKey}-column-visibility`,
          JSON.stringify(defaultVisibility),
        )
      }
      setGlobalTextSearch(undefined)
      // System Default also clears grouping (it was a saved/applied state too).
      setGrouping([])
      setExpanded({})
      if (columnsState?.persistenceKey) {
        localStorage.removeItem(`${columnsState.persistenceKey}-grouping`)
      }
      setTablePagination((prev) => ({ ...prev, pageIndex: 0 }))
      if (manualFiltering && request) {
        runAsync({ page: 1, limit: tablePagination.pageSize ?? 10 })
        syncFiltersToUrl({})
        syncGlobalSearchToUrl(undefined)
      }
    }

    const SYSTEM_COLUMN_IDS = new Set(["rowSelection", "index", "filter"])

    // note Current table state in the wire format the export endpoint expects
    const buildExportPayload = (): ServerExportPayload => {
      const exportColumns = table
        .getVisibleLeafColumns()
        .filter((col) => !SYSTEM_COLUMN_IDS.has(col.id))
        .map((col) => ({
          key: col.id,
          header:
            typeof col.columnDef.header === "string"
              ? col.columnDef.header
              : col.id,
        }))

      const filterEntries = {
        ...(serverExport?.extraFilters ?? {}),
        ...normalizeFilterState(columnFilters),
      }

      return {
        listKey: serverExport?.listKey ?? "",
        columns: exportColumns,
        filters: Object.keys(filterEntries).length ? filterEntries : undefined,
        search: globalTextSearch || undefined,
        sort: sorting.length
          ? sorting.map((s) => ({
              column: s.id,
              direction: (s.desc ? "desc" : "asc") as "asc" | "desc",
            }))
          : undefined,
      }
    }

    const hasInitialUrlState =
      urlSyncEnabled &&
      (Object.keys(initialFilters ?? {}).length > 0 || !!initialGlobalSearch)

    const stateToolbarActions = [
      savedViews && manualFiltering ? (
        <SavedViewsControl
          key="saved-views"
          listKey={savedViews.listKey}
          getViewState={getViewState}
          applyViewState={applyViewState}
          resetViewState={resetViewState}
          hasInitialUrlState={hasInitialUrlState}
        />
      ) : undefined,
      serverExport && manualFiltering ? (
        <ServerExportButton
          key="server-export"
          getPayload={buildExportPayload}
        />
      ) : undefined,
    ]
    const internalTableProps = {
      bordered,
      tableLoadingRowCount,
      onRow,
      hasNextPage: isInfinite ? !infiniteNoMore : undefined,
      isFetchingNextPage: isInfinite ? infiniteLoadingMore : undefined,
      onLoadMore: isInfinite ? infiniteLoadMore : undefined,
      useViewportHeight: isInfinite,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableOptions: any =
      options !== false
        ? {
            reload: true,
            search: true,
            ...options,
          }
        : false

    const selectedRowCount = Object.keys(
      table?.getState()?.rowSelection || {},
    ).length
    const isCheckboxSelection = rowSelection?.selectionType !== "radio"

    return (
      <>
        <div tabIndex={-1}>
          {/* note toolbar */}
          <TanstackToolbar
            ref={ref}
            table={table as Table<unknown>}
            options={tableOptions}
            {...toolbar}
            actions={[
              ...(toolbar?.actions && Array.isArray(toolbar.actions)
                ? [
                    ...toolbar.actions,
                    ...stateToolbarActions,
                    manualFiltering ? (
                      <TanstackFilter table={table} key="filter" />
                    ) : undefined,
                  ]
                : [
                    ...stateToolbarActions,
                    manualFiltering ? (
                      <TanstackFilter table={table} key="filter" />
                    ) : undefined,
                  ]),
              tableOptions?.reload && (
                <div
                  className="cursor-pointer text-md"
                  onClick={() => {
                    if (tableOptions?.reload?.onClick) {
                      tableOptions.reload.onClick()
                    } else {
                      refresh()
                    }
                  }}
                  key="reload"
                >
                  {tableOptions?.reloadIcon ? (
                    tableOptions.reloadIcon
                  ) : (
                    <ReloadOutlined
                      style={{
                        color: token.neutral10,
                      }}
                    />
                  )}
                </div>
              ),
              <GroupByDropDown
                table={table}
                persistenceKey={columnsState?.persistenceKey}
                key="groupby"
              />,
              <ColumnDropDown column={table} key="settings" />,
            ]}
            menu={{
              ...toolbar?.menu,
            }}
            selectionCount={isCheckboxSelection ? selectedRowCount : 0}
            selectionActions={
              isCheckboxSelection && selectedRowCount > 0
                ? tableAlertOptionRender?.(
                    getRowIds(table),
                    getSelectedRowModel(table),
                    () => {
                      table.resetRowSelection()
                    },
                  )
                : undefined
            }
          />
          {/* todo: 
          {searchParams && (
            <div className="flex flex-wrap gap-2">
              {Object.keys(searchParams).map((key) => {
                const value = searchParams[key]
                const getColumn = table?.getColumn(key)
                return (
                  <EChip
                    key={key}
                    closable
                    color="blue"
                    onClose={() => {
                      setSearchParams({
                        ...searchParams,
                        [key]: undefined,
                      })
                      table.setColumnFilters({
                        ...table.getState().columnFilters,
                        ...getColumn?.columnDef.meta?.transform?.(value),
                      })
                    }}
                  >
                    <TableInput
                      type={getColumn?.columnDef.meta?.filterVariant || "text"}
                      name={key}
                      label={getColumn?.columnDef.header as string}
                      fieldProps={
                        {
                          value: value as string,
                        } as unknown as Record<string, unknown>
                      }
                      readonly
                    />
                  </EChip>
                )
              })}
            </div>
          )} */}

          {/* note Pagination */}
          {paginationType === "pagination" && (
            <TanstackTablePagination
              table={table}
              tableInstance={table?.getState()}
            />
          )}
          {paginationType === "cursor" && (
            <TanstackTableCount
              table={table}
              loadedRowCount={activeData.length}
            />
          )}

          <div>
            {/* note Internal Table */}
            <InternalTable
              loading={
                isInfinite
                  ? infiniteLoading || infiniteLoadingMore || tableLoading
                  : loading || tableLoading
              }
              table={table}
              {...internalTableProps}
            />
          </div>
        </div>
      </>
    )
  },
) as <T>(
  props: TanstackTableProps<T> & { ref?: ForwardedRef<TableRef> },
) => JSX.Element

export { NoobTanstackTable }
