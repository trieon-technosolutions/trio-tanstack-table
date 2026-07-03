/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-comments/disallowComments */
import {
  Cell,
  Column,
  flexRender,
  Header,
  Row,
  Table,
} from "@tanstack/react-table";
import { Flex, Skeleton } from "antd";

import { GetComponentProps, ProForm } from "@ant-design/pro-components";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useForm } from "antd/es/form/Form";
import {
  CSSProperties,
  forwardRef,
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAppTheme } from "~/theme";
import { EParagraph, EText } from "../Typography";
import {
  ShadcnTable,
  ShadcnTableBody,
  ShadcnTableCell,
  ShadcnTableFooter,
  ShadcnTableHead,
  ShadcnTableHeader,
  ShadcnTableRow,
} from "../ui";
import "./table.css";
import { CustomTable } from "./table.types";
import {
  FilterDropDown,
  SortableHeader,
  TanstackTableEmpty,
} from "./tableComponents";
import { TableInput, TableInputFieldTypes } from "./tableInput";
import { getCellSize } from "./tableUtils";

export interface InternalTableProps<T> {
  table: Table<T>;
  loading?: boolean;
  tableLoadingRowCount?: string | number;
  bordered?: boolean;
  onRow?: GetComponentProps<T>;
  // pagination?: boolean
  // virtual?: boolean
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  useViewportHeight?: boolean;
}

const HIGHLIGHT_PRESETS = {
  danger: { tokenBg: "error1", tokenColor: "error8" },
  warning: { tokenBg: "warning1", tokenColor: "warning8" },
  success: { tokenBg: "success1", tokenColor: "success8" },
  info: { tokenBg: "info1", tokenColor: "info8" },
} as const;

const getHighlightStyles = (
  highlight:
    | boolean
    | string
    | { backgroundColor?: string; color?: string; fontWeight?: number }
    | undefined,
  token: Record<string, any>,
): { backgroundColor?: string; color?: string; fontWeight?: number } => {
  if (!highlight) return {};

  if (typeof highlight === "string" && highlight in HIGHLIGHT_PRESETS) {
    const preset =
      HIGHLIGHT_PRESETS[highlight as keyof typeof HIGHLIGHT_PRESETS];
    return {
      backgroundColor: token[preset.tokenBg],
      color: token[preset.tokenColor],
      fontWeight: 600,
    };
  }

  if (typeof highlight === "object") {
    return {
      fontWeight: highlight.fontWeight ?? 600,
      color: highlight.color ?? token.primary8,
      backgroundColor: highlight.backgroundColor ?? token.primary1,
    };
  }

  return {
    backgroundColor: token.primary1,
    color: token.primary8,
    fontWeight: 600,
  };
};

const getCommonPinningStyles = (
  column: Column<any>,
  isRow: boolean,
  isRowSelected: boolean,
): CSSProperties => {
  // note : https://github.com/TanStack/table/issues/5397 pinned group header issue

  const isPinned = column.getIsPinned();
  const columnWidth = column.getSize();

  const leftValue =
    column.columns.length > 0
      ? `${column.columns[0]?.getStart("left")}px`
      : `${column.getStart("left")}px`;
  const rightValue =
    column.columns.length > 0
      ? `${column.columns[column.columns.length - 1]?.getAfter("right")}px`
      : `${column.getAfter("right")}px`;

  return {
    boxShadow: undefined,
    left: isPinned === "left" ? leftValue : undefined,
    right: isPinned === "right" ? rightValue : undefined,

    // left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    // right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    opacity: 1,
    position: isPinned ? "sticky" : "relative",
    width: columnWidth,
    minWidth: columnWidth,
    maxWidth: columnWidth,
    backgroundColor: isPinned
      ? isRow && isRowSelected
        ? "inherit"
        : "#F9FAFB"
      : undefined,
    zIndex: isPinned ? (isRow ? 1 : 10) : undefined,
    overflow: "hidden",
  };
};

const UTILITY_COLUMN_IDS = new Set([
  "rowSelection",
  "index",
  "filter",
  "operations",
  "expandable",
  "custom",
  "custom_two",
]);

const isUtilityColumn = (columnId: string) => UTILITY_COLUMN_IDS.has(columnId);

// note https://muhimasri.com/blogs/react-editable-table/

export const InternalTable = <T,>({
  table,
  loading,
  tableLoadingRowCount = 15,
  bordered = false,
  onRow,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  useViewportHeight = false,
}: InternalTableProps<T>) => {
  const token = useAppTheme();
  const layoutVersion = [
    table.getState().columnPinningVersion ?? 0,
    table.getState().columnVisibilityVersion ?? 0,
    (table.getState().columnOrder ?? []).join("|"),
  ].join("::");

  const columnSizeVars = useMemo(() => {
    const headers = table.getFlatHeaders();
    const colSizes: Record<string, number> = {};
    for (let i = 0; i < headers.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion
      const header = headers[i]!;
      colSizes[`--header-${header.id}-size`] = header.getSize();
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize();
    }
    return colSizes;
  }, [table.getState().columnSizingInfo, table.getState().columnSizing]);

  const parentRef = useRef<HTMLDivElement>(null);
  const rowCountForLayout = table.getRowModel().rows.length;
  const rowVirtualizer = useVirtualizer({
    count: rowCountForLayout,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 12,
    measureElement: (el) => el?.getBoundingClientRect?.().height || 48,
  });

  // note Trigger onLoadMore when the user scrolls near the end of the container
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
      const remaining = scrollHeight - scrollTop - clientHeight;
      // Trigger when we are within 80px of the bottom of the scroll container
      if (remaining < 80) {
        if (hasNextPage && !isFetchingNextPage) {
          onLoadMore?.();
        }
      }
    },
    [hasNextPage, isFetchingNextPage, onLoadMore],
  );

  // note Automatically load more if the initial loaded items do not fill the height of the container
  useEffect(() => {
    const container = parentRef.current;
    if (!container) return;

    const totalRowsCount = table.getRowModel().rows.length;
    if (
      totalRowsCount > 0 &&
      container.scrollHeight > 0 &&
      container.scrollHeight <= container.clientHeight
    ) {
      // Loaded rows don't fill the viewport — pull the next page so the user
      // can keep scrolling.
      if (hasNextPage && !isFetchingNextPage) {
        onLoadMore?.();
      }
    }
  }, [
    hasNextPage,
    isFetchingNextPage,
    onLoadMore,
    table.getRowModel().rows.length,
  ]);

  return (
    <>
      <div
        ref={parentRef}
        onScroll={handleScroll}
        style={{
          ...(useViewportHeight
            ? {
                // Fill the viewport for infinite/cursor tables so the scroll
                // trigger fires reliably on large screens.
                maxHeight: "calc(100vh - 260px)",
                minHeight: rowCountForLayout > 0 ? 320 : undefined,
              }
            : {
                maxHeight: "450px",
              }),
          overflow: "auto",
          boxShadow: "rgba(0, 0, 0, 0.16) 0px 1px 4px",
        }}
      >
        <ShadcnTable
          tabIndex={-1}
          className="w-full table-fixed border-separate border-spacing-0"
          style={{
            ...columnSizeVars,
            minWidth: table.getTotalSize(),
            tableLayout: "fixed",
          }}
        >
          {/* note TABLE HEADER */}

          <ShadcnTableHeader style={{ zIndex: 50 }}>
            {table?.getHeaderGroups()?.map((headerGroup) => {
              return (
                <ShadcnTableRow key={headerGroup.id}>
                  {headerGroup?.headers?.map((header, headerIndex) => {
                    return (
                      <ShadcnTableHead
                        colSpan={header?.colSpan}
                        key={header.id}
                        style={{
                          ...getCommonPinningStyles(
                            header.column,
                            false,
                            false,
                          ),
                          width: `calc(var(--header-${header?.id}-size) * 1px)`,
                          minWidth: header.column.getSize(),
                          maxWidth: header.column.getSize(),
                          ...(header.column.columnDef?.meta?.align
                            ? { textAlign: header.column.columnDef.meta.align }
                            : {}),
                          ...(header.column.columnDef?.meta?.highlight
                            ? {
                                backgroundColor: getHighlightStyles(
                                  header.column.columnDef.meta.highlight,
                                  token,
                                ).backgroundColor,
                              }
                            : {}),
                          borderBottom: `1px solid ${token.neutral4}`,
                          borderRight: `1px solid ${token.neutral4}`,
                          ...(headerIndex === 0
                            ? { borderLeft: `1px solid ${token.neutral4}` }
                            : {}),
                        }}
                        className={
                          isUtilityColumn(header.column.id)
                            ? "px-0 text-center"
                            : "px-3"
                        }
                      >
                        {header?.isPlaceholder ? null : (
                          <div
                            className={`flex items-center font-bold w-full ${
                              isUtilityColumn(header.column.id)
                                ? "justify-center"
                                : header.column.columnDef?.meta?.align ===
                                    "right"
                                  ? "justify-end"
                                  : header.column.columnDef?.meta?.align ===
                                      "center"
                                    ? "justify-center"
                                    : "justify-between"
                            }`}
                          >
                            <Flex
                              gap={16}
                              flex={
                                header.column.columnDef?.meta?.align
                                  ? undefined
                                  : 1
                              }
                              align="center"
                              justify={
                                isUtilityColumn(header.column.id)
                                  ? "center"
                                  : header.subHeaders.length > 0
                                    ? "center"
                                    : header.column.columnDef?.meta?.align ===
                                        "right"
                                      ? "flex-end"
                                      : header.column.columnDef?.meta?.align ===
                                          "center"
                                        ? "center"
                                        : "space-between"
                              }
                              onClick={
                                header.column.getCanSort()
                                  ? header.column.getToggleSortingHandler()
                                  : undefined
                              }
                            >
                              <EText
                                fontWeight="600"
                                className="text-center font-medium w-max"
                                color={
                                  header.column.columnDef?.meta?.highlight
                                    ? getHighlightStyles(
                                        header.column.columnDef.meta.highlight,
                                        token,
                                      ).color
                                    : undefined
                                }
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                              </EText>

                              <Flex gap={2}>
                                {!isUtilityColumn(header.column.id) &&
                                  header.column.getCanSort() && (
                                    <SortableHeader
                                      header={
                                        header as Header<unknown, unknown>
                                      }
                                    />
                                  )}

                                {!isUtilityColumn(header.column.id) &&
                                header.column.getCanFilter() ? (
                                  <FilterDropDown
                                    table={table}
                                    key="filter"
                                    column={
                                      header.column as Column<unknown, unknown>
                                    }
                                  />
                                ) : null}
                              </Flex>
                            </Flex>
                            {header.column.getCanResize() && (
                              <ResizeHandle header={header} />
                            )}
                          </div>
                        )}
                      </ShadcnTableHead>
                    );
                  })}
                </ShadcnTableRow>
              );
            })}
          </ShadcnTableHeader>

          {/* note TABLE BODY */}
          {table.getState().columnSizingInfo.isResizingColumn ? (
            <TableBody
              table={table}
              bordered={bordered}
              onRow={onRow}
              layoutVersion={layoutVersion}
            />
          ) : (
            <VirtualTableBody
              data={rowVirtualizer.getVirtualItems() as any}
              totalSize={rowVirtualizer.getTotalSize()}
              table={table}
              bordered={bordered}
              onRow={onRow}
              layoutVersion={layoutVersion}
              measureElement={rowVirtualizer.measureElement}
            />
          )}

          {/* note Table Footer — sticky to the bottom of the scroll area so the
              summary/grand-total row stays visible while scrolling. */}
          {table
            .getFlatHeaders()
            ?.flatMap((header) => header?.column?.columnDef?.footer)
            .filter(Boolean).length > 0 && (
            <ShadcnTableFooter className="sticky bottom-0 z-30">
              {table.getFooterGroups().map((footerGroup) => {
                return (
                  <ShadcnTableRow key={footerGroup.id}>
                    {footerGroup.headers?.map((header) => {
                      const footerAlign = header.column.columnDef?.meta?.align;
                      return (
                        <ShadcnTableCell
                          key={header.id}
                          className="border-t font-semibold"
                          style={{
                            position: "sticky",
                            bottom: 0,
                            backgroundColor: "#fff",
                            textAlign: footerAlign || undefined,
                          }}
                        >
                          {header?.isPlaceholder
                            ? null
                            : flexRender(
                                header?.column?.columnDef?.footer,
                                header?.getContext(),
                              )}
                        </ShadcnTableCell>
                      );
                    })}
                  </ShadcnTableRow>
                );
              })}
            </ShadcnTableFooter>
          )}

          {/* note TABLE LOADING STATE */}
          {loading &&
            [...Array(tableLoadingRowCount)]
              .map((_, index) => ({
                key: `key${index}`,
              }))
              ?.map((item) => {
                return (
                  <ShadcnTableRow key={item.key}>
                    {table?.getAllColumns()?.map((column) => {
                      return (
                        <ShadcnTableCell className="p-3" key={column.id}>
                          <Skeleton active title paragraph={false} />
                        </ShadcnTableCell>
                      );
                    })}
                  </ShadcnTableRow>
                );
              })}
        </ShadcnTable>
      </div>
      {/* note TABLE EMPTY STATE */}
      {/* <ShadcnTableRow >
          <ShadcnTableCell
            colSpan={12}
            className="h-24 text-center text-gray-500"
          >
            <TanstackTableEmpty />
          </ShadcnTableCell>
        </ShadcnTableRow> */}
      {!loading && table?.getFilteredRowModel().rows.length === 0 && (
        <Flex flex={1} justify="center" align="center">
          <TanstackTableEmpty />
        </Flex>
      )}
    </>
  );
};

interface TableBodyProps<T> extends InternalTableProps<T> {
  table: Table<T>;
  data?: any[];
  totalSize?: number;
  layoutVersion?: string;
}

export const TableBody = <T,>({
  table,
  bordered,
  onRow,
  layoutVersion = "",
}: TableBodyProps<T>) => {
  return (
    <ShadcnTableBody tabIndex={-1} className={`p-0 ${bordered}`}>
      {table?.getRowModel().rows.map((row: Row<T>, index) => {
        return (
          <Fragment key={`${row.id}-${layoutVersion}`}>
            <EditableRow
              index={index}
              row={row}
              isSelected={row.getIsSelected()}
              onRow={onRow}
              table={table}
              bordered={bordered}
              layoutVersion={layoutVersion}
            />
            {/* If the row is expanded (for non-grouped rows), render custom expansion content */}
            {row.getIsExpanded() &&
              !row.getIsGrouped() &&
              table.options.meta?.rowExpandable && (
                <ShadcnTableRow>
                  <ShadcnTableCell
                    colSpan={row.getAllCells().length}
                    style={{
                      backgroundColor: "#f5f5f5",
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    {/* Custom expansion UI can be added here */}
                  </ShadcnTableCell>
                </ShadcnTableRow>
              )}
          </Fragment>
        );
      })}
    </ShadcnTableBody>
  );
};
export const VirtualTableBody = <T,>({
  data,
  table,
  bordered,
  totalSize = 0,
  onRow,
  measureElement,
  layoutVersion = "",
}: TableBodyProps<T> & { measureElement: (el: Element | null) => void }) => {
  const paddingTop = data && data?.length > 0 ? data[0].start || 0 : 0;
  const paddingBottom =
    data && data?.length > 0 ? totalSize - (data?.at(-1)?.end || 0) : 0;

  return (
    <ShadcnTableBody className={`p-0 ${bordered}`}>
      {paddingTop ? (
        <ShadcnTableRow
          style={{
            height: paddingTop,
          }}
        >
          <ShadcnTableCell colSpan={table.getFlatHeaders().length} />
        </ShadcnTableRow>
      ) : undefined}

      {data?.map(({ index }: Record<string, number>) => {
        const row = table.getRowModel().rows[index];

        return (
          <Fragment key={`${row.id}-${layoutVersion}`}>
            <EditableRow
              index={index}
              row={row}
              isSelected={row.getIsSelected()}
              onRow={onRow}
              table={table}
              bordered={bordered}
              layoutVersion={layoutVersion}
              ref={(el) => measureElement(el)}
            />

            {/* If the row is expanded (for non-grouped rows), render custom expansion content */}
            {row.getIsExpanded() &&
              !row.getIsGrouped() &&
              table.options.meta?.rowExpandable && (
                <ShadcnTableRow>
                  <ShadcnTableCell
                    colSpan={row.getAllCells().length}
                    style={{
                      backgroundColor: "#f5f5f5",
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    {/* Custom expansion UI can be added here */}
                  </ShadcnTableCell>
                </ShadcnTableRow>
              )}
          </Fragment>
        );
      })}

      {paddingBottom ? (
        <ShadcnTableRow
          style={{
            height: paddingBottom,
          }}
        >
          <ShadcnTableCell colSpan={table.getFlatHeaders().length} />
        </ShadcnTableRow>
      ) : undefined}
    </ShadcnTableBody>
  );
};

export const MemoizedTableBody = memo(TableBody) as typeof TableBody;

export const MemoizedCell: React.FC<{
  cell: Cell<any, any>;
  token: any;
  table: CustomTable<any>;
  bordered: any;
  isPinning: boolean;
  isRowSelected: boolean;
  layoutVersion?: string;
}> = memo(
  ({ cell, token, table, bordered, isRowSelected }) => {
    // Track both editing state and value
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(cell.getValue());
    // Sync local value with cell value when not editing
    useEffect(() => {
      if (!isEditing) {
        setLocalValue(cell.getValue());
      }
    }, [cell.getValue(), isEditing]);

    const onValueChange = useCallback((e: any) => {
      const newValue = e?.target?.value ?? e;
      setLocalValue(newValue);
    }, []);

    const onBlur = useCallback(() => {
      setIsEditing(false);
      table.options.meta?.updateData?.(
        cell.row.index,
        cell.column.id,
        localValue,
      );
    }, [cell.column.id, cell.row.index, localValue, table.options.meta]);

    if (!cell.column.columnDef?.meta?.editable) {
      const cellAlign = cell.column.columnDef?.meta?.align;
      const highlight = cell.column.columnDef?.meta?.highlight;
      const highlightStyles = getHighlightStyles(highlight, token);
      return (
        <ShadcnTableCell
          tabIndex={-1}
          style={{
            ...getCommonPinningStyles(cell.column, true, isRowSelected),
            width: cell.column.getSize(),
            minWidth: cell.column.getSize(),
            maxWidth: cell.column.getSize(),
            fontWeight: 400,
            color: token.neutral9,
            ...(cellAlign ? { textAlign: cellAlign } : {}),
            ...highlightStyles,
          }}
          className={`${
            isUtilityColumn(cell.column.id)
              ? `${getCellSize(table.getState()?.density)} px-0 text-center`
              : `${getCellSize(table.getState()?.density)} px-3`
          } ${bordered}`}
          key={cell.id}
        >
          {![
            "filter",
            "index",
            "rowSelection",
            "operations",
            "expandable",
            "custom",
            "custom_two",
            "maintenance_follow_up",
          ].includes(cell.column.id) ? (
            cell.getValue() === undefined ||
            cell.getValue() === null ||
            cell.getValue() === "" ? (
              "-"
            ) : typeof cell.getValue() !== "object" ? (
              <EParagraph
                style={{
                  marginBottom: 0,
                  maxWidth: "100%",
                  ...(cellAlign ? { textAlign: cellAlign } : {}),
                  ...(highlight
                    ? {
                        color: highlightStyles.color,
                        fontWeight: highlightStyles.fontWeight,
                      }
                    : {}),
                }}
                className={cellAlign ? "" : "w-full"}
                ellipsis={
                  cellAlign
                    ? undefined
                    : {
                        tooltip: flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        ),
                        rows: 1,
                      }
                }
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </EParagraph>
            ) : (
              flexRender(cell.column.columnDef.cell, cell.getContext())
            )
          ) : (
            flexRender(cell.column.columnDef.cell, cell.getContext())
          )}
          {/* // ? flexRender(cell.column.columnDef.cell, cell.getContext())
            // : "-"} */}
        </ShadcnTableCell>
      );
    }

    const editCellAlign = cell.column.columnDef?.meta?.align;
    return (
      <ShadcnTableCell
        style={{
          ...getCommonPinningStyles(cell.column, true, isRowSelected),
          width: cell.column.getSize(),
          minWidth: cell.column.getSize(),
          maxWidth: cell.column.getSize(),
          fontWeight: 400,
          color: token.neutral9,
          ...(editCellAlign ? { textAlign: editCellAlign } : {}),
        }}
        className={`${
          isUtilityColumn(cell.column.id)
            ? `${getCellSize(table.getState()?.density)} px-0 text-center`
            : `${getCellSize(table.getState()?.density)} px-3`
        } ${bordered}`}
        key={cell.id}
      >
        <TableInput
          value={localValue}
          onChange={onValueChange}
          onBlur={onBlur}
          onFocus={() => setIsEditing(true)}
          type={cell.column.columnDef?.meta?.valueType as TableInputFieldTypes}
          {...(typeof cell.column.columnDef?.meta?.inputItemProps === "function"
            ? cell.column.columnDef?.meta?.inputItemProps?.(cell.row?.original)
            : cell.column.columnDef?.meta?.inputItemProps)}
        />
      </ShadcnTableCell>
    );
  },
  (prev, next) => {
    if (prev.layoutVersion !== next.layoutVersion) {
      return false;
    }

    if (
      prev.table.getState().columnSizingInfo.isResizingColumn ||
      next.table.getState().columnSizingInfo.isResizingColumn
    ) {
      return false;
    }

    // Simplified but more effective comparison
    const prevCell = prev.cell;
    const nextCell = next.cell;
    const prevColumn = prevCell.column;
    const nextColumn = nextCell.column;

    return (
      prevCell.getValue() === nextCell.getValue() &&
      prevColumn.getIsPinned() === nextColumn.getIsPinned() &&
      prevColumn.getIsVisible() === nextColumn.getIsVisible() &&
      prevCell.row.index === nextCell.row.index &&
      prev.isPinning === next.isPinning &&
      prev.isRowSelected === next.isRowSelected
    );
  },
);
MemoizedCell.displayName = "MemoizedCell";

// Editable Row Component
export const EditableRow = memo(
  forwardRef<
    HTMLTableRowElement,
    {
      index: any;
      row: Row<any>;
      isSelected: boolean;
      onRow: any;
      table: Table<any>;
      bordered: any;
      layoutVersion?: string;
      data?: any[];
      height?: number;
    }
  >(
    (
      { index, row, isSelected, onRow, table, bordered, layoutVersion = "" },
      ref,
    ) => {
      const token = useAppTheme();
      const [form] = useForm();

      // Memoize row handlers
      const rowHandlers = useMemo(
        () => ({
          ...onRow?.(row.original, row?.id as unknown as number),
        }),
        [row.id, row.original, onRow],
      );

      // Check if this is a group row
      const isGrouped = row.getIsGrouped();
      const groupingColumnId = row.groupingColumnId;

      // Get nesting level for multi-level grouping (indentation)
      const groupingLevel = isGrouped ? (row.depth ?? 0) : 0;

      // If grouped, render as a full-width "card header" row: a single spanning
      // cell whose label sticks to the left and stays visible on horizontal scroll.
      if (isGrouped) {
        const groupValue = groupingColumnId
          ? row.getValue(groupingColumnId)
          : undefined;
        const groupColumnHeader = groupingColumnId
          ? table.getColumn(groupingColumnId)?.columnDef?.header
          : undefined;
        // Sequential ordinal of this group among its siblings at the same level
        // (1, 2, 3 …) — NOT the grouping level, which is always 1 for a single
        // group-by and reads as a confusing "1, 1, 1".
        const orderBadge =
          table
            .getRowModel()
            .rows.filter((r) => r.getIsGrouped() && r.depth === row.depth)
            .findIndex((r) => r.id === row.id) + 1;

        // Server group summary (correct full counts + financial totals),
        // independent of how many detail rows have streamed in. Build this
        // header's group value path (ancestors + self), then look it up —
        // exact match for leaf groups, prefix-aggregate for parent levels.
        const summaryMap = table.options.meta?.groupSummary;
        const ancestorRows =
          (row.getParentRows?.() as typeof row.subRows | undefined) ?? [];
        const keyPath = [...ancestorRows, row]
          .filter((r) => r.getIsGrouped?.())
          .map((r) => {
            const id = r.groupingColumnId;
            const v = id ? r.getValue(id) : undefined;
            return v === null || v === undefined ? null : String(v);
          });
        let summaryCount: number | undefined;
        let summaryTotal: string | undefined;
        if (summaryMap && keyPath.length > 0) {
          const exact = summaryMap.get(JSON.stringify(keyPath));
          if (exact) {
            summaryCount = exact.count;
            summaryTotal = exact.total;
          } else {
            let c = 0;
            let t = 0;
            let matched = false;
            for (const [k, v] of summaryMap.entries()) {
              const arr = JSON.parse(k) as (string | null)[];
              if (keyPath.every((kp, i) => arr[i] === kp)) {
                c += v.count;
                t += Number(v.total);
                matched = true;
              }
            }
            if (matched) {
              summaryCount = c;
              summaryTotal = t.toFixed(2);
            }
          }
        }
        const displayCount = summaryCount ?? row.subRows.length;

        return (
          <ShadcnTableRow
            data-index={index}
            tabIndex={-1}
            key={row?.id}
            id={`row-${row.id}`}
            ref={ref}
            onClick={() => row.getToggleExpandedHandler()?.()}
            style={{
              width: "100%",
              cursor: row.getCanExpand() ? "pointer" : "default",

              backgroundColor:
                groupingLevel === 0 ? token.primary5 : token.neutral2,
              borderTop: `1px solid ${token.neutral5}`,
              borderBottom: `1px solid ${token.neutral5}`,
              // Subtle ERP-style left accent bar to set group headers apart from
              // detail rows without being loud (inset shadow = no layout shift).
              boxShadow: `inset 3px 0 0 0 ${token.primary6}`,
            }}
          >
            <ShadcnTableCell
              colSpan={row.getVisibleCells().length}
              className={getCellSize(table.getState()?.density)}
              style={{ padding: 0 }}
            >
              <Flex
                align="center"
                gap={8}
                style={{
                  position: "sticky",
                  left: 0,
                  width: "max-content",
                  paddingBlock: 8,
                  paddingInlineStart: 14 + groupingLevel * 20,
                  paddingInlineEnd: 14,
                  fontWeight: 600,
                }}
              >
                {row.getCanExpand() && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      row.getToggleExpandedHandler()?.();
                    }}
                    style={{
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      width: 16,
                      justifyContent: "center",
                    }}
                  >
                    <EText color={token.neutral7} style={{ fontSize: 10 }}>
                      {row.getIsExpanded() ? "▼" : "▶"}
                    </EText>
                  </button>
                )}

                <Flex
                  align="center"
                  justify="center"
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    backgroundColor: token.primary6,
                    color: token.neutral1,
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {orderBadge}
                </Flex>

                <EText color={token.neutral7} style={{ fontWeight: 500 }}>
                  {typeof groupColumnHeader === "string"
                    ? `${groupColumnHeader}:`
                    : ""}
                </EText>
                <EText fontWeight="700" color={token.neutral10}>
                  {groupValue === null || groupValue === undefined
                    ? "(Blank)"
                    : String(groupValue)}
                </EText>

                <span
                  style={{
                    marginInlineStart: 6,
                    backgroundColor: token.neutral1,
                    border: `1px solid ${token.neutral4}`,
                    color: token.neutral7,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "1px 8px",
                    borderRadius: 999,
                  }}
                >
                  {displayCount} {displayCount === 1 ? "item" : "items"}
                </span>

                {summaryTotal !== undefined && (
                  <span
                    style={{
                      marginInlineStart: 4,
                      backgroundColor: token.primary1,
                      border: `1px solid ${token.primary3}`,
                      color: token.primary8,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "1px 8px",
                      borderRadius: 999,
                    }}
                  >
                    ₹{summaryTotal}
                  </span>
                )}
              </Flex>
            </ShadcnTableCell>
          </ShadcnTableRow>
        );
      }

      // Regular data row rendering
      return (
        <ProForm key={index} submitter={false} form={form} component={false}>
          <ShadcnTableRow
            {...rowHandlers}
            data-index={index} // note needed for dynamic row height measurement
            tabIndex={-1}
            key={row?.id}
            id={`row-${row.id}`}
            ref={ref}
            style={{
              width: "100%",
              backgroundColor: isSelected ? token.neutral4 : undefined,
              borderBottom: `1px solid ${token.primary1}`,
            }}
          >
            {row?.getVisibleCells().map((cell: any) => {
              return (
                <MemoizedCell
                  key={cell.id}
                  cell={cell}
                  token={token}
                  table={table as CustomTable<any>}
                  bordered={bordered}
                  isPinning={cell.column.getIsPinned()}
                  isRowSelected={isSelected}
                  layoutVersion={layoutVersion}
                />
              );
            })}
          </ShadcnTableRow>
        </ProForm>
      );
    },
  ),
  (prev, next) => {
    if (prev.layoutVersion !== next.layoutVersion) {
      return false;
    }

    if (
      prev.table.getState().columnSizingInfo.isResizingColumn ||
      next.table.getState().columnSizingInfo.isResizingColumn
    ) {
      return false;
    }

    // note Always re-render group rows so the expand chevron / count stay in
    // sync with expansion state (their cell values don't change on toggle).
    if (
      prev.row.getIsGrouped() ||
      next.row.getIsGrouped() ||
      prev.row.getIsExpanded() !== next.row.getIsExpanded() ||
      prev.row.subRows.length !== next.row.subRows.length
    ) {
      return false;
    }

    // More efficient comparison that focuses on what matters
    const prevRow = prev.row;
    const nextRow = next.row;
    const prevVisibleColumns = prevRow.getVisibleCells().map((cell) => ({
      id: cell.column.id,
      pinned: cell.column.getIsPinned(),
      visible: cell.column.getIsVisible(),
    }));
    const prevOrderColumns = prevRow
      .getAllCells()
      .map((cell) => cell.column.id)
      .join("|");
    const nextOrderColumns = nextRow
      .getAllCells()
      .map((cell) => cell.column.id)
      .join("|");
    const nextVisibleColumns = nextRow.getVisibleCells().map((cell) => ({
      id: cell.column.id,
      pinned: cell.column.getIsPinned(),
      visible: cell.column.getIsVisible(),
    }));

    return (
      prevOrderColumns === nextOrderColumns &&
      prevRow.id === nextRow.id &&
      prev.isSelected === next.isSelected &&
      JSON.stringify(prevVisibleColumns) ===
        JSON.stringify(nextVisibleColumns) &&
      prevRow
        .getVisibleCells()
        .every(
          (cell, i) =>
            cell.getValue() === nextRow.getVisibleCells()[i].getValue(),
        )
    );
  },
);
EditableRow.displayName = "EditableRow";

// Update ResizeHandle
const ResizeHandle = memo(({ header }: { header: any }) => (
  <div
    className={`resizer  ${header.column.getIsResizing() ? "isResizing" : ""}`}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
    onMouseDown={(e) => {
      e.preventDefault();
      e.stopPropagation();
      const handler = header.getResizeHandler();
      handler(e);
    }}
    onTouchStart={(e) => {
      e.preventDefault();
      e.stopPropagation();
      const handler = header.getResizeHandler();
      handler(e);
    }}
    style={{
      transform: header.column.getIsResizing()
        ? `translateX(${
            header.getResizingOffset() * (header.column.getCanResize() ? 1 : 0)
          }px)`
        : undefined,
    }}
  />
));

ResizeHandle.displayName = "ResizeHandle";
