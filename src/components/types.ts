import type { IndexFiltersProps, TabProps } from "@shopify/polaris";
import type { BulkActionsProps } from "@shopify/polaris/build/ts/src/components/BulkActions";
import type { IndexTableHeading, IndexTableProps } from "@shopify/polaris/build/ts/src/components/IndexTable";
import type { NonEmptyArray } from "@shopify/polaris/build/ts/src/types";
import type { ReactNode, Dispatch, SetStateAction } from "react";
import type { FilterValue, SortDefinition } from "../types";

/**
 * Selection change handler type from Polaris
 */
export type SelectionChangeHandler = NonNullable<IndexTableProps["onSelectionChange"]>;

/**
 * View/Tab definition for ListTable
 */
export interface ListTableView {
  /** Unique ID */
  _id?: string;
  /** Display name */
  name: string;
  /** Filters for this view */
  filters: Record<string, FilterValue>;
  /** Allowed actions for this view */
  allowActions?: ("rename" | "duplicate" | "delete")[];
}

/**
 * Filter component config for dynamic rendering
 */
export interface FilterComponentConfig {
  Component: React.ComponentType<any>;
  props: Record<string, any>;
}

/**
 * Filter definition for ListTable
 */
export interface ListTableFilter {
  /** Filter key (field name) */
  key: string;
  /** Display label */
  label: string;
  /** Show as shortcut */
  shortcut?: boolean;
  /** Filter component (ReactNode) or config for dynamic component */
  filter: ReactNode | FilterComponentConfig;
}

/**
 * Data exposed by ListTable for parent access
 */
export interface ListTableData<T = unknown> {
  items: T[];
  selectedResources: string[];
  allResourcesSelected: boolean;
  handleSelectionChange: SelectionChangeHandler;
  clearSelection: () => void;
  filterValues: Record<string, FilterValue>;
  total: number;
  page: number;
  limit: number;
  queryKey: string;
}

/**
 * ListTable component props
 */
export interface ListTableProps<T = unknown> {
  /** API endpoint for data fetching */
  endpoint: string;
  /** Field used for search query */
  queryKey: string;
  /** Table column headings */
  headings: NonEmptyArray<IndexTableHeading>;
  /** Render function for each row */
  renderRowMarkup: (
    item: T,
    index: number,
    selectedResources?: string[],
    context?: {
      getSelectedResources: () => string[];
      clearAllSelection: () => void;
    }
  ) => ReactNode;
  /** Resource name for IndexTable */
  resourceName?: {
    singular: string;
    plural: string;
  };

  // Data options
  /** Default sort configuration */
  defaultSort?: SortDefinition;
  /** Items per page */
  limit?: number;
  /** Static local data (skip API calls) */
  localData?: T[];
  /** Abbreviated response */
  abbreviated?: boolean;

  // Views/Filters
  /** Pre-defined views */
  views?: ListTableView[];
  /** Default views (always shown) */
  defaultViews?: ListTableView[];
  /** Filter definitions */
  filters?: ListTableFilter[];

  // Sorting
  /** Sort options for dropdown */
  sortOptions?: IndexFiltersProps["sortOptions"];

  // Actions
  /** Bulk actions */
  bulkActions?: BulkActionsProps["actions"];
  /** Promoted bulk actions */
  promotedBulkActions?: BulkActionsProps["promotedActions"];

  // UI options
  /** Condensed row style */
  condensed?: boolean;
  /** Enable row selection */
  selectable?: boolean;
  /** Show card border */
  showBorder?: boolean;
  /** Show filter bar */
  showFilter?: boolean;
  /** Show pagination */
  showPagination?: boolean;
  /** Custom empty state */
  emptyState?: ReactNode;
  /** Search placeholder text */
  queryPlaceholder?: string;
  /** Loading skeleton component */
  loadingComponent?: ReactNode;

  // Callbacks
  /** Callback when data changes */
  onDataChange?: (data: ListTableData<T>) => void;
  /** Expose setListTableData for parent control */
  setListTableData?: Dispatch<SetStateAction<ListTableData<T>>>;
  /** Custom filter label renderer */
  renderFilterLabel?: (key: string, value: FilterValue) => string;
  /** Custom fetch function */
  fetchFn?: (url: string, options?: RequestInit) => Promise<unknown>;

  // API for views (optional)
  /** API endpoint for views CRUD */
  viewsEndpoint?: string;
  /** Sync state with URL */
  syncWithUrl?: boolean;

  // i18n (optional)
  /** Translation function */
  t?: (key: string, params?: Record<string, any>) => string;
}

/**
 * Internal state for ListTable
 */
export interface ListTableState {
  views: ListTableView[];
  selected: number;
  error?: Error;
}

/**
 * Props passed to child components
 */
export interface ListTableChildProps<T = unknown> {
  // Data
  items: T[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  firstLoad: boolean;

  // State
  queryValue: string;
  filterValues: Record<string, FilterValue>;
  sort: string[];
  selectedResources: string[];
  allResourcesSelected: boolean;

  // Actions
  setPage: (page: number) => void;
  setSort: (sort: string[]) => void;
  setQueryValue: (value: string) => void;
  setFilterValues: (filters: Record<string, FilterValue>) => void;
  handleSelectionChange: SelectionChangeHandler;
  clearSelection: () => void;

  // Views
  views: ListTableView[];
  selectedView: number;
  setSelectedView: (index: number) => void;

  // Mode (filtering)
  mode: IndexFiltersProps["mode"];
  setMode: (mode: IndexFiltersProps["mode"]) => void;

  // From props
  headings: NonEmptyArray<IndexTableHeading>;
  renderRowMarkup: ListTableProps<T>["renderRowMarkup"];
  resourceName?: ListTableProps<T>["resourceName"];
  filters?: ListTableFilter[];
  sortOptions?: IndexFiltersProps["sortOptions"];
  bulkActions?: BulkActionsProps["actions"];
  promotedBulkActions?: BulkActionsProps["promotedActions"];
  condensed?: boolean;
  selectable?: boolean;
  showFilter?: boolean;
  showPagination?: boolean;
  emptyState?: ReactNode;
  queryPlaceholder?: string;
  loadingComponent?: ReactNode;
  renderFilterLabel?: ListTableProps<T>["renderFilterLabel"];
  viewsEndpoint?: string;
  onlyLocalData?: boolean;
  t: (key: string, params?: Record<string, any>) => string;
}

