/* eslint-disable @typescript-eslint/no-explicit-any */
import { DndContext, DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GroupingState, Table } from "@tanstack/react-table"
import { Checkbox, Flex, Popover, Tooltip } from "antd"
import { memo, useCallback, useMemo, useState } from "react"
import { useAppTheme } from "~/theme"
import { EIcon } from "../ProComponents/Icon"
import { EText } from "../Typography"

interface GroupByDropDownProps<T> {
  table: Table<T>
  persistenceKey?: string
}

interface SortableGroupItemProps {
  id: string
  columnName: string
  order: number
  onRemove: (columnId: string) => void
}

const SortableGroupItem = memo(
  ({ id, columnName, order, onRemove }: SortableGroupItemProps) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
      useSortable({ id })
    const token = useAppTheme()

    return (
      <Flex
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          opacity: isDragging ? 0.6 : 1,
          padding: "6px 8px",
          backgroundColor: isDragging ? token.primary1 : token.neutral2,
          border: `1px solid ${token.neutral4}`,
          borderRadius: 8,
          zIndex: isDragging ? 1 : undefined,
          position: "relative",
        }}
        gap={8}
        justify="space-between"
        align="center"
        className="w-full"
      >
        <Flex gap={8} flex={1} align="center">
          <div
            {...listeners}
            {...attributes}
            style={{ cursor: "grab", display: "flex", touchAction: "none" }}
          >
            <EIcon icon="mdi:drag-vertical" size={18} color={token.neutral6} />
          </div>
          <Flex
            align="center"
            justify="center"
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              backgroundColor: token.primary6,
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {order}
          </Flex>
          <EText color={token.neutral9}>{columnName}</EText>
        </Flex>
        <Tooltip title="Remove from grouping">
          <EIcon
            icon="mdi:close"
            size={16}
            color={token.neutral6}
            onClick={() => onRemove(id)}
            className="cursor-pointer"
          />
        </Tooltip>
      </Flex>
    )
  },
)

SortableGroupItem.displayName = "SortableGroupItem"

export const GroupByDropDown = <T,>({
  table,
  persistenceKey,
}: GroupByDropDownProps<T>) => {
  const token = useAppTheme()
  const currentGrouping = table.getState().grouping

  const loadPersistedGrouping = useCallback(() => {
    if (!persistenceKey) return []
    try {
      const stored = localStorage.getItem(`${persistenceKey}-grouping`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }, [persistenceKey])

  const [localGrouping, setLocalGrouping] = useState<string[]>(
    currentGrouping?.length > 0 ? currentGrouping : loadPersistedGrouping(),
  )

  const allColumns = useMemo(
    () =>
      table
        .getAllLeafColumns()
        .filter(
          (column) =>
            column.getCanHide() &&
            column.getIsVisible() &&
            // note only real data columns with a text header are groupable
            typeof column.columnDef.header === "string" &&
            !!column.columnDef.header &&
            column.columnDef.meta?.groupable !== false,
        ),
    [table],
  )

  const availableColumns = useMemo(
    () => allColumns.filter((column) => !localGrouping.includes(column.id)),
    [allColumns, localGrouping],
  )

  const handleAddToGrouping = (columnId: string) => {
    const newGrouping = [...localGrouping, columnId] as GroupingState
    setLocalGrouping(newGrouping)
    table.setGrouping(newGrouping)
    if (persistenceKey) {
      localStorage.setItem(
        `${persistenceKey}-grouping`,
        JSON.stringify(newGrouping),
      )
    }
  }

  const handleRemoveFromGrouping = (columnId: string) => {
    const newGrouping = localGrouping.filter(
      (id: string) => id !== columnId,
    ) as GroupingState
    setLocalGrouping(newGrouping)
    table.setGrouping(newGrouping)
    if (persistenceKey) {
      localStorage.setItem(
        `${persistenceKey}-grouping`,
        JSON.stringify(newGrouping),
      )
    }
  }

  const handleResetGrouping = () => {
    const emptyGrouping: GroupingState = []
    setLocalGrouping(emptyGrouping)
    table.setGrouping(emptyGrouping)
    if (persistenceKey) {
      localStorage.removeItem(`${persistenceKey}-grouping`)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (active.id !== over?.id && over) {
      const oldIndex = localGrouping.indexOf(active.id as string)
      const newIndex = localGrouping.indexOf(over.id as string)
      const newGrouping = arrayMove(
        localGrouping,
        oldIndex,
        newIndex,
      ) as GroupingState
      setLocalGrouping(newGrouping)
      table.setGrouping(newGrouping)
      if (persistenceKey) {
        localStorage.setItem(
          `${persistenceKey}-grouping`,
          JSON.stringify(newGrouping),
        )
      }
    }
  }

  const Title = () => {
    return (
      <Flex gap={8} justify="space-between">
        <EText>Group By</EText>
        <EText
          color={token.primary7}
          className="cursor-pointer"
          onClick={handleResetGrouping}
          style={{
            opacity: localGrouping.length > 0 ? 1 : 0.5,
            pointerEvents: localGrouping.length > 0 ? "auto" : "none",
          }}
        >
          Reset
        </EText>
      </Flex>
    )
  }

  const Content = () => {
    return (
      <Flex vertical gap={16} style={{ minWidth: 260, padding: "4px 0" }}>
        {/* Selected Grouping */}
        {localGrouping.length > 0 && (
          <Flex vertical gap={8}>
            <EText color={token.neutral7} style={{ fontSize: 12 }}>
              GROUPED BY · drag to reorder priority
            </EText>
            <DndContext onDragEnd={handleDragEnd}>
              <SortableContext items={localGrouping}>
                <Flex vertical gap={6}>
                  {localGrouping.map((columnId: string, idx: number) => {
                    const column = allColumns.find((c) => c.id === columnId)
                    return (
                      <SortableGroupItem
                        key={columnId}
                        id={columnId}
                        order={idx + 1}
                        columnName={
                          (column?.columnDef.header as string) || columnId
                        }
                        onRemove={handleRemoveFromGrouping}
                      />
                    )
                  })}
                </Flex>
              </SortableContext>
            </DndContext>
          </Flex>
        )}

        {/* Divider between sections */}
        {localGrouping.length > 0 && availableColumns.length > 0 && (
          <div style={{ height: 1, backgroundColor: token.neutral4 }} />
        )}

        {/* Available Columns */}
        {availableColumns.length > 0 && (
          <Flex vertical gap={4}>
            <EText
              color={token.neutral7}
              style={{ fontSize: 12, marginBottom: 4 }}
            >
              AVAILABLE COLUMNS
            </EText>
            {availableColumns.map((column) => (
              <Flex
                key={column.id}
                gap={8}
                align="center"
                onClick={() => handleAddToGrouping(column.id)}
                style={{
                  padding: "6px 8px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
                className="group-by-available-row"
              >
                <Checkbox checked={false} />
                <EText color={token.neutral8}>{column.columnDef.header as any}</EText>
              </Flex>
            ))}
          </Flex>
        )}

        {availableColumns.length === 0 && localGrouping.length === 0 && (
          <EText
            color={token.neutral7}
            style={{ textAlign: "center", padding: "16px 0" }}
          >
            No columns available for grouping
          </EText>
        )}
      </Flex>
    )
  }

  return (
    <Popover
      placement="bottomRight"
      content={<Content />}
      overlayInnerStyle={{
        width: 280,
      }}
      title={<Title />}
      trigger="click"
      arrow={false}
    >
      <EIcon
        icon="mdi:folder-multiple"
        className="cursor-pointer text-md"
        style={{
          color: localGrouping.length > 0 ? token.primary7 : token.neutral10,
        }}
        title="Group columns"
      />
    </Popover>
  )
}
