/* eslint-disable no-comments/disallowComments */
export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "notIn"
  | "like"
  | "ilike"
  | "isNull"
  | "isNotNull"
  | "between";

type FilterType =
  | "string"
  | "number"
  | "decimal"
  | "boolean"
  | "date"
  | "dateRange"
  | "enum"
  | "json"
  | "select"
  | "multiSelect";

export interface FilterValue {
  operator: FilterOperator;
  value: unknown;
  type?: FilterType;
}

export const createNamedFilter = (
  name: string,
  operator: FilterOperator,
  value: unknown,
  type?: FilterType,
): Record<string, FilterValue> => ({
  [name]: {
    operator,
    value,
    ...(type && { type }),
  },
});

export const prepareFilterValue = (
  filterVariant: string | undefined,
  transformKey: string,
  transformValue: string | undefined,
  value: unknown,
): Record<string, FilterValue> => {
  let processedValue: any = value;

  // Handle transformValue extraction
  if (transformValue && typeof value === "object" && value !== null) {
    if (Array.isArray(value)) {
      processedValue = value.map((item) =>
        typeof item === "object" && item !== null && transformValue in item
          ? (item as Record<string, unknown>)[transformValue]
          : item,
      );
    } else if (transformValue in value) {
      processedValue = (value as Record<string, unknown>)[transformValue];
    }
  }

  let operator: FilterOperator = "ilike";

  // Map variant to operator and ensure array format for select types
  switch (filterVariant) {
    case "select":
    case "multi-select":
      operator = "in";
      processedValue = Array.isArray(processedValue)
        ? processedValue?.map((item) => item[transformValue ?? "value"])
        : processedValue != null
          ? [processedValue.value]
          : [];
      break;
    case "date":
      operator = "between";
      processedValue = Array.isArray(processedValue)
        ? processedValue
        : [processedValue, processedValue];
      break;
    case "date-range":
      operator = "between";
      processedValue = Array.isArray(processedValue)
        ? processedValue
        : [processedValue, processedValue];
      break;
    case "number":
    case "decimal":
      operator = "eq";
      break;
    case "boolean":
      operator = "eq";
      break;
    case "digit": {
      operator = processedValue.selectedOption;
      processedValue = processedValue.value;
      break;
    }
    default:
      operator = "ilike";
  }

  return createNamedFilter(transformKey, operator, processedValue);
};

/**
 * Removes empty filter values before sending to backend
 */
export const cleanFilters = <T extends Record<string, FilterValue>>(
  filters: T,
): Partial<T> => {
  return Object.fromEntries(
    Object.entries(filters).filter(([_, filter]) => {
      // Remove if value is null/undefined (except for isNull/isNotNull operators)
      if (filter.operator !== "isNull" && filter.operator !== "isNotNull") {
        if (filter.value === null || filter.value === undefined) return false;
        if (filter.value === "") return false;
        if (Array.isArray(filter.value) && filter.value.length === 0)
          return false;
      }
      return true;
    }),
  ) as Partial<T>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sanitizeFilters = (filters: Record<string, any>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cleaned: Record<string, any> = {};
  for (const [key, filter] of Object.entries(filters)) {
    if (filter === undefined || filter === null) continue;

    const hasValueProp =
      typeof filter === "object" && filter !== null && "value" in filter;

    const value = hasValueProp ? filter.value : filter;

    if (value === undefined || value === null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "string" && value.trim() === "") continue;

    if (hasValueProp) {
      cleaned[key] = filter;
    } else {
      cleaned[key] = { value, operator: "ilike" };
    }
  }
  return cleaned;
};

/** Shape of each item inside field.props.defaultExtraOptions */
interface ExtraOptionDependency {
  fieldKey: string;
  /** Which form field to read from */
  field: string;
  /** Which key to extract from that field's form value (e.g. "value" for antd-style { value, label }) */
  valueKey: string;
  /** Operator to attach to the resolved param */
  operator: FilterOperator;

  value: unknown;
}

/** The resolved output — what actually gets passed to the select component as query params */
type ResolvedExtraOptions = Record<
  string,
  { operator: FilterOperator; value: unknown }
>;

// ─── The function ────────────────────────────────────────────────────────────

/**
 * Takes the `defaultExtraOptions` array from a field's config and the
 * current form values, and returns the resolved query-param object.
 *
 * Usage in componentProps:
 *   defaultExtraOptions: resolveExtraOptions(field.props?.defaultExtraOptions, formValues)
 *
 * @param dependencies - field.props.defaultExtraOptions from the config
 * @param formValues   - current form state from context/parent hook
 *                       e.g. { branch: { value: "b1", label: "Main Branch" }, ... }
 */
export const resolveExtraOptions = (
  dependencies: ExtraOptionDependency[] | undefined,
  formValues: Record<string, unknown>,
): ResolvedExtraOptions => {
  if (!dependencies?.length) return {};

  return dependencies.reduce<ResolvedExtraOptions>((acc, dep) => {
    if (dep.value) {
      acc[dep.fieldKey] = {
        operator: dep.operator,
        value: dep.value,
      };
      return acc;
    }

    const fieldValue = formValues?.[dep.field];

    // Parent field has no value yet — skip entirely, don't pollute params with undefined
    // if (fieldValue == null) return acc

    // Extract the specific key (e.g. .value from { value: "b1", label: "Main" })
    const extracted =
      typeof fieldValue === "object" && fieldValue !== null
        ? (fieldValue as Record<string, unknown>)[dep.valueKey]
        : fieldValue; // if it's already a primitive, just use it directly

    // Extracted value is empty — skip
    // if (extracted == null) return acc

    acc[dep.fieldKey] = {
      operator: dep.operator,
      value: extracted,
    };

    return acc;
  }, {});
};
