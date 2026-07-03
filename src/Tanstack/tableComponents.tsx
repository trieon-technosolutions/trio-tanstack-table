/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CaretDownOutlined,
  CaretUpOutlined,
  EyeOutlined,
  FilterOutlined,
  SearchOutlined,
  SettingOutlined,
  VerticalAlignBottomOutlined,
  VerticalAlignMiddleOutlined,
  VerticalAlignTopOutlined,
} from "@ant-design/icons"
import {
  Column,
  ColumnFiltersState,
  Header,
  Table,
  TableState,
} from "@tanstack/react-table"
import {
  Checkbox,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  InputRef,
  Popover,
  Select,
  Space,
  Tooltip,
} from "antd"
import {
  ForwardedRef,
  forwardRef,
  Fragment,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  EDividerWithNoStyle,
  EHeading,
  ELink,
  EText,
  ProDatePicker,
  useFilePreview,
} from "~/shared/common"
import { useAppTheme } from "~/theme"
import {
  CustomColumnMeta,
  OptionConfig,
  TableEditableCellProps,
  TableRef,
  TanstackToolbarProps,
} from "./table.types"

import { ProFormDateRangePicker } from "@ant-design/pro-components"
import { DndContext, DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  IconGripVertical,
  IconSearch,
  IconZoomExclamation,
} from "@tabler/icons-react"
import { useSafeState } from "ahooks"
import { DefaultOptionType } from "antd/es/select"
import Link from "antd/es/typography/Link"
import dayjs from "dayjs"
import _, { isArray } from "lodash"
import { useHotkeys } from "react-hotkeys-hook"
import {
  defaultPinnedColumns,
  PAGINATION_PAGE_SIZE_OPTIONS,
} from "./tableConstant"
import { TableInput, TableInputFieldTypes } from "./tableInput"
import { handlePinColumn, isCheckAll, isIndeterminate } from "./tableUtils"

import { EButton, TableClearButton } from "../ProComponents/Button"
import {
  FilterCol,
  FilterProDrawerForm,
  FilterRow,
} from "../ProComponents/FilterLayout"
import { ETab } from "../ProComponents/Tab"

export const FilterDropDown = ({
  column,
  table,
}: {
  column: Column<any>
  table: Table<any>
}) => {
  const { filterVariant = "search", valueEnum } = (column.columnDef.meta ??
    {}) as CustomColumnMeta<any, any>

  const { manualFiltering } = table.options ?? {}

  const token = useAppTheme()
  const [value, setValue] = useSafeState<any>(undefined)
  const searchInputRef = useRef<InputRef>(null)
  const [isDropdownVisible, setIsDropdownVisible] = useState(false)

  const sortedUniqueValues = useMemo(
    () =>
      filterVariant === "range"
        ? []
        : // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
          Array.from(column.getFacetedUniqueValues().keys())
            .sort()
            .slice(0, 5000)
            .map((item) => item),
    [column, filterVariant, isDropdownVisible],
  )
  const [allListValues, setAllListValues] = useState(sortedUniqueValues)
  useEffect(() => {
    setAllListValues(sortedUniqueValues.filter((item) => item))
  }, [sortedUniqueValues])

  const isFilterApplied = Object.keys(
    table?.getState()?.searchParams ?? {},
  ).includes(column.columnDef.id ?? "")

  if (manualFiltering) {
    return isFilterApplied ? (
      <>
        {filterVariant === "search" ? (
          <IconZoomExclamation
            size={16}
            style={{
              marginTop: 3,
              marginRight: 2,
              marginLeft: 12,
              fontWeight: 500,
              color: token.info7,
            }}
          />
        ) : (
          <FilterOutlined
            onClick={(e) => {
              e.stopPropagation()
              searchInputRef.current?.focus()
            }}
            style={{
              marginRight: 2,
              marginLeft: 12,
              fontWeight: 500,
              color: token.info7,
            }}
          />
        )}
      </>
    ) : undefined
  }

  const items = [
    {
      key: "search",

      label: (
        <Input
          ref={searchInputRef}
          width={"sm"}
          type="text"
          onFocusCapture={(e) => {
            if (e.target.value) {
              searchInputRef.current?.select()
            }
          }}
          value={value}
          onChange={(e) => {
            setValue(e?.target?.value)
            _.debounce(() => column?.setFilterValue(e.target.value), 300)()
          }}
          placeholder={`Search...`}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      disabled: filterVariant !== "search",
    },
    {
      key: "date",
      label: (
        <ProDatePicker
          ref={searchInputRef}
          width={"sm"}
          fieldProps={{
            defaultOpen: true,
            size: "middle",
            value,
            onClick: (e: any) => e.stopPropagation(),
            onChange: (e: any) => {
              if (e) {
                setValue(e)
                column?.setFilterValue(
                  dayjs(dayjs(e).toISOString()).format("YYYY-MM-DD"),
                )
              } else {
                setValue(undefined)
                column?.setFilterValue(undefined)
              }
            },
            placeholder: "Select date",
          }}
        />
      ),
      disabled: filterVariant !== "date",
    },
    {
      key: "date-range",
      label: (
        <ProFormDateRangePicker
          fieldProps={{
            showNow: true,
            open: isDropdownVisible,
            value,
            onClick: (e) => {
              e.stopPropagation()
              setIsDropdownVisible(true)
            },
            onChange: (e) => {
              if (e) {
                setValue(e)
                column?.setFilterValue([
                  e[0]?.format("YYYY-MM-DD"),
                  e[1]?.format("YYYY-MM-DD"),
                ])
                setIsDropdownVisible(false)
              } else {
                setValue(undefined)
                column?.setFilterValue(undefined)
                setIsDropdownVisible(false)
              }
            },
          }}
        />
      ),
      disabled: filterVariant !== "date-range",
    },
    {
      key: "multi-select",
      onMouseEnter: () => {
        searchInputRef.current?.focus()
      },
      label: (
        <div
          onClick={(e) => {
            e.stopPropagation()
          }}
          style={{
            width: "100%",
            padding: "4px",
          }}
        >
          <Checkbox
            className="mb-3 "
            disabled={sortedUniqueValues.length === 0}
            indeterminate={
              isArray(column?.getFilterValue())
                ? isIndeterminate(
                    column?.getFilterValue() as string[],
                    sortedUniqueValues,
                  ) &&
                  !isCheckAll(
                    column?.getFilterValue() as string[],
                    sortedUniqueValues,
                  )
                : false
            }
            checked={isCheckAll(
              column?.getFilterValue() as string[],
              sortedUniqueValues,
            )}
            onChange={(e) => {
              if (e.target.checked) {
                column?.setFilterValue(sortedUniqueValues)
                setValue(undefined)
              } else {
                column?.setFilterValue(undefined)
                setValue(undefined)
              }
            }}
          >
            Select all items
          </Checkbox>
          <Input
            width={120}
            className="mb-2"
            placeholder="Search..."
            size="small"
            value={value}
            onChange={(e) => {
              const value = e.target.value
              setValue(value)
              const filteredValues = sortedUniqueValues.filter((item) => {
                return item
                  ?.toLowerCase()
                  .includes(value.toString().toLowerCase())
              })

              if (filteredValues.length > 0) {
                _.debounce(() => setAllListValues(filteredValues), 300)()
              } else {
                setAllListValues([])
              }
            }}
          />
          <div
            className="mb-2"
            style={{
              height: 150,
              overflow: "auto",
            }}
          >
            {allListValues?.length === 0 && <Empty />}
            {allListValues?.map((item) => {
              return (
                <div className="pl-5" key={item}>
                  <Checkbox
                    className="mb-1 hover:bg-gray-100 w-full rounded-sm"
                    style={{
                      color: token.neutral9,
                    }}
                    name={item}
                    checked={(column?.getFilterValue() as string[])?.includes(
                      item,
                    )}
                    onChange={(e) => {
                      e.stopPropagation()
                      if (e.target.checked) {
                        column?.setFilterValue((prev: any) => {
                          if (prev?.includes(item)) {
                            return prev?.filter((i: any) => i !== item)
                          } else {
                            return [...(prev ?? []), item]
                          }
                        })
                      } else {
                        column?.setFilterValue((prev: any) => {
                          if (prev?.includes(item)) {
                            return prev?.filter((i: any) => i !== item)
                          } else {
                            return [...(prev ?? []), item]
                          }
                        })
                      }
                    }}
                  >
                    {item}
                  </Checkbox>
                </div>
              )
            })}
          </div>
          <EDividerWithNoStyle
            style={{
              marginInline: "-18px",
              marginTop: "0",
              marginBottom: 4,
              width: "calc(100% + 34px)",
            }}
          />
          <Link
            disabled={
              isArray(column.getFilterValue())
                ? (column.getFilterValue() as string[])?.length === 0
                : true
            }
            onClick={(e) => {
              e.stopPropagation()
              column.setFilterValue(undefined)
            }}
          >
            Reset
          </Link>
        </div>
      ),

      onClick: (e: any) => e.stopPropagation(),
      disabled: filterVariant !== "multi-select",
    },
    {
      key: "select",
      onMouseEnter: () => {
        searchInputRef.current?.focus()
      },

      label: (
        <select
          style={{
            width: "100%",
            padding: "4px",
          }}
          onChange={(e) => {
            column.setFilterValue(e.target.value)
            setValue(e.target.value)
          }}
          value={(column.getFilterValue() as string)?.toString()}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">All</option>

          {valueEnum
            ? Object.keys(valueEnum).map((key) => (
                <option value={key} key={key}>
                  {valueEnum[key]?.text}
                </option>
              ))
            : sortedUniqueValues.map((value) => (
                // note dynamically generated select options from faceted values feature
                <option value={value} key={value}>
                  {valueEnum ? valueEnum?.[value]?.text : value}
                </option>
              ))}
        </select>
      ),
      disabled: filterVariant !== "select",
    },
  ].filter((item) => !item.disabled)

  return (
    <Popover content={items[0]?.label} title={undefined} trigger="click">
      {filterVariant === "search" ? (
        value ? (
          <IconZoomExclamation
            size={16}
            style={{
              marginTop: 3,
              marginRight: 2,
              marginLeft: 12,
              fontWeight: 500,
              color: token.info7,
            }}
          />
        ) : (
          <IconSearch
            size={16}
            onClick={(e) => {
              e.stopPropagation()
              searchInputRef.current?.focus()
            }}
            style={{
              marginTop: 3,
              marginRight: 2,
              marginLeft: 12,
              fontWeight: 500,

              color: token.neutral7,
            }}
          />
        )
      ) : (
        <FilterOutlined
          onClick={(e) => {
            e.stopPropagation()
            searchInputRef.current?.focus()
          }}
          style={{
            marginRight: 2,
            marginLeft: 12,
            fontWeight: 500,
            color:
              value || column.getFilterValue()
                ? `${token.info7}`
                : `${token.neutral7}`,
          }}
        />
      )}
    </Popover>
  )
}

interface ColumnDropDownProps<T> {
  column: Table<T>
}

export const ColumnDropDown = <T,>(table: ColumnDropDownProps<T>) => {
  const token = useAppTheme()

  const handleColumnVisibilityChange = (
    columnId: string,
    isVisible: boolean,
  ) => {
    table.column.setColumnVisibility((prev) => ({
      ...prev,
      [columnId]: isVisible,
    }))
  }

  const tableState = table.column.getState()

  const allColumns = useMemo(
    () =>
      table.column
        .getAllLeafColumns()
        .filter((column) => !defaultPinnedColumns.includes(column.id)),
    [tableState.columnOrder, tableState.columnPinning, tableState.columnVisibility],
  )

  const leftColumns = useMemo(
    () =>
      table.column
        .getLeftLeafColumns()
        .filter((column) => !defaultPinnedColumns.includes(column.id)),
    [tableState.columnOrder, tableState.columnPinning, tableState.columnVisibility],
  )

  const rightColumns = useMemo(
    () =>
      table.column
        .getRightLeafColumns()
        .filter((column) => !defaultPinnedColumns.includes(column.id)),
    [tableState.columnOrder, tableState.columnPinning, tableState.columnVisibility],
  )

  const unPinnedColumns = useMemo(
    () =>
      table.column
        .getCenterLeafColumns()
        .filter(
          (column) =>
            !defaultPinnedColumns.includes(column.id) && column?.getCanPin(),
        ),
    [tableState.columnOrder, tableState.columnPinning, tableState.columnVisibility],
  )

  const Content = () => {
    return (
      <>
        {/* note columns pinned to left */}
        {leftColumns.length > 0 && (
          <Flex vertical gap={8} flex={1} style={{ minWidth: 200, padding: 8 }}>
            <EText color={token.neutral8}>Fixed to Left</EText>

            {leftColumns.map((column: any) => {
              return (
                <Flex key={column.id} gap={8}>
                  {/* note Checkbox to toggle column visibility */}
                  <Checkbox
                    checked={column.getIsVisible()}
                    disabled={!column.getCanHide()}
                    onChange={(e) =>
                      handleColumnVisibilityChange(
                        column.id,
                        e.target.checked,
                      )
                    }
                  />{" "}
                  {/* note Column Pinning */}
                  <Flex flex={1} justify="space-between">
                    <EText color={token.neutral8}>{column.columnDef.header}</EText>
                    <Space.Compact>
                      {column.getIsPinned() === "left" ? (
                        <Flex>
                          <Tooltip title="Unpin">
                            <VerticalAlignMiddleOutlined
                              onClick={() => {
                                column?.pin(false)
                              }}
                              className="cursor-pointer"
                            />
                          </Tooltip>
                          <Tooltip title="Pin Right">
                            <VerticalAlignBottomOutlined
                              onClick={() => {
                                column?.pin("right")
                                handlePinColumn(
                                  column.id,
                                  "right",
                                  table.column as Table<unknown>,
                                )
                              }}
                              className="cursor-pointer"
                            />
                          </Tooltip>
                        </Flex>
                      ) : (
                        <Flex>
                          <Tooltip title="Pin Left">
                            <VerticalAlignTopOutlined
                              onClick={() => {
                                column?.pin("left")
                              }}
                              className="cursor-pointer"
                            />
                          </Tooltip>
                          <Tooltip title="Unpin">
                            <VerticalAlignMiddleOutlined
                              onClick={() => {
                                column?.pin(false)
                              }}
                              className="cursor-pointer"
                            />
                          </Tooltip>
                        </Flex>
                      )}
                    </Space.Compact>
                  </Flex>
                </Flex>
              )
            })}
          </Flex>
        )}

        {/* note  unpinned columns */}
        {unPinnedColumns?.length > 0 && (
          <Flex vertical gap={8} flex={1} style={{ minWidth: 200, padding: 8 }}>
            <EText>Unpinned</EText>
            <DndContext
              onDragEnd={(e: DragEndEvent) => {
                const { active, over } = e
                if (active.id !== over?.id) {
                  const flatAllColumns = allColumns?.flatMap((item) => item.id)
                  const oldIndex = flatAllColumns?.indexOf(active.id.toString())
                  const newIndex = flatAllColumns?.indexOf(
                    (over?.id || "").toString(),
                  )
                  const newOrder = arrayMove(flatAllColumns, oldIndex, newIndex)
                  table.column.setColumnOrder(newOrder)
                }
              }}
            >
              <SortableContext items={unPinnedColumns}>
                {unPinnedColumns?.map((column: any) => {
                  return (
                    <SortableColumns
                      key={column.id}
                      id={column.id}
                      disabled={!column.getIsVisible()}
                    >
                      <Flex
                        className="w-full"
                        flex={1}
                        key={column.columnDef.accessorKey}
                        gap={8}
                      >
                        {/* note Checkbox to toggle column visibility */}
                        <Checkbox
                          checked={column.getIsVisible()}
                          disabled={!column.getCanHide()}
                          onChange={(e) =>
                            handleColumnVisibilityChange(
                              column.id,
                              e.target.checked,
                            )
                          }
                        />{" "}
                        {/* note Column Pinning */}
                        <Flex flex={1} justify="space-between">
                          <EText>{column.columnDef.header}</EText>
                          <Space.Compact>
                            <Tooltip title="Pin Left">
                              <VerticalAlignTopOutlined
                                onClick={() => {
                                  column?.pin("left")
                                }}
                                className="cursor-pointer"
                              />
                            </Tooltip>
                            <Tooltip title="Pin Right">
                              <VerticalAlignBottomOutlined
                                onClick={() => {
                                  column?.pin("right")
                                  handlePinColumn(
                                    column.id,
                                    "right",
                                    table.column as Table<unknown>,
                                  )
                                }}
                                className="cursor-pointer"
                              />
                            </Tooltip>
                          </Space.Compact>
                        </Flex>
                      </Flex>
                    </SortableColumns>
                  )
                })}
              </SortableContext>
            </DndContext>
          </Flex>
        )}

        {/* note columns pinned to right */}
        {rightColumns.length > 0 && (
          <Flex vertical gap={8} flex={1} style={{ minWidth: 200, padding: 8 }}>
            <EText>Fixed to right</EText>

            {rightColumns.map((column: any) => {
              return (
                <Flex key={column.id} gap={8}>
                  {/* note Checkbox to toggle column visibility */}
                  <Checkbox
                    checked={column.getIsVisible()}
                    disabled={!column.getCanHide()}
                    onChange={(e) =>
                      handleColumnVisibilityChange(
                        column.id,
                        e.target.checked,
                      )
                    }
                  />{" "}
                  {/* note Column Pinning */}
                  <Flex flex={1} justify="space-between">
                    <EText>{column.columnDef.header}</EText>
                    <Space.Compact>
                      {column.getIsPinned() === "left" ? (
                        <Flex>
                          <Tooltip title="Pin Right">
                            <VerticalAlignBottomOutlined
                              onClick={() => {
                                column?.pin("right")
                              }}
                              className="cursor-pointer"
                            />
                          </Tooltip>
                          <Tooltip title="Unpin">
                            <VerticalAlignMiddleOutlined
                              onClick={() => {
                                column?.pin(false)
                              }}
                              className="cursor-pointer"
                            />
                          </Tooltip>
                        </Flex>
                      ) : (
                        <Flex>
                          <Tooltip title="Unpin">
                            <VerticalAlignMiddleOutlined
                              onClick={() => {
                                column?.pin(false)
                              }}
                              className="cursor-pointer"
                            />
                          </Tooltip>
                          <Tooltip title="Pin Left">
                            <VerticalAlignTopOutlined
                              onClick={() => {
                                column?.pin("left")
                              }}
                              className="cursor-pointer"
                            />
                          </Tooltip>
                        </Flex>
                      )}
                    </Space.Compact>
                  </Flex>
                </Flex>
              )
            })}
          </Flex>
        )}
      </>
    )
  }

  const Title = () => {
    return (
      <Flex gap={8} justify="space-between">
        <Flex gap={8}>
          <Checkbox
            checked={table?.column?.getIsAllColumnsVisible()}
            onChange={table?.column?.getToggleAllColumnsVisibilityHandler()}
          />

          <EText>Columns Display</EText>
        </Flex>

        <EText
          color={token.primary7}
          className="cursor-pointer"
          onClick={() => {
            table?.column?.resetColumnVisibility()
            table?.column?.resetColumnPinning()
            table?.column?.resetColumnOrder()
            table?.column?.resetColumnSizing()
          }}
        >
          Reset
        </EText>
      </Flex>
    )
  }
  return (
    <Popover
      placement="bottomRight"
      content={<Content />}
      overlayInnerStyle={{
        width: 250,
      }}
      title={<Title />}
      trigger="click"
      arrow={false}
    >
      <SettingOutlined
        className="cursor-pointer text-md"
        style={{
          color: token.neutral10,
        }}
      />
    </Popover>
  )
}

export const SortableHeader: React.FC<{
  header: Header<unknown, unknown>
}> = ({ header }) => {
  const token = useAppTheme()
  const { column } = header

  const getIconColor = (direction: "asc" | "desc") =>
    column.getIsSorted() === direction ? token.primary7 : token.neutral7

  const sortingIcons = (
    <Flex className="cursor-pointer" vertical gap={0}>
      <CaretUpOutlined
        style={{
          color: getIconColor("asc"),
          fontSize: "12px",
          margin: "0",
        }}
      />
      <CaretDownOutlined
        style={{
          color: getIconColor("desc"),
          fontSize: "12px",
          margin: "0",
        }}
      />
    </Flex>
  )

  return <div className="font-bold">{sortingIcons}</div>
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any

export const EditableCell: React.FC<TableEditableCellProps> = ({
  valueType = "text" as TableInputFieldTypes,
  getValue,
  row: { index },
  column: { id },
  table,
  inputItemProps = {},
  form,
}) => {
  const initialValue = inputItemProps?.initialValue ?? getValue()
  const searchInputRef = useRef<any>(null)
  const [value, setValue] = useSafeState(initialValue)

  // note When the input is blurred, we'll call our table meta's updateData function
  const onBlur = () => {
    table.options.meta?.updateData(index, id, value)
  }

  const handleKeyDown = useCallback((e: any) => {
    if (e.key.length === 1 && e.key !== "enter") {
      searchInputRef.current?.focus()
    }
  }, [])

  // note If the initialValue is changed external, sync it up with our state
  useEffect(() => {
    setValue(initialValue)
  }, [initialValue, form.getFieldError(id)[0]])

  return (
    <Tooltip
      title={form.getFieldError(id)[0]}
      trigger={["hover", "focus", "click"]}
      autoAdjustOverflow
      placement="bottom"
    >
      <div key={id} tabIndex={0} onKeyDown={handleKeyDown}>
        <TableInput
          tooltip={form.getFieldError(id)[0]}
          name={id}
          {...inputItemProps}
          type={valueType as TableInputFieldTypes}
          size="middle"
          initialValue={value}
          hasFeedback
          fieldProps={{
            ref: searchInputRef,
            ...inputItemProps.fieldProps,
            size: "middle",
            value,
            onChange: (e: any) => {
              if (typeof e === "object") {
                setValue(e.target.value)
              } else {
                setValue(e)
              }
            },
            onBlur,
            onKeyDown: (e: any) => {
              if (e.key === "Enter") {
                onBlur()
              }
            },
            onFocusCapture: (e: any) => {
              if (e.target.value) {
                searchInputRef.current?.select()
              }
            },
          }}
          rules={inputItemProps?.rules}
        />
      </div>
    </Tooltip>
  )
}

export const SortableColumns: React.FC<{
  children: React.ReactNode
  id: string | number
  disabled?: boolean
}> = ({ children, id, disabled = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })
  const token = useAppTheme()

  return (
    <div
      ref={setNodeRef}
      style={{
        transition,
        transform: CSS.Transform.toString(transform),
        display: "flex",
        opacity: isDragging ? 0.5 : 1,
        flex: 1,
        alignItems: "center",
        ...attributes,
      }}
    >
      <IconGripVertical
        {...listeners}
        style={{
          cursor: "grab",
          marginRight: 10,
          color: token.neutral6,
          opacity: isDragging ? 0.5 : 1,
        }}
      />
      <div className="w-full">
        {children} {/* note Use drag handle */}
      </div>
    </div>
  )
}

interface CheckboxProps {
  indeterminate: boolean
  className?: string
  checked: boolean
}

export const IndeterminateCheckbox: React.FC<CheckboxProps> = ({
  indeterminate,
  className = "",
  ...rest
}) => {
  const ref = useRef<HTMLInputElement>(null!)

  useEffect(() => {
    if (typeof indeterminate === "boolean") {
      ref.current.indeterminate = !rest.checked && indeterminate
    }
  }, [ref, indeterminate, rest.checked])

  return (
    <input
      type="checkbox"
      ref={ref}
      size={200}
      className={className + " cursor-pointer"}
      {...rest}
    />
  )
}

export const TanstackTablePagination = <T,>({
  tableInstance,
  table,
}: {
  table: Table<T>
  tableInstance: TableState
}) => {
  const { pageSize, pageIndex } = tableInstance.pagination
  const rowCount = table.getRowCount()
  const pageCount = Math.max(table.getPageCount(), 1)
  const startRow = rowCount === 0 ? 0 : pageIndex * pageSize + 1
  const endRow =
    rowCount === 0 ? 0 : Math.min((pageIndex + 1) * pageSize, rowCount)
  const token = useAppTheme()
  return (
    <Flex
      justify="space-between"
      align="center"
      gap={4}
      style={{ marginBottom: 16 , paddingInline:20}}
      wrap="wrap"
    >
      <div className="flex items-center gap-2 justify-end align-middle">
        <Flex
          align="center"
          justify="center"
          gap={3}
          wrap="wrap"
          style={{ width: "max-content", marginRight: 16 }}
        >
          <EText fontSize="12px" color={token.neutral7} fontWeight="500">
            Displaying
          </EText>

          {/* Note -  <EText fontWeight="500">{range[1] - range[0] + 1}</EText> */}
          <EText fontWeight="500">
            {startRow.toLocaleString()} - {endRow.toLocaleString()}
          </EText>
          <EText fontSize="12px" color={token.neutral7} fontWeight="500">
            out of
          </EText>
          <EText fontWeight="500">
            {rowCount.toLocaleString()}{" "}
          </EText>
        </Flex>
        <span className="flex items-center gap-1">
          <EText fontSize="12px" color={token.neutral7}>
            Page
          </EText>
          <div>
            <EText fontWeight="500">
              {table.getState().pagination.pageIndex + 1}{" "}
            </EText>
            <EText fontSize="12px" color={token.neutral7}>
              of {""}
            </EText>
            <EText fontWeight="500">
              {pageCount.toLocaleString()}
            </EText>
          </div>
        </span>

        {pageSize > 3 && (
          <Select
            value={table.getState().pagination.pageSize.toString()}
            onChange={(e) => {
              table.setPageSize(Number(e))
            }}
            style={{ width: 120 }}
            size="small"
            options={PAGINATION_PAGE_SIZE_OPTIONS}
          />
        )}
      </div>

      <div className="flex items-center gap-2 justify-end">
        <Tooltip title={"Go to First page"}>
          <EButton
            size="small"
            style={{ fontWeight: 400 }}
            className="border rounded p-1 cursor-pointer"
            onClick={() => table.firstPage()}
            disabled={!table.getCanPreviousPage()}
            type="link"
            tabIndex={-1}
          >
            {"<<"}
          </EButton>
        </Tooltip>
        <EButton
          size="small"
          style={{ fontWeight: 400, fontSize: 13 }}
          className="border rounded p-1 cursor-pointer"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          tabIndex={-1}
        >
          Prev
        </EButton>
        <EButton
          id="table-next-button"
          size="small"
          style={{ fontWeight: 400, fontSize: 13 }}
          className="border rounded p-1 cursor-pointer"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          tabIndex={-1}
        >
          Next
        </EButton>
        <Tooltip title={"Go to last page"}>
          <EButton
            size="small"
            style={{ fontWeight: 400 }}
            className="border rounded p-1 cursor-pointer"
            onClick={() => table.lastPage()}
            disabled={!table.getCanNextPage()}
            type="link"
            tabIndex={-1}
          >
            {">>"}
          </EButton>
        </Tooltip>

        <span className="flex items-center gap-1">
          <EText fontSize="12px" color={token.neutral7}>
            | Go to page:
          </EText>

          <InputNumber
            tabIndex={-1}
            max={pageCount}
            min={1}
            defaultValue={table.getState().pagination.pageIndex + 1}
            onChange={(e) => {
              const page = e ? Number(e) - 1 : 0
              table.setPageIndex(page)
            }}
            size="small"
          />
        </span>
      </div>
    </Flex>
  )
}

export const TanstackTableCount = <T,>({
  table,
  loadedRowCount,
}: {
  table: Table<T>
  loadedRowCount: number
}) => {
  const rowCount = Math.max(table.getRowCount(), loadedRowCount)
  const startRow = loadedRowCount === 0 ? 0 : 1
  const endRow = loadedRowCount
  const token = useAppTheme()

  return (
    <Flex
      align="center"
      gap={3}
      wrap="wrap"
      style={{ width: "max-content", marginBottom: 16 }}
    >
      <EText fontSize="12px" color={token.neutral7} fontWeight="500">
        Displaying
      </EText>
      <EText fontWeight="500">
        {startRow.toLocaleString()} - {endRow.toLocaleString()}
      </EText>
      <EText fontSize="12px" color={token.neutral7} fontWeight="500">
        out of
      </EText>
      <EText fontWeight="500">{rowCount.toLocaleString()}</EText>
    </Flex>
  )
}

export const TanstackTableEmpty = () => {
  const token = useAppTheme()
  return (
    <Flex
      justify="center"
      align="center"
      gap={41}
      vertical
      style={{ marginTop: 43 }}
    >
      {/* Note: Displaying the 'noDataImg' from the 'assets' module */}
      <Empty
        description={
          <EHeading
            level={3}
            fontWeight="500"
            color={token.neutral7}
            style={{ marginLeft: 20 }}
          >
            No data found
          </EHeading>
        }
      />

      {/* Note: Displaying a heading indicating 'No data found' with specified styles */}
    </Flex>
  )
}

export const TanstackToolbar = forwardRef(
  (props: TanstackToolbarProps, ref: ForwardedRef<TableRef | undefined>) => {
    const {
      actions,
      menu,
      options,
      subTitle,
      table,
      title,
      selectionCount = 0,
      selectionActions,
    } = props
    const token = useAppTheme()
    const isMenuEmpty =
      !menu || (Object.keys(menu).length === 0 && menu.constructor === Object)

    const isSelectionMode = selectionCount > 0

    return (
      <>
        <Flex
          justify="space-between"
          flex={1}
          gap={6}
          wrap="wrap"
          style={{
            marginBlock: 8,
            padding: 16,
            backgroundColor: token.winterWhisper,
            borderRadius: 16,
            width: "100%",
          }}
        >
          <Flex justify="flex-start" gap={8} align="center" wrap="wrap">
            {!isSelectionMode && (
              <>
                {isMenuEmpty && (title || subTitle) ? (
                  <Flex vertical gap={2}>
                    {typeof title === "string" ? (
                      <EHeading
                        style={{
                          marginBottom: 0,
                        }}
                        level={5}
                        fontWeight="500"
                        color={token.neutral7}
                      >
                        {title}
                      </EHeading>
                    ) : (
                      title
                    )}
                    {typeof subTitle === "string" ? (
                      <EText color={token.neutral7}>{subTitle}</EText>
                    ) : (
                      subTitle
                    )}
                  </Flex>
                ) : (
                  <div />
                )}

                {menu?.type === "tab" && (
                  <ETab
                    type="line"
                    size="small"
                    tabBarStyle={{
                      borderBottom: "none",
                    }}
                    items={menu?.items}
                    activeKey={menu?.activeKey}
                    defaultActiveKey={menu?.defaultActiveKey}
                    onChange={menu?.onChange}
                  />
                )}
                {menu?.type === "dropdown" && (
                  <Select
                    options={
                      menu?.items?.map((item) => ({
                        label: item.label,
                        value: item.key,
                      })) as DefaultOptionType[]
                    }
                    value={menu?.activeKey}
                    allowClear={false}
                    defaultValue={menu?.defaultActiveKey}
                    onChange={menu?.onChange}
                    style={{ width: 200 }}
                  />
                )}
              </>
            )}
            {/* NOTE : SearchBar - always visible */}
            {isMenuEmpty && options?.search ? (
              <TanstackGlobalFilter
                ref={ref}
                table={table as unknown as Table<unknown>}
                options={options?.search}
              />
            ) : (
              <div />
            )}
            {isSelectionMode && (
              <EText fontWeight="500" color={token.neutral7}>
                {selectionCount} items selected
              </EText>
            )}
          </Flex>

          <Flex justify="flex-end" align="center" gap={8} wrap="wrap">
            {!isSelectionMode && !isMenuEmpty && options?.search ? (
              <TanstackGlobalFilter
                table={table as unknown as Table<unknown>}
                options={options?.search}
              />
            ) : undefined}
            {isSelectionMode ? (
              <>
                {selectionActions}
                {actions
                  ?.filter(
                    (action) =>
                      action?.key === "filter" ||
                      action?.key === "reload" ||
                      action?.key === "settings",
                  )
                  .map((Action, index) => (
                    <Fragment key={index}>{Action}</Fragment>
                  ))}
              </>
            ) : (
              actions?.map((Action, index) => (
                <Fragment key={index}>{Action}</Fragment>
              ))
            )}
          </Flex>
        </Flex>
      </>
    )
  },
) as any

export const TanstackTableRowSelection: React.FC<{
  table: Table<any>
  render?: React.ReactNode
}> = ({ table, render }) => {
  const token = useAppTheme()
  const rowCount =
    Object?.keys(table.getState()?.rowSelection).filter(
      (key) => table.getState()?.rowSelection[key],
    ).length === table.getRowModel().rows.length &&
    Object?.keys(table.getState()?.rowSelection).filter(
      (key) => table.getState()?.rowSelection[key],
    ).length !== table.getRowCount()
  const selectedRowCount = Object?.values(
    table.getState()?.rowSelection,
  ).filter((item) => item)?.length

  return (
    <Flex
      justify="space-between"
      flex={1}
      wrap="wrap"
      gap={6}
      style={{
        marginBlock: 16,
        padding: 16,
        backgroundColor: token.winterWhisper,
        borderRadius: 16,
      }}
    >
      <Flex justify="flex-start" gap={8} align="center" wrap="wrap">
        {/* Note: Displaying the total number of items selected */}
        {rowCount ? (
          <>
            <EText fontWeight="500" color={token.neutral7}>
              All {selectedRowCount} items on this page are selected.
            </EText>
            <ELink
              onClick={() => {
                table.toggleAllRowsSelected()
              }}
            >
              Select all &nbsp;{table.getPreFilteredRowModel().rows.length}
              &nbsp; items in the table.
            </ELink>
          </>
        ) : (
          <EText fontWeight="500" color={token.neutral7}>
            {selectedRowCount} items selected
          </EText>
        )}
      </Flex>

      {
        // Note: Displaying the 'render' prop if it is passed

        render ? (
          <Flex justify="flex-end">{render}</Flex>
        ) : (
          <Flex justify="flex-end" align="center" gap={8} wrap="wrap">
            <Space size={"small"}>
              {render}
              <TableClearButton
                onClick={() => {
                  table.resetRowSelection()
                }}
                indicator={Object.keys(table.getState()?.rowSelection).length}
              />
            </Space>
          </Flex>
        )
      }
    </Flex>
  )
}

interface TanstackGlobalFilterProps {
  table: Table<unknown>
  options?: OptionConfig["search"]
}

export const TanstackGlobalFilter = forwardRef<
  TableRef | undefined,
  TanstackGlobalFilterProps
>(({ table, options }: any, ref) => {
  const token = useAppTheme()
  const [searchText, setSearchText] = useState(table.getState().globalFilter)
  const searchInputRef = useRef<InputRef>(null)
  // Timestamp of the user's last keystroke — used to avoid clobbering the input
  // mid-type, WITHOUT blocking external syncs just because the box is focused
  // (the input auto-focuses on mount, which previously suppressed the sync when
  // a default saved view applied its global search).
  const lastTypedRef = useRef(0)

  // note Keep the input in sync when global search changes externally
  // (e.g. a saved view is applied). Only skip if the user is actively typing.
  const tableGlobalFilter = table.getState().globalFilter
  useEffect(() => {
    if (Date.now() - lastTypedRef.current < 600) return
    setSearchText(tableGlobalFilter ?? "")
  }, [tableGlobalFilter])

  useHotkeys("meta+f", (e) => {
    searchInputRef.current?.focus()
    e.preventDefault()
  })

  const { placeholder, autoFocus } = options

  // note Use the forwarded ref to expose focus/blur methods
  useImperativeHandle(
    ref,
    () => ({
      reload: () => {
        table.options.meta?.reload()
      },
      focus: () => {
        searchInputRef.current?.focus()
      },
      blur: () => {
        searchInputRef.current?.blur()
      },
    }),
    [table, searchInputRef],
  )

  return (
    <Input
      id="table-global-filter"
      autoFocus={autoFocus ?? true}
      ref={searchInputRef}
      style={{
        width: 200,
        borderRadius: 8,
        borderColor: token.neutral7,
        color: token.neutral7,
      }}
      onFocusCapture={(e) => {
        if (e.target.value) {
          searchInputRef.current?.select()
        }
      }}
      onBlur={() => {
        searchInputRef.current?.blur()
      }}
      value={searchText}
      onChange={(e) => {
        lastTypedRef.current = Date.now()
        setSearchText(e.target.value)
        table.setGlobalFilter(e.target.value)
      }}
      placeholder={placeholder || "Search..."}
      prefix={
        <SearchOutlined
          style={{
            color: token.neutral7,
            fontSize: 16,
          }}
        />
      }
    />
  )
})

export const TanstackFilter = ({ table }: { table: Table<any> }) => {
  const [filterParams, setFilterParams] = useState({})
  const [form] = Form.useForm()

  const allColumns = table
    ?.getAllColumns()
    ?.filter((column) => column.getCanFilter())

  const initialValues = useMemo(() => {
    return table.getState().searchParams || form.getFieldsValue()
  }, [table.getState().searchParams, form])

  return (
    <FilterProDrawerForm
      form={form}
      initialValues={{ ...initialValues }}
      onReset={() => {
        table.options.meta?.onSearchParamsChange?.({})
        table.setColumnFilters([])
        setFilterParams({})
      }}
      onFinish={async (values) => {
        console.log(filterParams, "values")
        table.options.meta?.onSearchParamsChange?.(values)
        table.options?.onColumnFiltersChange?.(
          filterParams as ColumnFiltersState,
        )
        return true
      }}
      onValuesChange={(changedValues) => {
        const column = table.getColumn(Object.keys(changedValues)[0])
        const changedvalues =
          typeof column?.columnDef?.meta?.transform === "function"
            ? column.columnDef.meta.transform(Object.values(changedValues)[0])
            : undefined

        setFilterParams((prev) => ({
          ...prev,
          ...(changedvalues ?? changedValues),
        }))
      }}
    >
      <FilterRow>
        {allColumns?.map((column: Column<any>, index: number) => {
          return (
            <FilterCol key={index}>
              <TableInput
                form={form as any}
                type={column.columnDef.meta?.filterVariant || "text"}
                name={column.id}
                label={column.columnDef.header as string}
                {...(typeof column.columnDef.meta?.inputItemProps === "function"
                  ? column.columnDef.meta?.inputItemProps?.(column.id)
                  : column.columnDef.meta?.inputItemProps)}
              />
            </FilterCol>
          )
        })}
      </FilterRow>
    </FilterProDrawerForm>
  )
}

// note Set the display name for the component
TanstackGlobalFilter.displayName = "TanstackGlobalFilter"
TanstackToolbar.displayName = "TanstackToolbar"
TanstackFilter.displayName = "TanstackFilter"

export const FilePreviewCell: React.FC<{ fileId: string; filename: string }> =
  memo(({ fileId, filename }) => {
    const { previewFile, loading } = useFilePreview()
    return (
      <Tooltip title={filename}>
        <EButton
          type="link"
          size="small"
          icon={<EyeOutlined />}
          loading={loading}
          onClick={() => previewFile(fileId)}
          style={{ padding: 0 }}
        >
          {filename}
        </EButton>
      </Tooltip>
    )
  })

FilePreviewCell.displayName = "FilePreviewCell"
