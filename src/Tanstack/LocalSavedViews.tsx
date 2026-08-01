import { Divider, Flex, Input, message, Popover, Tooltip } from "antd"
import { useEffect, useMemo, useRef, useState } from "react"
import { EButton } from "../ProComponents/Button/Button"
import { EIcon } from "../ProComponents/Icon/Icon"
import { useAppTheme } from "~/theme"
import { EText } from "../Typography"
import type { SavedViewsApi } from "./table.types"

/** A single persisted view. */
interface StoredView {
  id: string
  name: string
  state: unknown
  /** When true, this view is auto-applied on page open (one per listKey). */
  isDefault?: boolean
}

const STORAGE_PREFIX = "trio-saved-views:"
const storageKey = (listKey: string) => `${STORAGE_PREFIX}${listKey}`

const loadViews = (listKey: string): StoredView[] => {
  try {
    const raw = localStorage.getItem(storageKey(listKey))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const persistViews = (listKey: string, views: StoredView[]) => {
  try {
    localStorage.setItem(storageKey(listKey), JSON.stringify(views))
  } catch {
    // storage full / unavailable — non-fatal
  }
}

const newId = () => {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  }
}

/**
 * Backend-free Saved Views control. Persists named snapshots of the current
 * table state (filters/sort/grouping/visibility/search) to `localStorage`,
 * keyed by `listKey`. Reuses the table's own `getViewState`/`applyViewState`/
 * `resetViewState`, so applying a view triggers the same single refetch + URL
 * sync the table does internally.
 *
 * This is the default control used when `savedViews.render` is not supplied.
 * It is fully client-side: views persist per browser, not across devices/users.
 */
export const LocalSavedViews = ({
  listKey,
  getViewState,
  applyViewState,
  resetViewState,
  hasInitialUrlState,
}: SavedViewsApi) => {
  const token = useAppTheme()
  const [open, setOpen] = useState(false)
  const [views, setViews] = useState<StoredView[]>(() => loadViews(listKey))
  const [name, setName] = useState("")

  const setAndPersist = (next: StoredView[]) => {
    setViews(next)
    persistViews(listKey, next)
  }

  // Auto-apply the default view once on mount — but never override state that
  // already arrived via the URL (that's what `hasInitialUrlState` guards). Runs
  // once per mount (i.e. per page open), which is the intended "apply when I
  // open this page" behavior.
  const didAutoApply = useRef(false)
  useEffect(() => {
    if (didAutoApply.current) return
    didAutoApply.current = true
    if (hasInitialUrlState) return
    const def = views.find((v) => v.isDefault)
    if (def) applyViewState(def.state as never)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Toggle a view as the auto-apply default (single default per listKey).
  const toggleDefault = (id: string) => {
    setAndPersist(
      views.map((v) => ({
        ...v,
        isDefault: v.id === id ? !v.isDefault : false,
      })),
    )
  }

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      message.warning("Enter a name for this view")
      return
    }
    // Overwrite a same-named view instead of duplicating.
    const withoutDup = views.filter((v) => v.name !== trimmed)
    setAndPersist([
      ...withoutDup,
      { id: newId(), name: trimmed, state: getViewState() },
    ])
    setName("")
    message.success(`Saved "${trimmed}"`)
  }

  const handleApply = (view: StoredView) => {
    applyViewState(view.state as never)
    setOpen(false)
  }

  const handleDelete = (id: string) => {
    setAndPersist(views.filter((v) => v.id !== id))
  }

  const handleReset = () => {
    resetViewState()
    setOpen(false)
  }

  const content = useMemo(
    () => (
      <Flex vertical gap={8} style={{ minWidth: 240, maxWidth: 320 }}>
        <EText color={token.neutral7} style={{ fontSize: 12 }}>
          SAVED VIEWS
        </EText>

        <Flex vertical gap={2} style={{ maxHeight: 260, overflowY: "auto" }}>
          {views.length === 0 && (
            <EText color={token.neutral6} style={{ padding: "4px 0" }}>
              No saved views yet
            </EText>
          )}
          {views.map((view) => (
            <Flex
              key={view.id}
              align="center"
              justify="space-between"
              gap={8}
              className="group-by-available-row"
              style={{ padding: "6px 8px", borderRadius: 8 }}
            >
              <EText
                color={token.neutral9}
                className="cursor-pointer"
                style={{ flex: 1 }}
                onClick={() => handleApply(view)}
              >
                {view.name}
              </EText>
              <Tooltip
                title={
                  view.isDefault
                    ? "Applied automatically when you open this page (click to turn off)"
                    : "Apply automatically when I open this page"
                }
              >
                <EIcon
                  icon={view.isDefault ? "mdi:pin" : "mdi:pin-outline"}
                  color={view.isDefault ? token.primary6 : token.neutral5}
                  className="cursor-pointer"
                  onClick={() => toggleDefault(view.id)}
                />
              </Tooltip>
              <Tooltip title="Delete">
                <EIcon
                  icon="mdi:trash-can-outline"
                  color={token.neutral6}
                  className="cursor-pointer"
                  onClick={() => handleDelete(view.id)}
                />
              </Tooltip>
            </Flex>
          ))}
        </Flex>

        <Flex
          align="center"
          gap={8}
          className="cursor-pointer"
          style={{ padding: "6px 8px", borderRadius: 8 }}
          onClick={handleReset}
        >
          <EIcon icon="mdi:refresh" color={token.neutral7} />
          <EText color={token.neutral8}>System Default</EText>
        </Flex>

        <Divider style={{ margin: "4px 0" }} />

        <Flex gap={8}>
          <Input
            size="small"
            placeholder="Save current view as…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onPressEnter={handleSave}
          />
          <EButton size="small" type="primary" onClick={handleSave}>
            Save
          </EButton>
        </Flex>
      </Flex>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [views, name, token],
  )

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomRight"
      content={content}
    >
      <Tooltip title="Saved Views">
        <EButton
          type="text"
          icon={<EIcon icon="mdi:bookmark-multiple-outline" size={18} />}
        />
      </Tooltip>
    </Popover>
  )
}
