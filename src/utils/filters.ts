import type { FilterValue, SortDefinition } from "../types";

/**
 * Check if a filter value is empty
 */
export function isEmptyFilter(value: FilterValue): boolean {
  if (value === undefined || value === null || value === "") {
    return true;
  }
  if (Array.isArray(value) && value.length === 0) {
    return true;
  }
  return false;
}

/**
 * Check if filters object is empty
 */
export function areFiltersEmpty(filters: Record<string, FilterValue>): boolean {
  return Object.values(filters).every(isEmptyFilter);
}

/**
 * Remove empty filters from object
 */
export function cleanFilters(
  filters: Record<string, FilterValue>
): Record<string, FilterValue> {
  const cleaned: Record<string, FilterValue> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (!isEmptyFilter(value)) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Merge filters, with new values overriding old ones
 */
export function mergeFilters(
  current: Record<string, FilterValue>,
  updates: Record<string, FilterValue>
): Record<string, FilterValue> {
  return cleanFilters({ ...current, ...updates });
}

/**
 * Convert sort definition to Polaris sortSelected format
 * Returns array like ["field asc"] or ["field desc"]
 */
export function sortToPolaris(sort: SortDefinition | null): string[] {
  if (!sort || !sort.field || !sort.direction) return [];
  const field = String(sort.field).trim();
  const direction = String(sort.direction).trim();
  if (!field || (direction !== "asc" && direction !== "desc")) return [];
  return [`${field} ${direction}`];
}

/**
 * Convert Polaris sortSelected format to SortDefinition
 * Input: ["field asc"] or ["field desc"]
 */
export function polarisToSort(selected: string[]): SortDefinition | null {
  if (!selected || selected.length === 0) return null;

  const [sortString] = selected;
  if (!sortString || typeof sortString !== "string") return null;

  const parts = sortString.split(" ");

  if (parts.length !== 2) return null;

  const [field, direction] = parts;
  if (!field || (direction !== "asc" && direction !== "desc")) return null;

  return { field, direction };
}

/**
 * Create sort options for Polaris IndexFilters
 *
 * @example
 * ```ts
 * const options = createSortOptions([
 *   { field: "createdAt", label: "Date created" },
 *   { field: "name", label: "Name" },
 *   { field: "price", label: "Price" },
 * ]);
 * ```
 */
export function createSortOptions(
  fields: Array<{ field: string; label: string }>
): Array<{ label: string; value: string; directionLabel: string }> {
  const options: Array<{
    label: string;
    value: string;
    directionLabel: string;
  }> = [];

  for (const { field, label } of fields) {
    options.push(
      {
        label,
        value: `${field} asc`,
        directionLabel: "A-Z",
      },
      {
        label,
        value: `${field} desc`,
        directionLabel: "Z-A",
      }
    );
  }

  return options;
}

/**
 * Filter items locally (for onlyLocalData mode)
 */
export function filterItemsLocally<T extends Record<string, unknown>>(
  items: T[],
  options: {
    queryKey: string;
    queryValue: string;
    filters: Record<string, FilterValue>;
    sort: SortDefinition | null;
    page: number;
    limit: number;
  }
): { items: T[]; total: number } {
  const { queryKey, queryValue, filters, sort, page, limit } = options;

  let filtered = [...items];

  // Apply query filter
  if (queryValue) {
    const lowerQuery = queryValue.toLowerCase();
    filtered = filtered.filter((item) => {
      const fieldValue = item[queryKey];
      return String(fieldValue || "")
        .toLowerCase()
        .includes(lowerQuery);
    });
  }

  // Apply other filters
  for (const [key, value] of Object.entries(filters)) {
    if (isEmptyFilter(value)) continue;

    filtered = filtered.filter((item) => {
      const itemValue = item[key];

      if (Array.isArray(value)) {
        // Check if item value is in the filter array
        return value.includes(itemValue as string);
      } else if (typeof value === "string") {
        // String contains match
        return String(itemValue || "")
          .toLowerCase()
          .includes(value.toLowerCase());
      } else if (typeof value === "boolean" || typeof value === "number") {
        // Exact match
        return itemValue === value;
      }

      return true;
    });
  }

  // Apply sort
  if (sort) {
    const { field, direction } = sort;
    const isAsc = direction === "asc";

    filtered.sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];

      // Handle undefined values
      if (aVal === undefined && bVal === undefined) return 0;
      if (aVal === undefined) return isAsc ? 1 : -1;
      if (bVal === undefined) return isAsc ? -1 : 1;

      // Handle dates
      if (field === "createdAt" || field === "updatedAt") {
        const aTime = new Date(aVal as string).getTime();
        const bTime = new Date(bVal as string).getTime();
        return isAsc ? aTime - bTime : bTime - aTime;
      }

      // Handle strings
      if (typeof aVal === "string" && typeof bVal === "string") {
        return isAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      // Handle numbers
      if (typeof aVal === "number" && typeof bVal === "number") {
        return isAsc ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }

  const total = filtered.length;

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  return { items: paginated, total };
}

