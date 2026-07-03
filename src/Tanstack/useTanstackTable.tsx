/* eslint-disable @typescript-eslint/no-explicit-any */
import { createColumnHelper, RowSelectionState } from "@tanstack/react-table"
import { EButton } from "../ProComponents/Button"
import { CustomTable } from "./table.types"
import { IndeterminateCheckbox } from "./tableComponents"

import { IndexColumn } from "@ant-design/pro-components"
import { Flex, Radio, Tag } from "antd"
import { MenuItemType } from "antd/es/menu/interface"
import { useState } from "react"
import { ComponentType } from "~/global"
import { EDropdown, EIcon } from "../ProComponents"

export const useTanstackTable = <T,>() => {
  const columnHelper = createColumnHelper<T>()

  const rowSelectionItems = (table: CustomTable<T>): MenuItemType[] => {
    const isArray = Array.isArray(table.options?.meta?.rowSelection?.selections)
    return [
      {
        key: "1",
        label: <h1>Select Even</h1>,
        onClick: () => {
          const getEvenRows = table
            .getCoreRowModel()
            ?.rows?.filter((_, index) => index % 2 === 0)
            .flatMap((row) => row.id)

          const output = getEvenRows.reduce(
            (acc: Record<string, boolean>, key) => {
              acc[key] = true
              return acc
            },
            {},
          )

          table.setRowSelection(output)
        },
      },
      {
        key: "2",
        label: <h1>Invert Current Page(for this page)</h1>,
        onClick: () => {
          const allRows = table.getRowModel()?.rows?.flatMap((row) => ({
            key: row.id,
            isSelected: row.getIsSelected(),
          }))

          const output = allRows.reduce(
            (acc: Record<string, boolean>, { key, isSelected }) => {
              acc[key] = !isSelected

              return acc
            },
            {},
          )

          table.setRowSelection(output)
        },
      },
      {
        key: "3",
        label: <h1>Select Even (for this page)</h1>,
        onClick: () => {
          const getEvenRows = table
            .getRowModel()
            ?.rows?.filter((_, index) => index % 2 === 0)
            .flatMap((row) => row.id)
          const output = getEvenRows.reduce(
            (acc: Record<string, boolean>, key) => {
              acc[key] = true
              return acc
            },
            {},
          )

          table.setRowSelection(output)
        },
      },
      {
        key: "4",
        label: <h1>Invert Current Page (for all)</h1>,
        onClick: () => {
          const allRows = table.getRowModel()?.rowsById
          const output = Object.entries(allRows).reduce(
            (acc: Record<string, boolean>, key) => {
              acc[key[0]] = !key[1].getIsSelected()

              return acc
            },
            {},
          )
          // note : filter out the false values
          const selectedRows = Object.fromEntries(
            Object.entries(output).filter(([_, value]) => value),
          )
          table.setRowSelection(selectedRows)
        },
      },

      {
        key: "5",
        disabled: !table?.options?.meta?.rowExpandable,
        label: <h1>Expand All</h1>,

        onClick: () => {
          table.setExpanded(true)
        },
      },
      {
        key: "6",
        disabled: !table?.options?.meta?.rowExpandable,
        label: <h1>Collapse All</h1>,

        onClick: () => {
          table.resetExpanded()
        },
      },
      ...((isArray
        ? table.options?.meta?.rowSelection?.selections
        : []) as MenuItemType[]),
    ].filter((item) => !item.disabled)
  }

  const rowSelectionColumn = columnHelper.display({
    id: "rowSelection",
    enablePinning: false,
    enableHiding: false,
    enableResizing: false,

    header: ({ table }: any) => {
      const isArray = Array.isArray(
        table.options?.meta?.rowSelection?.selections,
      )
      return table.options?.meta?.rowSelection?.selectionType !== "radio" ? (
        <Flex justify="center" align="center">
          <IndeterminateCheckbox
            {...{
              checked: table.getIsAllPageRowsSelected(),
              indeterminate: table.getIsSomePageRowsSelected(),
              onChange: table.getToggleAllPageRowsSelectedHandler(),
            }}
          />

          {isArray || table.options?.meta?.rowSelection?.selections ? (
            <EDropdown
              menu={{
                items: rowSelectionItems(table as CustomTable<T>),
              }}
              trigger={["click"]}
              placement="bottomLeft"
            >
              <EButton
                type="text"
                icon={<EIcon icon={"material-symbols:add-rounded"} />}
              />
            </EDropdown>
          ) : undefined}
        </Flex>
      ) : undefined
    },
    cell: ({ row, getValue }) => {
      return row.getCanMultiSelect() ? (
        <div className="flex items-center justify-center">
          <IndeterminateCheckbox
            {...{
              checked: row.getIsSelected(),
              disabled: !row.getCanSelect(),
              indeterminate: row.getIsSomeSelected(),
              onChange: row.getToggleSelectedHandler(),
            }}
          />
          {getValue<boolean>()}
        </div>
      ) : (
        <div className="text-center">
          <Radio
            tabIndex={0}
            style={{
              marginInlineEnd: 0,
            }}
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e: any) => {
              e.preventDefault()
              if (!row.getCanSelect()) return
              if (e.key === "Enter" || e.key === " ") {
                row.getToggleSelectedHandler()(e.target.checked)
              }

              if (e.key === "Tab" && e.shiftKey) {
                e.preventDefault()
                const prevRadio = e.currentTarget
                  .closest("tr")
                  ?.previousElementSibling?.querySelector(
                    'input[type="radio"]',
                  ) as HTMLInputElement | null
                if (prevRadio) {
                  prevRadio.focus()
                }
              } else if (e.key === "Tab") {
                e.preventDefault()
                const nextRadio = e.currentTarget
                  .closest("tr")
                  ?.nextElementSibling?.querySelector(
                    'input[type="radio"]',
                  ) as HTMLInputElement | null
                if (nextRadio) {
                  nextRadio.focus()
                } else {
                  // note Hardcoded focus to the next element after table
                  const nextElement =
                    document.getElementById("table-next-button")
                  if (nextElement) nextElement.focus()
                }
              }
            }}
            aria-label={`Select row ${row.index + 1}`}
          />
        </div>
      )
    },
    size: 44,
    minSize: 40,
    maxSize: 60,
  })

  const expandableColumn = columnHelper.display({
    id: "expandable",
    enablePinning: false,
    enableHiding: false,
    header: "",
    size: 20,
    cell: ({ row }) =>
      row.getCanExpand() ? (
        <button
          className="ml-8"
          {...{
            onClick: row.getToggleExpandedHandler(),
            style: { cursor: "pointer" },
          }}
        >
          {row.getIsExpanded() ? "👇" : "👉"}
        </button>
      ) : (
        "🔵"
      ),
  })
  const indexColumn = columnHelper.display({
    id: "index",
    enablePinning: true,
    enableHiding: false,
    enableResizing: false,
    header: "",
    size: 52,
    minSize: 46,
    maxSize: 70,
    cell: ({ table, row }) => {
      // note count only leaf/data rows so group header rows don't consume index numbers
      const dataRows = table
        .getRowModel()
        .rows.filter((r) => !r.getIsGrouped())
      const { pageIndex, pageSize } = table.getState().pagination
      const rowIndex = dataRows.findIndex((r) => r.id === row.id)
      const visualIndex = pageIndex * pageSize + rowIndex + 1
      return <IndexColumn border>{visualIndex}</IndexColumn>
    },
  })

  const getFilterColumn = (
    threeDot: (value: T) => any,
    type?: ComponentType,
  ) => {
    return threeDot
      ? columnHelper.display({
          id: "filter",
          enableResizing: false,
          size: 96,
          minSize: 88,
          maxSize: 124,
          header: "",

          cell: (info) => (
            <a
              onClick={(event) => event.stopPropagation()}
              className="flex justify-center items-center"
            >
              <EDropdown
                menu={{ items: threeDot(info.row.original) }}
                trigger={["click"]}
                placement="bottomRight"
                width={204}
              >
                <Tag
                  color={"volcano-inverse"}
                  className={`${
                    type === "VIEW" ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  Actions
                </Tag>
              </EDropdown>
            </a>
          ),
        })
      : undefined
  }

  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>(
    {},
  )

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  return {
    rowSelectionState,
    setRowSelectionState,
    columnHelper,
    rowSelectionColumn,
    getFilterColumn,
    expandableColumn,
    selectedRowKeys,
    setSelectedRowKeys,
    indexColumn,
  }
}
