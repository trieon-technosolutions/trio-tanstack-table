/** Empty form values do not represent active filters; zero and false do. */
export const hasFilterValue = (value: unknown): boolean => {
  if (value == null) return false
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.some(hasFilterValue)
  if (typeof value === "object" && "value" in value) return hasFilterValue(value.value)
  return true
}
