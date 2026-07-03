export const FILTER_PREFIX = "f."
export const SEARCH_KEY = "search"

export const ARRAY_OPERATORS = new Set(["in", "notIn", "between"])

export interface UrlFilterValue {
  operator: string
  value: unknown
}

export interface NavigationSearchParams {
  filters?: Record<string, UrlFilterValue>
  search?: string
  query?: Record<string, string>
}

export function parseUrlToFilters(
  searchParams: URLSearchParams,
): Record<string, UrlFilterValue> {
  const filters: Record<string, UrlFilterValue> = {}
  searchParams.forEach((value, key) => {
    if (!key.startsWith(FILTER_PREFIX)) return
    const withoutPrefix = key.slice(FILTER_PREFIX.length)
    const lastDotIndex = withoutPrefix.lastIndexOf(".")
    if (lastDotIndex === -1) return

    const fieldName = withoutPrefix.slice(0, lastDotIndex)
    const operator = withoutPrefix.slice(lastDotIndex + 1)

    const parsedValue = ARRAY_OPERATORS.has(operator) ? value.split(",") : value

    filters[fieldName] = { operator, value: parsedValue }
  })
  return filters
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function filtersToUrlParams(
  filters: Record<string, UrlFilterValue>,
): Record<string, string> {
  const params: Record<string, string> = {}

  for (const [fieldName, rawFilter] of Object.entries(filters)) {
    if (rawFilter === undefined || rawFilter === null) continue

    const filter =
      typeof rawFilter === "object" &&
      rawFilter !== null &&
      "value" in rawFilter
        ? rawFilter
        : {
            operator: "eq",
            value: Array.isArray(rawFilter) ? rawFilter : [rawFilter],
          }

    const { value, operator } = filter

    if (value === undefined || value === null) continue
    if (typeof value === "string" && value.trim() === "") continue
    if (Array.isArray(value) && value.length === 0) continue

    const key = `${FILTER_PREFIX}${fieldName}.${operator}`
    const paramValue = Array.isArray(value) ? value.join(",") : String(value)

    params[key] = paramValue
  }

  return params
}

export function buildSearchString(
  navSearchParams: NavigationSearchParams,
): string {
  const urlParams = new URLSearchParams()

  if (navSearchParams.filters) {
    const filterParams = filtersToUrlParams(navSearchParams.filters)
    for (const [key, value] of Object.entries(filterParams)) {
      urlParams.set(key, value)
    }
  }

  if (navSearchParams.search) {
    urlParams.set(SEARCH_KEY, navSearchParams.search)
  }
  if (navSearchParams.query) {
    for (const [key, value] of Object.entries(navSearchParams.query)) {
      urlParams.set(key, value)
    }
  }

  return urlParams.toString()
}
