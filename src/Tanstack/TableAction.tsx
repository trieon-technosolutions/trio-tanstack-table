import { DownOutlined } from "@ant-design/icons"
import type { MenuProps } from "antd"
import { useState } from "react"
import { EButton } from "../ProComponents/Button/Button"
import { EDropdown } from "../ProComponents/Dropdown"
import { EIcon } from "../ProComponents/Icon/Icon"
import type {
  ActionItem,
  TableActionConfig,
  TableActionContext,
} from "./table.types"

export type TableActionProps<T> = TableActionConfig<T> & {
  /** Runtime context injected by the table (selection, payload, apiClient…). */
  ctx: TableActionContext<T>
}

/**
 * Generic, config-driven toolbar action. Renders a single button when there is
 * one visible item and a dropdown menu when there are several. Each handler is
 * called with the full {@link TableActionContext}; if it returns a Promise the
 * trigger shows a spinner until it resolves. The consumer decides what happens
 * on click — the component owns only the UI and loading state.
 *
 * Export is just a preset over this (see {@link Export}).
 */
export function TableAction<T>({
  items,
  onAction,
  label,
  icon,
  trigger = "auto",
  loading,
  disabled,
  render,
  ctx,
}: TableActionProps<T>) {
  // Key of the item whose async onClick is in flight (drives the spinner).
  const [loadingKey, setLoadingKey] = useState<string | null>(null)

  const visibleItems = items.filter((it) => !it.hidden)

  const isDisabled = (it: ActionItem<T>): boolean =>
    typeof it.disabled === "function" ? it.disabled(ctx) : Boolean(it.disabled)

  const isBusy = loading ?? loadingKey !== null

  const run = (it: ActionItem<T> | undefined) => {
    if (!it || isDisabled(it)) return
    const result = it.onClick ? it.onClick(ctx) : onAction?.(it, ctx)
    // Auto-loading: only when the handler is actually async.
    if (result && typeof (result as Promise<void>).then === "function") {
      setLoadingKey(it.key)
      Promise.resolve(result).finally(() => setLoadingKey(null))
    }
  }

  const triggerByKey = (key?: string) =>
    run(key ? visibleItems.find((it) => it.key === key) : visibleItems[0])

  // Full custom rendering escape hatch.
  if (render) return <>{render({ trigger: triggerByKey, loading: isBusy })}</>

  if (visibleItems.length === 0) return null

  const asDropdown =
    trigger === "dropdown" ||
    (trigger === "auto" && visibleItems.length > 1)

  if (!asDropdown) {
    const only = visibleItems[0]
    return (
      <EButton
        key={only.key}
        icon={only.icon ?? icon}
        loading={isBusy}
        disabled={disabled || isDisabled(only)}
        danger={only.danger}
        onClick={() => run(only)}
      >
        {only.label ?? label}
      </EButton>
    )
  }

  const menuItems: MenuProps["items"] = visibleItems.map((it) => ({
    key: it.key,
    label: it.label,
    icon: it.icon,
    danger: it.danger,
    disabled: isDisabled(it),
  }))

  return (
    <EDropdown
      disabled={disabled}
      menu={{ items: menuItems, onClick: ({ key }) => triggerByKey(key) }}
    >
      <EButton
        icon={icon ?? <EIcon icon="mdi:dots-horizontal" />}
        loading={isBusy}
        disabled={disabled}
      >
        {label}
        <DownOutlined style={{ fontSize: 10 }} />
      </EButton>
    </EDropdown>
  )
}

/** Props for the {@link Export} preset — same as TableAction, but icon/label optional. */
export type ExportProps<T> = Omit<TableActionProps<T>, "icon" | "label"> & {
  icon?: TableActionProps<T>["icon"]
  label?: TableActionProps<T>["label"]
}

/**
 * Export preset: a {@link TableAction} pre-styled with a download icon and an
 * "Export" label. Behaviorally identical — every item's `onClick` receives the
 * full context (including `getPayload()` and `apiClient`).
 */
export function Export<T>(props: ExportProps<T>) {
  return (
    <TableAction
      icon={<EIcon icon="mdi:download" />}
      label="Export"
      {...props}
    />
  )
}
