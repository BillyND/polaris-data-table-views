import type { IndexFiltersProps, TabProps } from "@shopify/polaris";

/**
 * Filter value types
 */
export type FilterValue = string | string[] | number | boolean | undefined;

/**
 * Filter operator for advanced filtering
 */
export type FilterOperator =
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "nin"
  | "regex"
  | "exists"
  | "between";

/**
 * Filter definition for building query
 */
export interface FilterDefinition {
  field: string;
  value: FilterValue;
  operator?: FilterOperator;
  /** Nested field path (e.g., "price.amount") */
  nestedField?: string;
}

/**
 * Sort direction
 */
export type SortDirection = "asc" | "desc";

/**
 * Sort definition
 */
export interface SortDefinition {
  field: string;
  direction: SortDirection;
}

/**
 * View/Tab definition for IndexFilters
 */
export interface ViewDefinition {
  id?: string;
  name: string;
  filters: Record<string, FilterValue>;
  /** Whether this is a pinned/default view */
  pinned?: boolean;
}

/**
 * Query state managed by useDataSource
 */
export interface QueryState {
  /** Current page (1-indexed) */
  page: number;
  /** Items per page */
  limit: number;
  /** Search query value */
  queryValue: string;
  /** Active filters */
  filters: Record<string, FilterValue>;
  /** Current sort */
  sort: SortDefinition | null;
  /** Selected view/tab index */
  selectedView: number;
}

/**
 * Query result from API
 */
export interface QueryResult<T = unknown> {
  items: T[];
  total: number;
  page: number;
}

/**
 * Options for useDataSource hook
 */
export interface UseDataSourceOptions<T = unknown> {
  /** API endpoint URL */
  endpoint: string;
  /** Field used for search query (e.g., "name", "title") */
  queryKey: string;
  /** Default sort configuration */
  defaultSort?: SortDefinition;
  /** Default limit per page */
  defaultLimit?: number;
  /** Default views/tabs */
  defaultViews?: ViewDefinition[];
  /** Whether to sync state with URL params */
  syncWithUrl?: boolean;
  /** Whether to use local data only (no API calls) */
  localData?: T[];
  /** Abbreviated response (minimal fields) */
  abbreviated?: boolean;
  /** Transform response data */
  transformResponse?: (response: unknown) => QueryResult<T>;
  /** Custom fetch function */
  fetchFn?: (url: string, options?: RequestInit) => Promise<unknown>;
  /** Debounce delay for search (ms) */
  debounceMs?: number;
}

/**
 * Return type of useDataSource hook
 */
export interface UseDataSourceReturn<T = unknown> {
  /** Query state */
  state: QueryState;
  /** Fetched items */
  items: T[];
  /** Total count */
  total: number;
  /** Loading state */
  loading: boolean;
  /** First load state (for skeleton) */
  firstLoad: boolean;
  /** Error state */
  error: Error | null;

  // Actions
  /** Set current page */
  setPage: (page: number) => void;
  /** Set search query */
  setQueryValue: (value: string) => void;
  /** Set a single filter */
  setFilter: (key: string, value: FilterValue) => void;
  /** Set multiple filters */
  setFilters: (filters: Record<string, FilterValue>) => void;
  /** Clear all filters */
  clearFilters: () => void;
  /** Set sort */
  setSort: (sort: SortDefinition | null) => void;
  /** Set selected view */
  setSelectedView: (index: number) => void;
  /** Refresh data */
  refresh: () => void;

  // Polaris helpers
  /** Props for IndexFilters tabs */
  tabs: TabProps[];
  /** Sort options for IndexFilters */
  sortOptions: IndexFiltersProps["sortOptions"];
  /** Selected sort option index */
  sortSelected: IndexFiltersProps["sortSelected"];
  /** Handler for sort change */
  onSort: IndexFiltersProps["onSort"];
}

/**
 * Configuration for building URL
 */
export interface BuildUrlConfig {
  /** Base URL/endpoint */
  baseUrl: string;
  /** Current page */
  page?: number;
  /** Limit per page */
  limit?: number;
  /** Sort configuration */
  sort?: SortDefinition | null;
  /** Filters */
  filters?: FilterDefinition[];
  /** Search query */
  query?: {
    field: string;
    value: string;
  };
  /** Abbreviated response */
  abbreviated?: boolean;
}

/**
 * Selection state from useIndexResourceState
 */
export interface SelectionState {
  selectedResources: string[];
  allResourcesSelected: boolean;
  handleSelectionChange: (
    selectionType: "single" | "page" | "multi" | "all",
    toggleType: boolean,
    selection?: string,
    position?: number
  ) => void;
  clearSelection: () => void;
}

/**
 * Resource item with ID
 */
export interface ResourceItem {
  id: string;
  [key: string]: unknown;
}

