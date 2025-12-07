import { buildQueryUrl } from "mongoose-url-query";
import type {
  BuildUrlConfig,
  FilterDefinition,
  FilterValue,
  SortDefinition,
} from "../types";

/**
 * Convert FilterDefinition to mongoose-url-query filter string format
 * Format: "field|value" or "field|nestedField|operator|value"
 */
function formatFilter(filter: FilterDefinition): string {
  const { field, value, operator, nestedField } = filter;

  // Skip empty values
  if (value === undefined || value === null || value === "") {
    return "";
  }

  // Handle array values
  const stringValue = Array.isArray(value) ? value.join(",") : String(value);

  // Build filter string based on complexity
  if (nestedField && operator) {
    // Full format: field|nestedField|operator|value
    return `${field}|${nestedField}|${operator}|${stringValue}`;
  } else if (operator && operator !== "eq") {
    // With operator: field|operator|value (for non-nested)
    return `${field}|${operator}|${stringValue}`;
  } else {
    // Simple format: field|value
    return `${field}|${stringValue}`;
  }
}

/**
 * Convert SortDefinition to mongoose-url-query sort string
 * Format: "field|direction"
 */
function formatSort(sort: SortDefinition): string {
  return `${sort.field}|${sort.direction}`;
}

/**
 * Build a query URL using mongoose-url-query's buildQueryUrl
 *
 * @example
 * ```ts
 * const url = buildUrl({
 *   baseUrl: "/api/products",
 *   page: 2,
 *   limit: 20,
 *   sort: { field: "createdAt", direction: "desc" },
 *   filters: [
 *     { field: "status", value: "active" },
 *     { field: "price", nestedField: "amount", operator: "gt", value: 100 },
 *   ],
 *   query: { field: "name", value: "shirt" },
 * });
 * // => "/api/products?page=2&limit=20&sort=createdAt|desc&filter=status|active&filter=price|amount|gt|100&filter=name|shirt"
 * ```
 */
export function buildUrl(config: BuildUrlConfig): string {
  const { baseUrl, page, limit, sort, filters = [], query, abbreviated } = config;

  // Build filters array for mongoose-url-query
  const filterStrings: string[] = [];

  // Add regular filters
  for (const filter of filters) {
    const formatted = formatFilter(filter);
    if (formatted) {
      filterStrings.push(formatted);
    }
  }

  // Add query as a filter
  if (query && query.value?.trim()) {
    filterStrings.push(`${query.field}|${query.value.trim()}`);
  }

  // Use mongoose-url-query's buildQueryUrl
  let url = buildQueryUrl(baseUrl, {
    page,
    limit,
    sort: sort ? formatSort(sort) : undefined,
    filters: filterStrings.length > 0 ? filterStrings : undefined,
  });

  // Add abbreviated param manually (not in mongoose-url-query types)
  if (abbreviated) {
    const separator = url.includes("?") ? "&" : "?";
    url = `${url}${separator}abbreviated=${abbreviated}`;
  }

  return url;
}

/**
 * Convert a simple filters object to FilterDefinition array
 *
 * @example
 * ```ts
 * const filters = objectToFilters({ status: "active", tags: ["sale", "new"] });
 * // => [{ field: "status", value: "active" }, { field: "tags", value: ["sale", "new"] }]
 * ```
 */
export function objectToFilters(
  obj: Record<string, FilterValue>
): FilterDefinition[] {
  return Object.entries(obj)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([field, value]) => ({ field, value }));
}

/**
 * Parse URL search params into query state
 */
export function parseUrlParams(searchParams: URLSearchParams): {
  page: number;
  sort: SortDefinition | null;
  queryValue: string;
  filters: Record<string, FilterValue>;
  viewSelected: string | null;
} {
  const page = parseInt(searchParams.get("page") || "1", 10);
  const queryValue = searchParams.get("query")
    ? decodeURIComponent(searchParams.get("query")!)
    : "";
  const viewSelected = searchParams.get("viewSelected");

  // Parse sort
  const sortParam = searchParams.get("sort");
  let sort: SortDefinition | null = null;
  if (sortParam && typeof sortParam === "string") {
    const parts = sortParam.split("|");
    if (parts.length === 2) {
      const [field, direction] = parts;
      if (field && field.trim() && (direction === "asc" || direction === "desc")) {
        sort = { field: field.trim(), direction };
      }
    }
  }

  // Parse filters
  const filters: Record<string, FilterValue> = {};
  searchParams.forEach((value, key) => {
    if (key.startsWith("filter_")) {
      const filterKey = key.replace("filter_", "");
      try {
        // Try to parse as JSON array first
        filters[filterKey] = JSON.parse(value);
      } catch {
        // If not JSON, treat as string
        filters[filterKey] = decodeURIComponent(value);
      }
    }
  });

  return { page, sort, queryValue, filters, viewSelected };
}

/**
 * Serialize query state to URL search params
 */
export function serializeToUrlParams(
  state: {
    page: number;
    sort: SortDefinition | null;
    queryValue: string;
    filters: Record<string, FilterValue>;
    viewSelected?: string | null;
  },
  baseParams?: URLSearchParams
): URLSearchParams {
  const params = new URLSearchParams(baseParams?.toString() || "");

  // Page
  if (state.page > 1) {
    params.set("page", state.page.toString());
  } else {
    params.delete("page");
  }

  // Sort
  if (state.sort) {
    params.set("sort", `${state.sort.field}|${state.sort.direction}`);
  } else {
    params.delete("sort");
  }

  // Query
  if (state.queryValue) {
    params.set("query", encodeURIComponent(state.queryValue));
  } else {
    params.delete("query");
  }

  // Remove old filter_* params
  Array.from(params.keys()).forEach((key) => {
    if (key.startsWith("filter_")) {
      params.delete(key);
    }
  });

  // Add new filter_* params
  Object.entries(state.filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== null) {
      if (Array.isArray(value) && value.length > 0) {
        params.set(`filter_${key}`, JSON.stringify(value));
      } else if (typeof value === "string" && value) {
        params.set(`filter_${key}`, encodeURIComponent(value));
      } else if (typeof value === "number" || typeof value === "boolean") {
        params.set(`filter_${key}`, String(value));
      }
    }
  });

  // View selected
  if (state.viewSelected) {
    params.set("viewSelected", state.viewSelected);
  } else {
    params.delete("viewSelected");
  }

  return params;
}

