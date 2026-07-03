import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import {
  FILTER_PREFIX,
  SEARCH_KEY,
  UrlFilterValue,
  filtersToUrlParams,
  parseUrlToFilters,
} from "./filter-url-utils"

interface UseTableUrlSyncOptions {
  enabled: boolean
}

interface UseTableUrlSyncReturn {
  params: Record<string, unknown>
  initialFilters: Record<string, UrlFilterValue>
  initialSearchParams: Record<string, unknown>
  initialGlobalSearch: string | undefined
  syncFiltersToUrl: (filters: Record<string, UrlFilterValue>) => void
  syncGlobalSearchToUrl: (search: string | undefined) => void
  clearUrlFilters: () => void
}

export function useTableUrlSync({
  enabled,
}: UseTableUrlSyncOptions): UseTableUrlSyncReturn {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = Object.fromEntries(searchParams.entries())

  const initialState = useMemo(() => {
    if (!enabled)
      return { filters: {}, searchParams: {}, globalSearch: undefined }

    const filters = parseUrlToFilters(searchParams)
    const globalSearch = searchParams.get(SEARCH_KEY) || undefined

    const formValues: Record<string, unknown> = {}
    for (const [key, filter] of Object.entries(filters)) {
      formValues[key] = filter.value
    }

    return {
      filters,
      searchParams: formValues,
      globalSearch,
      params,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const syncFiltersToUrl = useCallback(
    (filters: Record<string, UrlFilterValue>) => {
      if (!enabled) return
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams()

          prev.forEach((value, key) => {
            if (!key.startsWith(FILTER_PREFIX) && key !== SEARCH_KEY) {
              next.set(key, value)
            }
          })

          const currentSearch = prev.get(SEARCH_KEY)
          if (currentSearch) next.set(SEARCH_KEY, currentSearch)

          const filterParams = filtersToUrlParams(filters)
          for (const [key, value] of Object.entries(filterParams)) {
            next.set(key, value)
          }

          return next
        },
        { replace: true },
      )
    },
    [enabled, setSearchParams],
  )

  const syncGlobalSearchToUrl = useCallback(
    (search: string | undefined) => {
      if (!enabled) return
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (search) {
            next.set(SEARCH_KEY, search)
          } else {
            next.delete(SEARCH_KEY)
          }
          return next
        },
        { replace: true },
      )
    },
    [enabled, setSearchParams],
  )

  const clearUrlFilters = useCallback(() => {
    if (!enabled) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams()
        prev.forEach((value, key) => {
          if (!key.startsWith(FILTER_PREFIX) && key !== SEARCH_KEY) {
            next.set(key, value)
          }
        })
        return next
      },
      { replace: true },
    )
  }, [enabled, setSearchParams])

  return {
    initialFilters: initialState.filters,
    initialSearchParams: initialState.searchParams,
    initialGlobalSearch: initialState.globalSearch,
    syncFiltersToUrl,
    syncGlobalSearchToUrl,
    clearUrlFilters,
    params,
  }
}
